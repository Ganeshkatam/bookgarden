-- Migration: 20261022030000_atomic_rate_limiting.sql
-- Description: Establishes internal atomic rate limiting schema, row-level locking,
-- and capability functions for brute-force protection and lockout management.
--
-- Security model:
--   - State table internal.rate_limits lives in the unexposed 'internal' schema (DB-INV-04).
--   - Direct client access via PostgREST is impossible (no Data API exposure).
--   - Row-level lock (FOR UPDATE) guarantees race-condition immunity under concurrency.
--   - Lockout expiry resets the attempt window even if the outer window has not expired.
--   - Functions are SECURITY DEFINER with empty search_path, granted exclusively to service_role.

-- ============================================================================
-- 1. Schema & Table Definition
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- Drop legacy table if present
DROP TABLE IF EXISTS public.auth_rate_limits CASCADE;

CREATE TABLE IF NOT EXISTS internal.rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
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
-- Atomically increments attempt counter and checks thresholds under exclusive row lock.
-- Returns allowed status, remaining attempts, and retry_after_ms.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_lockout_seconds integer
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
  INSERT INTO internal.rate_limits (key, attempts, window_started_at, locked_until, updated_at)
  VALUES (p_key, 0, v_now, NULL, v_now)
  ON CONFLICT (key) DO NOTHING;

  -- Acquire exclusive row lock to serialize concurrent requests
  SELECT rl.attempts, rl.window_started_at, rl.locked_until
  INTO v_attempts, v_window_start, v_locked_until
  FROM internal.rate_limits rl
  WHERE rl.key = p_key
  FOR UPDATE;

  -- 1. Active lockout check
  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM (v_locked_until - v_now)) * 1000 AS bigint) AS retry_after_ms;
    RETURN;
  END IF;

  -- 2. Lockout expiry check: if lockout has expired, reset attempt counter and start new window
  IF v_locked_until IS NOT NULL AND v_locked_until <= v_now THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  -- 3. Window expiry check: if sliding/fixed window has elapsed, reset counter
  ELSIF v_now - v_window_start >= v_window_interval THEN
    v_attempts := 0;
    v_window_start := v_now;
    v_locked_until := NULL;
  END IF;

  -- 4. Evaluate attempt
  IF v_attempts < p_max_attempts THEN
    -- Attempt allowed within limit
    v_attempts := v_attempts + 1;
    UPDATE internal.rate_limits
    SET
      attempts = v_attempts,
      window_started_at = v_window_start,
      locked_until = NULL,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT
      true AS allowed,
      (p_max_attempts - v_attempts) AS remaining,
      0::bigint AS retry_after_ms;
    RETURN;
  ELSE
    -- Threshold reached or exceeded (e.g. 6th attempt when max=5): trigger lockout
    v_locked_until := v_now + v_lockout_interval;
    UPDATE internal.rate_limits
    SET
      attempts = v_attempts + 1,
      window_started_at = v_window_start,
      locked_until = v_locked_until,
      updated_at = v_now
    WHERE key = p_key;

    RETURN QUERY SELECT
      false AS allowed,
      0 AS remaining,
      CAST(EXTRACT(EPOCH FROM v_lockout_interval) * 1000 AS bigint) AS retry_after_ms;
    RETURN;
  END IF;
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
  IF v_attempts < p_max_attempts THEN
    RETURN QUERY SELECT true AS allowed, (p_max_attempts - v_attempts) AS remaining, 0::bigint AS retry_after_ms;
  ELSE
    RETURN QUERY SELECT false AS allowed, 0 AS remaining, 0::bigint AS retry_after_ms;
  END IF;
END;
$$;

-- Function: reset_rate_limit
-- Clears rate limit state for a key upon successful authentication.
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_key IS NOT NULL AND length(btrim(p_key)) > 0 THEN
    DELETE FROM internal.rate_limits WHERE key = p_key;
  END IF;
END;
$$;

-- Function: cleanup_expired_rate_limits
-- Deletes stale rate-limit entries older than 24 hours.
CREATE OR REPLACE FUNCTION internal.cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM internal.rate_limits
  WHERE updated_at < (clock_timestamp() - INTERVAL '24 hours')
    AND (locked_until IS NULL OR locked_until < clock_timestamp());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 3. Privilege Management
-- ============================================================================

-- Revoke all function permissions from untrusted roles
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION internal.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;

-- Grant execution exclusively to backend service_role and workers
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer, integer) TO service_role, bookgarden_worker, tomesphere_worker;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role, bookgarden_worker, tomesphere_worker;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text) TO service_role, bookgarden_worker, tomesphere_worker;
GRANT EXECUTE ON FUNCTION internal.cleanup_expired_rate_limits() TO service_role, bookgarden_worker, tomesphere_worker;
