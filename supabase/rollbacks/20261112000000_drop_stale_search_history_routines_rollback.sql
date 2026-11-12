-- Rollback: 20261112000000_drop_stale_search_history_routines_rollback.sql
-- Description: Recreates the three retired search-history routines removed by
--              20261112000000_drop_stale_search_history_routines.sql.
--
-- WARNING: This rollback re-creates the function signatures only.
--   The underlying public.search_history table does NOT exist in this database
--   state.  Invoking these functions after rollback will produce a runtime error
--   until public.search_history is also recreated
--   (see 20261111203000_retire_search_history_rollback.sql for the full
--   structural rollback that recreates the table, indexes, views, and functions).
--
--   Under normal circumstances this rollback should NOT be applied in isolation.
--   Run the full 20261111203000 rollback instead if you need to restore the
--   entire search-history subsystem.
--
-- Permission design:
--   • get_recent_searches_v1 — SECURITY INVOKER; callable by authenticated.
--   • log_search_analytics   — SECURITY DEFINER; restricted to service_role.
--     Explicit REVOKE prevents the PostgreSQL default of PUBLIC execute.
--   • refresh_trending_searches_v1 — SECURITY INVOKER; restricted to
--     service_role (called only by cron workers).

BEGIN;

-- 1. get_recent_searches_v1 — SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_recent_searches_v1(p_user_id uuid)
  RETURNS TABLE(query text, searched_at timestamp with time zone)
  LANGUAGE plpgsql
  SET search_path TO 'public', 'internal'
AS $$
BEGIN
    RETURN QUERY
    SELECT sh.query, sh.searched_at
    FROM public.search_history sh
    WHERE sh.user_id = p_user_id
    ORDER BY sh.searched_at DESC
    LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recent_searches_v1(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_searches_v1(uuid) TO authenticated;

-- 2. log_search_analytics — SECURITY DEFINER (writes to search_history)
CREATE OR REPLACE FUNCTION public.log_search_analytics(
    p_id uuid,
    p_user_id uuid,
    p_query text,
    p_normalized_query text,
    p_searched_at timestamp with time zone,
    p_result_count integer,
    p_execution_time_ms integer,
    p_is_zero_result boolean,
    p_is_slow_query boolean,
    p_filters jsonb,
    p_sort_strategy text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.search_history (
    id, user_id, query, normalized_query, searched_at,
    result_count, execution_time_ms, is_zero_result, is_slow_query,
    filters, sort_strategy
  ) VALUES (
    p_id, p_user_id, p_query, p_normalized_query, p_searched_at,
    p_result_count, p_execution_time_ms, p_is_zero_result, p_is_slow_query,
    p_filters, p_sort_strategy
  );
END;
$$;

-- Restrict SECURITY DEFINER function: revoke default PUBLIC execute, grant only service_role.
REVOKE ALL ON FUNCTION public.log_search_analytics(
  uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_search_analytics(
  uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text
) TO service_role;

-- 3. refresh_trending_searches_v1 — SECURITY INVOKER (cron worker only)
CREATE OR REPLACE FUNCTION public.refresh_trending_searches_v1()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO 'public', 'internal'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_searches_v1;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_trending_searches_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_trending_searches_v1() TO service_role;

COMMIT;
