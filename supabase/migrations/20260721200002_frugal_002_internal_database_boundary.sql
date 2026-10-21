-- Frugal Migration 002: Internal Database Boundary & Worker Role
-- Purpose: Establish unexposed 'internal' schema, dedicated 'bookgarden_worker' role, and capability functions.

-- 1. Create unexposed internal schema
CREATE SCHEMA IF NOT EXISTS internal;

-- 2. Create worker role (without plain literal passwords in migration SQL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bookgarden_worker') THEN
    CREATE ROLE bookgarden_worker WITH LOGIN;
  END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA internal TO bookgarden_worker;

-- 3. Capability Functions in internal schema (SECURITY DEFINER with empty search_path)

CREATE OR REPLACE FUNCTION internal.claim_outbox_events(limit_count integer)
RETURNS SETOF public.outbox_events
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.outbox_events
    SET status = 'processing'
    WHERE id IN (
        SELECT id
        FROM public.outbox_events
        WHERE status = 'pending'
           OR (status = 'failed' AND retry_count < 3)
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT limit_count
    )
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION internal.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION internal.refresh_category_document(target_category text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    total_count INTEGER;
    top_trending UUID[];
    new_releases UUID[];
BEGIN
    SELECT COUNT(*) INTO total_count 
    FROM public.discovery_search_documents 
    WHERE target_category = ANY(categories);

    SELECT array_agg(book_id) INTO top_trending
    FROM (
        SELECT book_id 
        FROM public.discovery_search_documents 
        WHERE target_category = ANY(categories)
        ORDER BY popularity_score DESC, rating DESC 
        LIMIT 10
    ) sub;

    SELECT array_agg(book_id) INTO new_releases
    FROM (
        SELECT book_id 
        FROM public.discovery_search_documents 
        WHERE target_category = ANY(categories)
        ORDER BY publication_year DESC NULLS LAST, popularity_score DESC 
        LIMIT 10
    ) sub;

    INSERT INTO public.discovery_category_documents (
        category, total_books, top_trending_book_ids, new_release_book_ids, updated_at
    ) VALUES (
        target_category, COALESCE(total_count, 0), COALESCE(top_trending, '{}'), COALESCE(new_releases, '{}'), NOW()
    )
    ON CONFLICT (category) DO UPDATE SET
        total_books = EXCLUDED.total_books,
        top_trending_book_ids = EXCLUDED.top_trending_book_ids,
        new_release_book_ids = EXCLUDED.new_release_book_ids,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION internal.refresh_recommendation_signals(target_user_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.discovery_recommendation_signals (
        user_id, book_id, liked, rating, completion_percent, interaction_count, last_activity_at, updated_at
    )
    SELECT 
        COALESCE(l.user_id, r.user_id, s.user_id),
        COALESCE(l.book_id, r.book_id, s.book_id),
        l.id IS NOT NULL as liked,
        r.rating,
        COALESCE(s.percentage, 0) as completion_percent,
        (CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END) + 
        (CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) + 
        (CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END) as interaction_count,
        GREATEST(l.created_at, r.created_at, s.last_read_at) as last_activity_at,
        NOW() as updated_at
    FROM 
        (SELECT id, user_id, book_id, created_at FROM public.book_likes WHERE (target_user_id IS NULL OR user_id = target_user_id)) l
    FULL OUTER JOIN 
        (SELECT id, user_id, book_id, rating, created_at FROM public.ratings WHERE (target_user_id IS NULL OR user_id = target_user_id)) r
    ON l.user_id = r.user_id AND l.book_id = r.book_id
    FULL OUTER JOIN 
        (SELECT id, user_id, book_id, percentage, last_read_at FROM public.reader_sessions WHERE (target_user_id IS NULL OR user_id = target_user_id)) s
    ON COALESCE(l.user_id, r.user_id) = s.user_id AND COALESCE(l.book_id, r.book_id) = s.book_id
    ON CONFLICT (user_id, book_id) DO UPDATE SET
        liked = EXCLUDED.liked,
        rating = EXCLUDED.rating,
        completion_percent = EXCLUDED.completion_percent,
        interaction_count = EXCLUDED.interaction_count,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION internal.refresh_search_document(target_book_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    book_record RECORD;
    feature_record RECORD;
BEGIN
    SELECT * INTO book_record FROM public.books WHERE id = target_book_id;
    
    IF NOT FOUND THEN
        DELETE FROM public.discovery_search_documents WHERE book_id = target_book_id;
        RETURN;
    END IF;

    SELECT * INTO feature_record FROM public.discovery_book_features WHERE book_id = target_book_id;

    INSERT INTO public.discovery_search_documents (
        book_id, title, subtitle, authors, categories, language, description, keywords,
        publication_year, availability_status, formats_available, is_featured, is_public,
        average_rating, rating_count, popularity_score, updated_at
    ) VALUES (
        book_record.id, book_record.title, book_record.subtitle, book_record.authors,
        book_record.categories, book_record.language, book_record.description, book_record.keywords,
        book_record.publication_year, book_record.availability_status, book_record.formats_available,
        COALESCE(book_record.is_featured, false), COALESCE(book_record.is_public, true),
        COALESCE(feature_record.average_rating, 0.0), COALESCE(feature_record.rating_count, 0),
        COALESCE(feature_record.popularity_score, 0.0), NOW()
    )
    ON CONFLICT (book_id) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        authors = EXCLUDED.authors,
        categories = EXCLUDED.categories,
        language = EXCLUDED.language,
        description = EXCLUDED.description,
        keywords = EXCLUDED.keywords,
        publication_year = EXCLUDED.publication_year,
        availability_status = EXCLUDED.availability_status,
        formats_available = EXCLUDED.formats_available,
        is_featured = EXCLUDED.is_featured,
        is_public = EXCLUDED.is_public,
        average_rating = EXCLUDED.average_rating,
        rating_count = EXCLUDED.rating_count,
        popularity_score = EXCLUDED.popularity_score,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION internal.sanitize_account_logs(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        id, action, actor_id, ip_address, user_agent, correlation_id, metadata, created_at
    ) VALUES (
        gen_random_uuid(), 'ACCOUNT_DELETED', target_user_id, NULL, NULL, NULL,
        jsonb_build_object('reason', 'user_requested_deletion', 'target_user_id', target_user_id),
        NOW()
    );

    UPDATE public.audit_logs
    SET ip_address = NULL, user_agent = NULL
    WHERE actor_id = target_user_id;
END;
$$;

-- 4. Grant capability execution privileges to bookgarden_worker role
GRANT EXECUTE ON FUNCTION internal.claim_outbox_events(integer) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.cleanup_expired_rate_limits() TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.refresh_category_document(text) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.refresh_recommendation_signals(uuid) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.refresh_search_document(uuid) TO bookgarden_worker;
GRANT EXECUTE ON FUNCTION internal.sanitize_account_logs(uuid) TO bookgarden_worker;
