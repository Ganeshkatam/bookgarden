-- Migration: 20261022030000_atomic_rate_limiting.sql
-- Description: Establishes internal atomic rate limiting schema, in-flight attempt tracking,
-- and race-free consecutive failure accounting under row-level locking (FOR UPDATE).
--
-- Security model:
--   - State table internal.rate_limits lives in the unexposed 'internal' schema (DB-INV-04).
--   - Direct client access via PostgREST is impossible (no Data API exposure).
--   - In-flight attempts are tracked to bound concurrent auth calls before Supabase Auth is invoked.
--   - Race-free accounting: record_login_failure compares attempt start time against last_success_at
--     so in-flight failures completing after a concurrent successful login are not erased.
--   - Capability functions are SECURITY DEFINER with empty search_path.
--   - Least privilege: login capability RPCs granted exclusively to service_role;
--     background workers (bookgarden_worker, tomesphere_worker) are granted only cleanup capability.

-- ============================================================================
-- 1. Schema & Table Definition
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- Drop legacy objects if present
DROP TABLE IF EXISTS public.auth_rate_limits CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_rate_limits();

CREATE TABLE IF NOT EXISTS internal.rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  in_flight integer NOT NULL DEFAULT 0,
  last_success_at timestamptz,
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Index for efficient background cleanup
CREATE INDEX IF NOT EXISTS idx_internal_rate_limits_updated_at
  ON internal.rate_limits (updated_at);

-- Ensure schema usage
GRANT USAGE ON SCHEMA internal TO postgres, service_role, bookgarden_worker, tomesphere_worker;

-- Restrict all direct table permissions
REVOKE ALL ON TABLE internal.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE internal.rate_limits TO postgres, service_role;

-- ============================================================================
-- 2. Capability Functions
-- ============================================================================

-- Function: consume_rate_limit
-- Atomically checks thresholds and increments in-flight attempts under exclusive row lock.
-- Returns allowed status, remaining attempts, retry_after_ms, and attempt_time token.
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
BEGIN
  -- Strict input validation at database boundary
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

  -- Ensure record exists for key
  INSERT INTO internal.rate_limits (key, attempts, in_flight, last_success_at, window_started_at, locked_until, updated_at)
  VALUES (p_key, 0, 0, NULL, v_now, NULL, v_now)
  ON CONFLICT (key) DO NOTHING;

  -- Acquire exclusive row lock to serialize concurrent requests
  SELECT rl.attempts, rl.in_flight, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_in_flight, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key
  FOR UPDATE;

  -- 1. Active lockout check
  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM (v_locked_until - v_now)) * 1000 AS bigint) AS retry_after_ms,
      v_now AS attempt_time;
    RETURN;
  END IF;

  -- 2. Lockout expiry check: if lockout has expired, reset attempt counter and start new window
  IF v_locked_until IS NOT NULL AND v_locked_until <= v_now THEN
    v_attempts := 0;
    v_in_flight := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  -- 3. Window expiry check: if sliding/fixed window has elapsed, reset counter
  ELSIF v_now - v_window_start >= v_window_interval THEN
    v_attempts := 0;
    v_in_flight := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  END IF;

  -- 4. Evaluate combined load: active failed attempts + currently in-flight requests
  IF (v_attempts + v_in_flight) < p_max_attempts THEN
    v_in_flight := v_in_flight + 1;
    UPDATE internal.rate_limits
    SET
      in_flight = v_in_flight,
      window_started_at = v_window_start,
      locked_until = NULL,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT
      true AS allowed,
      (p_max_attempts - (v_attempts + v_in_flight)) AS remaining,
      0::bigint AS retry_after_ms,
      v_now AS attempt_time;
    RETURN;
  ELSE
    -- Threshold reached or exceeded: trigger lockout if failed attempts have reached max
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
      v_now AS attempt_time;
    RETURN;
  END IF;
END;
$$;

-- Function: record_login_success
-- Clears consecutive failure counter upon verified authentication and records last success timestamp.
CREATE OR REPLACE FUNCTION public.record_login_success(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_key IS NOT NULL AND length(btrim(p_key)) > 0 THEN
    UPDATE internal.rate_limits
    SET
      attempts = 0,
      in_flight = GREATEST(0, in_flight - 1),
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
  PERFORM public.record_login_success(p_key);
END;
$$;

-- Function: record_login_failure
-- Records an authentication failure with attempt start time comparison.
-- If a successful login occurred while this attempt was in flight, failure begins a fresh
-- consecutive count of 1 rather than being erased or falsely inheriting pre-reset counts.
CREATE OR REPLACE FUNCTION public.record_login_failure(
  p_key text,
  p_attempt_time timestamptz,
  p_max_attempts integer,
  p_lockout_seconds integer
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
  v_in_flight integer;
  v_last_success timestamptz;
  v_locked_until timestamptz;
  v_lockout_interval interval := (p_lockout_seconds || ' seconds')::interval;
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Rate limit key cannot be null or empty';
  END IF;

  SELECT rl.attempts, rl.in_flight, rl.last_success_at, rl.locked_until
  INTO v_attempts, v_in_flight, v_last_success, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, p_max_attempts, 0::bigint;
    RETURN;
  END IF;

  v_in_flight := GREATEST(0, v_in_flight - 1);

  -- Concurrency check: If a successful login completed after this attempt began (v_last_success > p_attempt_time),
  -- this failure is recorded as the 1st consecutive failure after that success, NOT erased.
  IF v_last_success IS NOT NULL AND v_last_success > p_attempt_time THEN
    v_attempts := 1;
  ELSE
    v_attempts := v_attempts + 1;
  END IF;

  IF v_attempts >= p_max_attempts THEN
    v_locked_until := v_now + v_lockout_interval;
  END IF;

  UPDATE internal.rate_limits
  SET
    attempts = v_attempts,
    in_flight = v_in_flight,
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

-- Function: check_rate_limit
-- Read-only inspection of rate-limit state without incrementing attempt counter.
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

  SELECT rl.attempts, rl.in_flight, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_in_flight, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT true AS allowed, p_max_attempts AS remaining, 0::bigint AS retry_after_ms;
    RETURN;
  END IF;

  -- 1. Active lockout check
  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM (v_locked_until - v_now)) * 1000 AS bigint) AS retry_after_ms;
    RETURN;
  END IF;

  -- 2. Lockout expired or window expired
  IF (v_locked_until IS NOT NULL AND v_locked_until <= v_now) OR (v_now - v_window_start >= v_window_interval) THEN
    RETURN QUERY SELECT true AS allowed, p_max_attempts AS remaining, 0::bigint AS retry_after_ms;
    RETURN;
  END IF;

  -- 3. In active window
  IF (v_attempts + v_in_flight) < p_max_attempts THEN
    RETURN QUERY SELECT true AS allowed, (p_max_attempts - (v_attempts + v_in_flight)) AS remaining, 0::bigint AS retry_after_ms;
  ELSE
    RETURN QUERY SELECT false AS allowed, 0 AS remaining, 0::bigint AS retry_after_ms;
  END IF;
END;
$$;

-- Function: cleanup_expired_rate_limits
-- Deletes stale rate-limit entries older than 24 hours.
DROP FUNCTION IF EXISTS internal.cleanup_expired_rate_limits();

CREATE OR REPLACE FUNCTION internal.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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
REVOKE ALL ON FUNCTION public.record_login_success(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_failure(text, timestamptz, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;

-- Grant execution of login capability functions exclusively to backend service_role
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_success(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text, timestamptz, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- Grant execution of background cleanup function to service_role and background workers
GRANT EXECUTE ON FUNCTION internal.cleanup_expired_rate_limits() TO service_role, bookgarden_worker, tomesphere_worker;
