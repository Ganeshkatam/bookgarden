-- Migration Rollback: 20261022030000_atomic_rate_limiting_rollback.sql
-- Description: Surgical rollback for Work Package 0.2 (Atomic Rate Limiting & Request Budgeting).
-- Scope: Removes only rate-limiting capability RPCs and internal state tables.
-- Safety: Preserves the internal schema and all other unrelated database objects.

-- 1. Drop capability RPC functions
DROP FUNCTION IF EXISTS public.consume_rate_limit(text, integer, integer, integer);
DROP FUNCTION IF EXISTS public.record_login_success(text, uuid);
DROP FUNCTION IF EXISTS public.record_login_failure(text, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.release_in_flight_attempt(text, uuid);
DROP FUNCTION IF EXISTS public.reset_rate_limit(text);
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
DROP FUNCTION IF EXISTS public.consume_request_budget(text, integer, integer);
DROP FUNCTION IF EXISTS internal.cleanup_expired_rate_limits();

-- 2. Drop internal state tables (in dependency order)
DROP TABLE IF EXISTS internal.rate_limit_attempts;
DROP TABLE IF EXISTS internal.rate_limits;
DROP TABLE IF EXISTS internal.request_budgets;

-- Note: The 'internal' schema itself is preserved to avoid cascading drops on unrelated features.
