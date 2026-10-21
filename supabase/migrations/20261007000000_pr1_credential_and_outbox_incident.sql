-- PR1: credential containment + outbox incident hardening
-- Establishes fenced worker leases and strict outbox state transitions.

ALTER TABLE public.login_notifications_log
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_login_notifications_log_idempotency_key
  ON public.login_notifications_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.outbox_events
  ADD COLUMN IF NOT EXISTS lease_id uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by text;

CREATE INDEX IF NOT EXISTS idx_outbox_events_lease
  ON public.outbox_events (status, lease_expires_at)
  WHERE status = 'processing';

ALTER TABLE public.outbox_events
  DROP CONSTRAINT IF EXISTS outbox_messages_status_check,
  DROP CONSTRAINT IF EXISTS outbox_events_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.outbox_events'::regclass
      AND conname = 'outbox_events_status_check_pr1'
  ) THEN
    ALTER TABLE public.outbox_events
      ADD CONSTRAINT outbox_events_status_check_pr1
      CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead_letter'));
  END IF;
END
$$;

-- Normalize any legacy rows stranded in 'failed' with retry_count >= 3
UPDATE public.outbox_events
SET status = 'dead_letter',
    last_error = COALESCE(last_error, 'MAX_RETRIES_EXCEEDED_LEGACY_FAILED_STATE'),
    processed_at = NULL,
    lease_id = NULL,
    lease_expires_at = NULL
WHERE status = 'failed'
  AND retry_count >= 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.outbox_events'::regclass
      AND conname = 'outbox_events_failed_retry_ceiling_check'
  ) THEN
    ALTER TABLE public.outbox_events
      ADD CONSTRAINT outbox_events_failed_retry_ceiling_check
      CHECK (status <> 'failed' OR retry_count < 3);
  END IF;
END
$$;

-- Drop any legacy functions in public or internal schema to eliminate overloads and return-type conflicts
DROP FUNCTION IF EXISTS public.claim_outbox_events(integer);
DROP FUNCTION IF EXISTS internal.claim_outbox_events(integer);
DROP FUNCTION IF EXISTS internal.claim_outbox_events(integer, text, integer);
DROP FUNCTION IF EXISTS internal.complete_outbox_event(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS internal.get_outbox_metrics();

CREATE FUNCTION internal.claim_outbox_events(
  limit_count integer,
  worker_identity text DEFAULT 'unknown',
  lease_duration_seconds integer DEFAULT 300
)
RETURNS TABLE (
  id uuid,
  event_type text,
  payload jsonb,
  occurred_at timestamptz,
  retry_count integer,
  lease_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF limit_count < 1 OR limit_count > 100 THEN
    RAISE EXCEPTION 'invalid outbox batch size';
  END IF;

  IF lease_duration_seconds < 30 OR lease_duration_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid outbox lease duration';
  END IF;

  IF worker_identity IS NULL OR length(btrim(worker_identity)) = 0 OR length(worker_identity) > 128 THEN
    RAISE EXCEPTION 'invalid worker identity';
  END IF;

  -- Transition expired lease events that reached retry limits to dead_letter (processed_at reserved strictly for success)
  UPDATE public.outbox_events
  SET status = 'dead_letter',
      retry_count = retry_count + 1,
      last_error = 'MAX_RETRIES_EXCEEDED_AFTER_LEASE_EXPIRATION',
      lease_id = NULL,
      lease_expires_at = NULL,
      processed_at = NULL
  WHERE status = 'processing'
    AND lease_expires_at < clock_timestamp()
    AND retry_count >= 2;

  -- Self-healing: transition any stranded failed events with retry_count >= 3 to dead_letter
  UPDATE public.outbox_events
  SET status = 'dead_letter',
      last_error = COALESCE(last_error, 'MAX_RETRIES_EXCEEDED_AFTER_FAILURE'),
      lease_id = NULL,
      lease_expires_at = NULL,
      processed_at = NULL
  WHERE status = 'failed'
    AND retry_count >= 3;

  RETURN QUERY
  WITH candidates AS (
    SELECT c.id
    FROM public.outbox_events c
    WHERE c.status = 'pending'
       OR (c.status = 'failed' AND c.retry_count < 3)
       OR (c.status = 'processing' AND c.lease_expires_at < clock_timestamp() AND c.retry_count < 2)
    ORDER BY c.created_at ASC, c.id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT limit_count
  )
  UPDATE public.outbox_events AS e
  SET status = 'processing',
      retry_count = CASE
        WHEN e.status = 'processing' THEN e.retry_count + 1
        ELSE e.retry_count
      END,
      claimed_at = clock_timestamp(),
      lease_id = gen_random_uuid(),
      lease_expires_at = clock_timestamp() + make_interval(secs => lease_duration_seconds),
      claimed_by = worker_identity,
      processed_at = NULL
  FROM candidates
  WHERE e.id = candidates.id
  RETURNING e.id, e.event_type, e.payload, e.occurred_at, e.retry_count, e.lease_id;
END;
$$;

CREATE FUNCTION internal.complete_outbox_event(
  p_event_id uuid,
  p_lease_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS public.outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.outbox_events;
  v_next_retry integer;
BEGIN
  IF p_status NOT IN ('processed', 'failed', 'dead_letter') THEN
    RAISE EXCEPTION 'invalid outbox completion status';
  END IF;

  IF p_lease_id IS NULL THEN
    RAISE EXCEPTION 'outbox lease is required';
  END IF;

  SELECT * INTO v_event
  FROM public.outbox_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'outbox event not found';
  END IF;

  IF v_event.status <> 'processing' THEN
    RAISE EXCEPTION 'invalid outbox state transition';
  END IF;

  IF v_event.lease_id IS DISTINCT FROM p_lease_id
     OR v_event.lease_expires_at IS NULL
     OR v_event.lease_expires_at < clock_timestamp() THEN
    RAISE EXCEPTION 'outbox lease is invalid or expired';
  END IF;

  v_next_retry := COALESCE(v_event.retry_count, 0);

  IF p_status = 'failed' THEN
    v_next_retry := v_next_retry + 1;
    IF v_next_retry >= 3 THEN
      RAISE EXCEPTION 'retry limit reached; use dead_letter';
    END IF;
  ELSIF p_status = 'dead_letter' THEN
    v_next_retry := v_next_retry + 1;
  END IF;

  UPDATE public.outbox_events
  SET status = p_status,
      retry_count = v_next_retry,
      last_error = CASE WHEN p_status = 'processed' THEN NULL ELSE left(p_error, 4000) END,
      processed_at = CASE WHEN p_status = 'processed' THEN clock_timestamp() ELSE NULL END,
      lease_id = NULL,
      lease_expires_at = NULL
  WHERE id = p_event_id
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

CREATE FUNCTION internal.get_outbox_metrics()
RETURNS TABLE(status text, event_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT status::text, count(*)::bigint
  FROM public.outbox_events
  GROUP BY status
  ORDER BY status;
$$;

-- Schema-level privileges
REVOKE ALL ON SCHEMA internal FROM PUBLIC;
REVOKE ALL ON SCHEMA internal FROM anon;
REVOKE ALL ON SCHEMA internal FROM authenticated;
GRANT USAGE ON SCHEMA internal TO bookgarden_worker;

-- Function-level privileges
REVOKE ALL ON FUNCTION internal.claim_outbox_events(integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.complete_outbox_event(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.get_outbox_metrics() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION internal.claim_outbox_events(integer, text, integer) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.complete_outbox_event(uuid, uuid, text, text) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.get_outbox_metrics() TO bookgarden_worker;
