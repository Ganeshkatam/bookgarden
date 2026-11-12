-- Migration: 20261112000000_drop_stale_search_history_routines.sql
-- Description: Drop the three search-history stored routines that survived the
--              partial ad-hoc schema cleanup executed prior to this migration
--              being applied through the standard CLI pipeline.
--
-- Background (DEF-017):
--   Migration 20261111203000_retire_search_history.sql was merged into main via
--   PR #7 but was never applied through the Supabase migration CLI.  An ad-hoc
--   operation dropped the search_history table and both trending views
--   (trending_searches, trending_searches_v1) but left three dependent routines
--   behind.  Those routines are stale SECURITY INVOKER / SECURITY DEFINER
--   functions whose underlying table no longer exists:
--
--     • public.get_recent_searches_v1(uuid)       — SECURITY INVOKER
--     • public.log_search_analytics(...)          — SECURITY DEFINER
--     • public.refresh_trending_searches_v1()     — SECURITY INVOKER
--
--   get_recent_searches_v1 is callable by authenticated users and will produce
--   a fatal runtime error ("relation public.search_history does not exist") on
--   any invocation.  The application layer no longer calls any of the three
--   functions (retired in PR #7), so there is no risk of application breakage.
--
-- Safety:
--   All three DROP statements use IF EXISTS.  Applying this migration to a
--   database where the functions have already been removed is a no-op.
--   The enclosing transaction ensures atomicity.

BEGIN;

DROP FUNCTION IF EXISTS public.get_recent_searches_v1(uuid);

DROP FUNCTION IF EXISTS public.log_search_analytics(
  uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text
);

DROP FUNCTION IF EXISTS public.refresh_trending_searches_v1();

COMMIT;
