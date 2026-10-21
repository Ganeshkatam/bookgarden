-- Grant INSERT privilege on notifications to the bookgarden_worker role.
-- The worker is trusted server-side infrastructure that creates notification
-- rows in response to domain events processed via the outbox relay.
-- PostgreSQL requires both the table-level privilege AND an applicable RLS
-- policy for DML operations when RLS is enabled.

GRANT INSERT ON TABLE public.notifications TO bookgarden_worker;

CREATE POLICY "Worker can insert notifications"
    ON public.notifications FOR INSERT
    TO bookgarden_worker
    WITH CHECK (true);
