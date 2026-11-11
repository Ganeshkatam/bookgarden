-- Rollback: 20261111203000_retire_search_history_rollback.sql
-- Description: Re-creates search_history table, indexes, RLS, functions, and views in case of rollback.

BEGIN;

CREATE TABLE IF NOT EXISTS public.search_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    query text NOT NULL,
    normalized_query text NOT NULL,
    searched_at timestamptz DEFAULT now(),
    clicked_document_id uuid REFERENCES public.discovery_search_documents(book_id),
    result_count integer,
    execution_time_ms integer,
    is_zero_result boolean DEFAULT false,
    is_slow_query boolean DEFAULT false,
    filters jsonb,
    sort_strategy text
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search history" ON public.search_history
    FOR INSERT WITH CHECK ((user_id IS NULL) OR (user_id = (SELECT auth.uid())));

CREATE POLICY "Users can manage own search history" ON public.search_history
    FOR ALL USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_normalized_query_idx ON public.search_history(normalized_query);
CREATE INDEX IF NOT EXISTS search_history_zero_result_idx ON public.search_history(is_zero_result) WHERE is_zero_result = true;
CREATE INDEX IF NOT EXISTS search_history_slow_query_idx ON public.search_history(is_slow_query) WHERE is_slow_query = true;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_searches_v1 AS
 SELECT normalized_query,
    count(*) AS search_count,
    max(searched_at) AS last_searched_at
   FROM search_history sh
  WHERE ((searched_at >= (now() - '7 days'::interval)) AND (is_zero_result = false))
  GROUP BY normalized_query
 HAVING (count(*) > 1)
  ORDER BY (count(*)) DESC, (max(searched_at)) DESC
 LIMIT 50;

CREATE UNIQUE INDEX IF NOT EXISTS trending_searches_v1_query_idx ON public.trending_searches_v1(normalized_query);

CREATE OR REPLACE VIEW public.trending_searches AS
 SELECT normalized_query,
    search_count,
    last_searched_at
   FROM trending_searches_v1;

CREATE OR REPLACE FUNCTION public.get_recent_searches_v1(p_user_id uuid)
 RETURNS TABLE(query text, searched_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'internal'
AS $$
BEGIN
    RETURN QUERY
    SELECT q.query, q.searched_at
    FROM (
        SELECT DISTINCT ON (sh.normalized_query)
            sh.query,
            sh.searched_at
        FROM public.search_history sh
        WHERE sh.user_id = p_user_id
        ORDER BY sh.normalized_query, sh.searched_at DESC
    ) q
    ORDER BY q.searched_at DESC
    LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_search_analytics(
    p_id uuid, p_user_id uuid, p_query text, p_normalized_query text,
    p_searched_at timestamp with time zone, p_result_count integer,
    p_execution_time_ms integer, p_is_zero_result boolean,
    p_is_slow_query boolean, p_filters jsonb, p_sort_strategy text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.search_history (
    id, user_id, query, normalized_query, searched_at, 
    result_count, execution_time_ms, is_zero_result, is_slow_query, filters, sort_strategy
  ) VALUES (
    p_id, p_user_id, p_query, p_normalized_query, p_searched_at, 
    p_result_count, p_execution_time_ms, p_is_zero_result, p_is_slow_query, p_filters, p_sort_strategy
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_trending_searches_v1()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'internal'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_searches_v1;
END;
$$;

COMMIT;
