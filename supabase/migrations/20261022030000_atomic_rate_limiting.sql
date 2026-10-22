-- Migration: 20261022030000_atomic_rate_limiting.sql
-- Description: Establishes internal atomic rate limiting schema, individual in-flight attempt tracking
-- via unique attempt IDs, request-rate budgets for IP throttling, and race-free failure accounting.
--
-- Security model:
--   - State tables live in the unexposed 'internal' schema (DB-INV-04).
--   - Direct client access via PostgREST is impossible (no Data API exposure).
--   - Every in-flight attempt has a unique attempt_id; window expiry does not reset active attempts.
--   - Request-rate budgets (IP throttling) are separated from account brute-force protection.
--   - Capability functions are SECURITY DEFINER with empty search_path.
--   - Least privilege: authentication RPCs granted exclusively to service_role;
--     background workers (bookgarden_worker, tomesphere_worker) are granted only cleanup capability.

-- ============================================================================
-- 1. Schema & Table Definition
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- Drop obsolete cleanup function referencing non-existent legacy tables
DROP FUNCTION IF EXISTS public.cleanup_expired_rate_limits();

-- Table: internal.rate_limits (Account login attempt tracking)
CREATE TABLE IF NOT EXISTS internal.rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Table: internal.rate_limit_attempts (Individual active attempt tracking)
CREATE TABLE IF NOT EXISTS internal.rate_limit_attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL REFERENCES internal.rate_limits(key) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_flight' CHECK (status IN ('in_flight', 'success', 'failure', 'released')),
  window_started_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz
);

-- Table: internal.request_budgets (IP request-rate budget tracking)
CREATE TABLE IF NOT EXISTS internal.request_budgets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for performance and background cleanup
CREATE INDEX IF NOT EXISTS idx_internal_rate_limits_updated_at
  ON internal.rate_limits (updated_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_key_status
  ON internal.rate_limit_attempts (key, status)
  WHERE status = 'in_flight';

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_created_at
  ON internal.rate_limit_attempts (created_at);

CREATE INDEX IF NOT EXISTS idx_internal_request_budgets_updated_at
  ON internal.request_budgets (updated_at);

-- Schema and table permissions
GRANT USAGE ON SCHEMA internal TO postgres, service_role, bookgarden_worker, tomesphere_worker;

REVOKE ALL ON TABLE internal.rate_limits, internal.rate_limit_attempts, internal.request_budgets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE internal.rate_limits, internal.rate_limit_attempts, internal.request_budgets TO postgres, service_role;

-- ============================================================================
-- 2. Capability Functions
-- ============================================================================

-- Function: consume_rate_limit
-- Checks threshold and claims an in-flight attempt slot with a unique attempt_id.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_lockout_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_ms bigint,
  attempt_id uuid,
  attempt_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
  v_in_flight integer;
  v_window_start timestamptz;
  v_locked_until timestamptz;
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
  v_lockout_interval interval := (p_lockout_seconds || ' seconds')::interval;
  v_attempt_id uuid;
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Rate limit key cannot be null or empty';
  END IF;
  IF p_max_attempts <= 0 THEN
    RAISE EXCEPTION 'Max attempts must be greater than zero';
  END IF;
  IF p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Window seconds must be greater than zero';
  END IF;
  IF p_lockout_seconds <= 0 THEN
    RAISE EXCEPTION 'Lockout seconds must be greater than zero';
  END IF;

  INSERT INTO internal.rate_limits (key, attempts, last_success_at, window_started_at, locked_until, updated_at)
  VALUES (p_key, 0, NULL, v_now, NULL, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT rl.attempts, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key
  FOR UPDATE;

  -- 1. Check active lockout
  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM (v_locked_until - v_now)) * 1000 AS bigint) AS retry_after_ms,
      NULL::uuid AS attempt_id,
      v_now AS attempt_time;
    RETURN;
  END IF;

  -- 2. Lockout expiry check: if lockout has expired, reset attempt counter
  IF v_locked_until IS NOT NULL AND v_locked_until <= v_now THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  -- 3. Window expiry check: if sliding/fixed window has elapsed, reset attempt counter
  ELSIF v_now - v_window_start >= v_window_interval THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  END IF;

  -- 4. Count active in-flight attempts (tracked individually)
  SELECT count(*)::integer INTO v_in_flight
  FROM internal.rate_limit_attempts
  WHERE key = p_key AND status = 'in_flight';

  -- 5. Evaluate capacity
  IF (v_attempts + v_in_flight) < p_max_attempts THEN
    v_attempt_id := gen_random_uuid();

    INSERT INTO internal.rate_limit_attempts (attempt_id, key, status, window_started_at, created_at)
    VALUES (v_attempt_id, p_key, 'in_flight', v_window_start, v_now);

    UPDATE internal.rate_limits
    SET
      window_started_at = v_window_start,
      locked_until = NULL,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT
      true AS allowed,
      (p_max_attempts - (v_attempts + v_in_flight + 1)) AS remaining,
      0::bigint AS retry_after_ms,
      v_attempt_id AS attempt_id,
      v_now AS attempt_time;
    RETURN;
  ELSE
    -- Threshold reached: trigger lockout if failed attempts have reached max
    IF v_attempts >= p_max_attempts THEN
      v_locked_until := v_now + v_lockout_interval;
    END IF;

    UPDATE internal.rate_limits
    SET
      locked_until = v_locked_until,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM v_lockout_interval) * 1000 AS bigint) AS retry_after_ms,
      NULL::uuid AS attempt_id,
      v_now AS attempt_time;
    RETURN;
  END IF;
END;
$$;

-- Function: record_login_success
-- Completes matching attempt and resets consecutive failures.
CREATE OR REPLACE FUNCTION public.record_login_success(
  p_key text,
  p_attempt_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_key IS NOT NULL AND length(btrim(p_key)) > 0 THEN
    IF p_attempt_id IS NOT NULL THEN
      UPDATE internal.rate_limit_attempts
      SET status = 'success', completed_at = clock_timestamp()
      WHERE attempt_id = p_attempt_id AND status = 'in_flight';
    END IF;

    UPDATE internal.rate_limits
    SET
      attempts = 0,
      last_success_at = clock_timestamp(),
      locked_until = NULL,
      updated_at = clock_timestamp()
    WHERE key = p_key;
  END IF;
END;
$$;

-- Backward-compatible alias for record_login_success
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.record_login_success(p_key, NULL);
END;
$$;

-- Function: record_login_failure
-- Completes matching attempt and records consecutive failure.
CREATE OR REPLACE FUNCTION public.record_login_failure(
  p_key text,
  p_attempt_id uuid DEFAULT NULL,
  p_max_attempts integer DEFAULT 5,
  p_lockout_seconds integer DEFAULT 3600
)
RETURNS TABLE (
  locked boolean,
  attempts integer,
  remaining integer,
  retry_after_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
  v_window_start timestamptz;
  v_locked_until timestamptz;
  v_attempt_window_start timestamptz;
  v_lockout_interval interval := (p_lockout_seconds || ' seconds')::interval;
  v_window_interval interval := interval '15 minutes';
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Rate limit key cannot be null or empty';
  END IF;

  SELECT rl.attempts, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, p_max_attempts, 0::bigint;
    RETURN;
  END IF;

  -- 1. Check lockout and window expiry
  IF v_locked_until IS NOT NULL AND v_locked_until <= v_now THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  ELSIF v_now - v_window_start >= v_window_interval THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  END IF;

  -- 2. Complete specific matching attempt
  IF p_attempt_id IS NOT NULL THEN
    SELECT a.window_started_at INTO v_attempt_window_start
    FROM internal.rate_limit_attempts a
    WHERE a.attempt_id = p_attempt_id AND a.status = 'in_flight'
    FOR UPDATE;

    IF FOUND THEN
      UPDATE internal.rate_limit_attempts
      SET status = 'failure', completed_at = v_now
      WHERE attempt_id = p_attempt_id;

      -- Only increment attempts if the attempt was initiated in the current active window
      IF v_attempt_window_start = v_window_start THEN
        v_attempts := v_attempts + 1;
      END IF;
    ELSE
      -- Attempt was not in-flight; fallback increment
      v_attempts := v_attempts + 1;
    END IF;
  ELSE
    v_attempts := v_attempts + 1;
  END IF;

  IF v_attempts >= p_max_attempts THEN
    v_locked_until := v_now + v_lockout_interval;
  END IF;

  UPDATE internal.rate_limits
  SET
    attempts = v_attempts,
    window_started_at = v_window_start,
    locked_until = v_locked_until,
    updated_at = v_now
  WHERE key = p_key;

  RETURN QUERY SELECT
    (v_locked_until IS NOT NULL AND v_locked_until > v_now) AS locked,
    v_attempts,
    GREATEST(0, p_max_attempts - v_attempts) AS remaining,
    CASE 
      WHEN v_locked_until IS NOT NULL AND v_locked_until > v_now 
      THEN CAST(EXTRACT(EPOCH FROM v_lockout_interval) * 1000 AS bigint)
      ELSE 0::bigint 
    END AS retry_after_ms;
END;
$$;

-- Function: release_in_flight_attempt
-- Releases a specific in-flight slot if an exception occurs during authentication.
CREATE OR REPLACE FUNCTION public.release_in_flight_attempt(
  p_key text,
  p_attempt_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    UPDATE internal.rate_limit_attempts
    SET status = 'released', completed_at = clock_timestamp()
    WHERE attempt_id = p_attempt_id AND status = 'in_flight';
  END IF;
END;
$$;

-- Function: check_rate_limit
-- Read-only inspection of rate-limit state without incrementing attempts.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
  v_in_flight integer;
  v_window_start timestamptz;
  v_locked_until timestamptz;
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Rate limit key cannot be null or empty';
  END IF;

  SELECT rl.attempts, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT true AS allowed, p_max_attempts AS remaining, 0::bigint AS retry_after_ms;
    RETURN;
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM (v_locked_until - v_now)) * 1000 AS bigint) AS retry_after_ms;
    RETURN;
  END IF;

  IF (v_locked_until IS NOT NULL AND v_locked_until <= v_now) OR (v_now - v_window_start >= v_window_interval) THEN
    RETURN QUERY SELECT true AS allowed, p_max_attempts AS remaining, 0::bigint AS retry_after_ms;
    RETURN;
  END IF;

  SELECT count(*)::integer INTO v_in_flight
  FROM internal.rate_limit_attempts
  WHERE key = p_key AND status = 'in_flight';

  IF (v_attempts + v_in_flight) < p_max_attempts THEN
    RETURN QUERY SELECT true AS allowed, (p_max_attempts - (v_attempts + v_in_flight)) AS remaining, 0::bigint AS retry_after_ms;
  ELSE
    RETURN QUERY SELECT false AS allowed, 0 AS remaining, 0::bigint AS retry_after_ms;
  END IF;
END;
$$;

-- Function: consume_request_budget
-- Atomic sliding/fixed window request-rate budget for IP throttling.
CREATE OR REPLACE FUNCTION public.consume_request_budget(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_window_start timestamptz;
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
  v_remaining_ms bigint;
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Budget key cannot be null or empty';
  END IF;
  IF p_max_requests <= 0 THEN
    RAISE EXCEPTION 'Max requests must be greater than zero';
  END IF;
  IF p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Window seconds must be greater than zero';
  END IF;

  INSERT INTO internal.request_budgets (key, count, window_started_at, updated_at)
  VALUES (p_key, 0, v_now, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT b.count, b.window_started_at
  INTO v_count, v_window_start
  FROM internal.request_budgets b
  WHERE b.key = p_key
  FOR UPDATE;

  -- Reset count if window has elapsed
  IF v_now - v_window_start >= v_window_interval THEN
    v_count := 0;
    v_window_start := v_now;
  END IF;

  v_remaining_ms := GREATEST(1::bigint, CAST(EXTRACT(EPOCH FROM ((v_window_start + v_window_interval) - v_now)) * 1000 AS bigint));

  IF v_count < p_max_requests THEN
    v_count := v_count + 1;
    UPDATE internal.request_budgets
    SET
      count = v_count,
      window_started_at = v_window_start,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT true AS allowed, (p_max_requests - v_count) AS remaining, 0::bigint AS retry_after_ms;
  ELSE
    UPDATE internal.request_budgets
    SET updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT false AS allowed, 0 AS remaining, v_remaining_ms AS retry_after_ms;
  END IF;
END;
$$;

-- Function: cleanup_expired_rate_limits
-- Deletes stale attempts, budgets, and rate-limit records older than 24 hours.
DROP FUNCTION IF EXISTS internal.cleanup_expired_rate_limits();

CREATE OR REPLACE FUNCTION internal.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete completed attempts older than 1 hour
  DELETE FROM internal.rate_limit_attempts
  WHERE status IN ('success', 'failure', 'released')
    AND completed_at < (clock_timestamp() - INTERVAL '1 hour');

  -- Delete abandoned in-flight attempts older than 24 hours
  DELETE FROM internal.rate_limit_attempts
  WHERE status = 'in_flight'
    AND created_at < (clock_timestamp() - INTERVAL '24 hours');

  -- Delete expired budgets older than 24 hours
  DELETE FROM internal.request_budgets
  WHERE updated_at < (clock_timestamp() - INTERVAL '24 hours');

  -- Delete expired rate limits older than 24 hours
  DELETE FROM internal.rate_limits
  WHERE updated_at < (clock_timestamp() - INTERVAL '24 hours')
    AND (locked_until IS NULL OR locked_until < clock_timestamp());
END;
$$;

-- ============================================================================
-- 3. Privilege Management
-- ============================================================================

-- Revoke all function permissions from untrusted roles
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_success(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_failure(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_in_flight_attempt(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_request_budget(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;

-- Grant execution of login capability functions exclusively to backend service_role
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_success(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_in_flight_attempt(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_request_budget(text, integer, integer) TO service_role;

-- Grant execution of background cleanup function to service_role and background workers
GRANT EXECUTE ON FUNCTION internal.cleanup_expired_rate_limits() TO service_role, bookgarden_worker, tomesphere_worker;
