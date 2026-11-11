-- Migration: 20261111203000_retire_search_history.sql
-- Description: Retire search_history table, dependent views, and unused search telemetry functions to eliminate DB bloat and security lints.

BEGIN;

-- 1. Drop dependent presentation view
DROP VIEW IF EXISTS public.trending_searches CASCADE;

-- 2. Drop dependent materialized view
DROP MATERIALIZED VIEW IF EXISTS public.trending_searches_v1 CASCADE;

-- 3. Drop search history table and any attached policies/indexes
DROP TABLE IF EXISTS public.search_history CASCADE;

-- 4. Drop retired stored procedures / RPCs
DROP FUNCTION IF EXISTS public.get_recent_searches_v1(uuid);
DROP FUNCTION IF EXISTS public.log_search_analytics(uuid, uuid, text, text, timestamptz, integer, integer, boolean, boolean, jsonb, text);
DROP FUNCTION IF EXISTS public.refresh_trending_searches_v1();

COMMIT;
