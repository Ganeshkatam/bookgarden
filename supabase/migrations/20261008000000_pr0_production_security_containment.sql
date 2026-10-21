-- Migration: 20261008000000_pr0_production_security_containment.sql
-- Description: PR0 Production Security Containment
-- Closes immediate trust-boundary exposures:
-- 1. Revoke public/authenticated direct INSERT on outbox_events.
-- 2. Revoke public/authenticated direct INSERT on audit_logs.
-- 3. Revoke excessive anon/public EXECUTE on SECURITY DEFINER functions.
--
-- GOVERNANCE: Prepared for operator deployment. Do NOT run autonomously against production.

-- ============================================================================
-- 1. OUTBOX TRUST BOUNDARY CONTAINMENT
-- ============================================================================

-- Drop permissive policy allowing authenticated users to forge outbox events
DROP POLICY IF EXISTS "authenticated_outbox_insert" ON public.outbox_events;

-- Revoke write privileges from untrusted roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.outbox_events FROM authenticated;
REVOKE ALL ON public.outbox_events FROM anon;
REVOKE ALL ON public.outbox_events FROM PUBLIC;

-- Enforce Row Level Security
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- Ensure service_role has explicit full policy
DROP POLICY IF EXISTS "worker_outbox_policy" ON public.outbox_events;
CREATE POLICY "worker_outbox_policy" ON public.outbox_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure table permissions for backend infrastructure
GRANT ALL ON TABLE public.outbox_events TO service_role;
GRANT ALL ON TABLE public.outbox_events TO postgres;


-- ============================================================================
-- 2. AUDIT LOG TRUST BOUNDARY CONTAINMENT
-- ============================================================================

-- Drop permissive policy allowing public/anon clients to insert arbitrary audit logs
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

-- Revoke write and unauthenticated read privileges from untrusted roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC;
REVOKE SELECT ON public.audit_logs FROM anon;
REVOKE SELECT ON public.audit_logs FROM PUBLIC;

-- Enforce Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated users can only read their own audit entries
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = actor_id);

-- Ensure service_role has explicit full policy for server-side audit recording
DROP POLICY IF EXISTS "service_role_audit_logs_policy" ON public.audit_logs;
CREATE POLICY "service_role_audit_logs_policy" ON public.audit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure table permissions for backend infrastructure
GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT ALL ON TABLE public.audit_logs TO postgres;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;


-- ============================================================================
-- 3. SECURITY DEFINER PRIVILEGE CONTAINMENT
-- ============================================================================

-- 3.1 Authorization Evaluation RPCs
-- Revoke anon and PUBLIC execution. Restrict to authenticated users and service_role.
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, varchar) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, varchar) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;

-- 3.2 User Statistics Recalculation (Internal trigger helper)
-- Revoke anon, authenticated, and PUBLIC execution. Restrict to service_role and triggers.
REVOKE EXECUTE ON FUNCTION public.recalculate_user_statistics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_user_statistics(uuid) TO service_role;

-- 3.3 Reading Session Statistics Trigger Function
-- Revoke all client execution. Restrict to service_role and internal triggers.
REVOKE EXECUTE ON FUNCTION public.trigger_recalculate_reading_session_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_recalculate_reading_session_stats() TO service_role;

-- 3.4 Search Analytics Logging RPC
-- Revoke all client execution. Restrict to service_role.
REVOKE EXECUTE ON FUNCTION public.log_search_analytics(
  uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_analytics(
  uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text
) TO service_role;
