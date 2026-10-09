-- Migration: 20261009000000_pr1_event_idempotency_and_deduplication.sql
-- Description: PR1 Event Idempotency and Transactional Deduplication
--
-- 1. Drops the flawed idx_notifications_idempotency unique index on (user_id, event_name, aggregate_id)
--    which improperly collapsed legitimate notifications (e.g., repeated book completions by the same user).
-- 2. Introduces public.create_notification_idempotent RPC:
--    Atomically claims (event_id, handler) in public.processed_events and inserts the notification record
--    in a single database transaction. If the event was already processed by this handler, returns false without inserting.
-- 3. Introduces public.record_analytics_book_completed_idempotent RPC:
--    Atomically claims (event_id, handler) in public.processed_events, records user book completion in
--    public.user_book_completions, and reconciles public.user_statistics.books_completed in a single transaction.
-- 4. Introduces public.record_analytics_pages_read_idempotent RPC:
--    Atomically claims (event_id, handler) in public.processed_events, increments pages_read in
--    public.user_statistics, and updates last_read_date in a single transaction.
--
-- GOVERNANCE: Migration prepared for operator deployment. Do NOT run autonomously against production.

-- ============================================================================
-- 1. NOTIFICATIONS IDEMPOTENCY HARDENING
-- ============================================================================

-- Drop the flawed aggregate-based unique constraint that collapsed distinct re-reads
DROP INDEX IF EXISTS public.idx_notifications_idempotency;

-- Create transactional notification insert with processed_events deduplication
CREATE OR REPLACE FUNCTION public.create_notification_idempotent(
    p_event_id UUID,
    p_handler TEXT,
    p_user_id UUID,
    p_event_name TEXT,
    p_aggregate_id TEXT,
    p_aggregate_type TEXT,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted boolean := true;
BEGIN
    -- 1. Atomically claim this event for this handler if event_id is supplied
    IF p_event_id IS NOT NULL AND p_handler IS NOT NULL THEN
        INSERT INTO public.processed_events (event_id, handler, processed_at)
        VALUES (p_event_id, p_handler, clock_timestamp())
        ON CONFLICT (event_id, handler) DO NOTHING
        RETURNING true INTO v_inserted;

        IF v_inserted IS NOT TRUE THEN
            -- Event already processed by this consumer: no-op without creating duplicate notification
            RETURN false;
        END IF;
    END IF;

    -- 2. Insert notification in the exact same transaction
    INSERT INTO public.notifications (
        user_id,
        event_name,
        aggregate_id,
        aggregate_type,
        type,
        title,
        body,
        metadata
    ) VALUES (
        p_user_id,
        p_event_name,
        p_aggregate_id,
        p_aggregate_type,
        p_type,
        p_title,
        p_body,
        COALESCE(p_metadata, '{}'::jsonb)
    );

    RETURN true;
END;
$$;

-- Privileges for notification creation RPC
REVOKE ALL ON FUNCTION public.create_notification_idempotent(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_idempotent(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role, tomesphere_worker;


-- ============================================================================
-- 2. TRANSACTIONAL ANALYTICS & STATISTICS DEDUPLICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_analytics_book_completed_idempotent(
    p_event_id UUID,
    p_user_id UUID,
    p_book_id UUID,
    p_date DATE,
    p_month VARCHAR,
    p_genre TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted boolean := true;
BEGIN
    -- 1. Atomically claim this event for the analytics book completed consumer
    IF p_event_id IS NOT NULL THEN
        INSERT INTO public.processed_events (event_id, handler, processed_at)
        VALUES (p_event_id, 'analytics.recordBookCompleted', clock_timestamp())
        ON CONFLICT (event_id, handler) DO NOTHING
        RETURNING true INTO v_inserted;

        IF v_inserted IS NOT TRUE THEN
            -- Event already processed: no-op without double-incrementing counters
            RETURN false;
        END IF;
    END IF;

    -- 2. Atomically record user book completion in user_book_completions
    INSERT INTO public.user_book_completions (user_id, book_id, completed_at)
    VALUES (p_user_id, p_book_id, clock_timestamp())
    ON CONFLICT (user_id, book_id) DO NOTHING;

    -- 3. Upsert user_statistics books_completed
    INSERT INTO public.user_statistics (user_id, books_completed, updated_at)
    VALUES (p_user_id, 1, clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET
        books_completed = (
            SELECT COUNT(*)::integer FROM public.user_book_completions WHERE user_id = p_user_id
        ),
        updated_at = clock_timestamp();

    RETURN true;
END;
$$;

-- Privileges for analytics book completed RPC
REVOKE ALL ON FUNCTION public.record_analytics_book_completed_idempotent(UUID, UUID, UUID, DATE, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_analytics_book_completed_idempotent(UUID, UUID, UUID, DATE, VARCHAR, TEXT) TO service_role, tomesphere_worker;


CREATE OR REPLACE FUNCTION public.record_analytics_pages_read_idempotent(
    p_event_id UUID,
    p_user_id UUID,
    p_book_id UUID,
    p_pages INTEGER,
    p_date DATE,
    p_month VARCHAR,
    p_genre TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted boolean := true;
BEGIN
    -- 1. Atomically claim this event for the analytics pages read consumer
    IF p_event_id IS NOT NULL THEN
        INSERT INTO public.processed_events (event_id, handler, processed_at)
        VALUES (p_event_id, 'analytics.recordPagesRead', clock_timestamp())
        ON CONFLICT (event_id, handler) DO NOTHING
        RETURNING true INTO v_inserted;

        IF v_inserted IS NOT TRUE THEN
            -- Event already processed: no-op without double-incrementing counters
            RETURN false;
        END IF;
    END IF;

    -- 2. Upsert user_statistics pages_read
    INSERT INTO public.user_statistics (user_id, pages_read, last_read_date, updated_at)
    VALUES (p_user_id, p_pages, p_date, clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET
        pages_read = COALESCE(public.user_statistics.pages_read, 0) + p_pages,
        last_read_date = GREATEST(COALESCE(public.user_statistics.last_read_date, '1970-01-01'::date), p_date),
        updated_at = clock_timestamp();

    RETURN true;
END;
$$;

-- Privileges for analytics pages read RPC
REVOKE ALL ON FUNCTION public.record_analytics_pages_read_idempotent(UUID, UUID, UUID, INTEGER, DATE, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_analytics_pages_read_idempotent(UUID, UUID, UUID, INTEGER, DATE, VARCHAR, TEXT) TO service_role, tomesphere_worker;
