-- Migration Rollback: 20261022030000_atomic_rate_limiting_rollback.sql
-- Description: Surgical rollback for Work Package 0.2 (Atomic Rate Limiting).
-- Scope: Removes only rate-limiting capability RPCs and the internal.rate_limits table.
-- Safety: Preserves the internal schema and all other unrelated database objects.

-- 1. Drop capability RPC functions
DROP FUNCTION IF EXISTS public.consume_rate_limit(text, integer, integer, integer);
DROP FUNCTION IF EXISTS public.record_login_success(text);
DROP FUNCTION IF EXISTS public.record_login_failure(text, timestamptz, integer, integer);
DROP FUNCTION IF EXISTS public.reset_rate_limit(text);
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
DROP FUNCTION IF EXISTS public.release_in_flight_attempt(text);
DROP FUNCTION IF EXISTS internal.cleanup_expired_rate_limits();

-- 2. Drop internal rate-limits table and index
DROP INDEX IF EXISTS internal.idx_internal_rate_limits_updated_at;
DROP TABLE IF EXISTS internal.rate_limits;

-- Note: The 'internal' schema itself is preserved to avoid cascading drops on unrelated features.
