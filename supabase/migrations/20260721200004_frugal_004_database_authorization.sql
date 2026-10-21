-- Frugal Migration 004: Database Authorization Lockdown
-- Purpose: Revoke execution privileges for all background/infrastructure 
-- capabilities from the public data API roles to prevent abuse.
-- These functions are now executed via the 'internal' schema by 'bookgarden_worker'.

-- Lock down legacy public infrastructure RPCs (until dropped)
REVOKE EXECUTE ON FUNCTION public.claim_outbox_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_category_document(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_recommendation_signals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_search_document(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanitize_account_logs(uuid) FROM PUBLIC, anon, authenticated;

-- For application persistence RPCs (which remain in public but must be secured),
-- ensure anon cannot arbitrarily call mutating functions (force authenticated user).
REVOKE EXECUTE ON FUNCTION public.save_book_action_with_events(text, uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_reader_session_with_events(uuid, uuid, integer, numeric, text, jsonb) FROM PUBLIC, anon;

-- Ensure internal functions remain strictly unexposed
REVOKE EXECUTE ON FUNCTION internal.claim_outbox_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.refresh_category_document(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.refresh_recommendation_signals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.refresh_search_document(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION internal.sanitize_account_logs(uuid) FROM PUBLIC, anon, authenticated;
