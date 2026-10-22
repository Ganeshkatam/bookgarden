-- Migration: 20261022040000_harden_catalog_rls_visibility.sql
-- Description: Hardens catalog Row Level Security (RLS) policies by eliminating broad
-- permissive SELECT USING (true) policies that override visibility restrictions via OR logic.
--
-- Security model:
--   1. Public (anonymous and ordinary authenticated) callers may only query published, unarchived
--      books (is_published = true AND is_archived = false).
--   2. Digital binary format records in public.book_files are only visible to the public if the
--      associated book is published and unarchived.
--   3. Search projections in public.discovery_search_documents are only visible if is_public = true.
--   4. Catalog relationship tables (book_authors, book_genres, book_subjects) are only visible
--      if the associated book is published and unarchived.
--   5. Administrators with the 'ManageBooks' permission (admin/curator roles) retain full read/write access.
--   6. Privileged backend ingestion (service_role) retains full access via BYPASSRLS.

-- ============================================================================
-- 1. DROP EXISTING PERMISSIVE / BROAD POLICIES
--    PostgreSQL combines permissive policies with OR logic; all broad policies
--    must be dropped to eliminate unauthenticated data leakage.
-- ============================================================================

-- Drop broad policies on public.books
DROP POLICY IF EXISTS "books_public_select" ON public.books;
DROP POLICY IF EXISTS "Allow public read access" ON public.books;
DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;
DROP POLICY IF EXISTS "Public can read books" ON public.books;
DROP POLICY IF EXISTS "books_select_policy" ON public.books;

-- Drop broad policies on public.book_files
DROP POLICY IF EXISTS "Public read for book_files" ON public.book_files;
DROP POLICY IF EXISTS "book_files_select_policy" ON public.book_files;

-- Drop broad policies on public.discovery_search_documents
DROP POLICY IF EXISTS "discovery_search_documents_public_select" ON public.discovery_search_documents;
DROP POLICY IF EXISTS "Anyone can read search documents" ON public.discovery_search_documents;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.discovery_search_documents;
DROP POLICY IF EXISTS "discovery_search_documents_select_policy" ON public.discovery_search_documents;

-- Drop broad policies on relationship tables
DROP POLICY IF EXISTS "Public read access for book_authors" ON public.book_authors;
DROP POLICY IF EXISTS "Public read access for book_genres" ON public.book_genres;
DROP POLICY IF EXISTS "Public read access for book_subjects" ON public.book_subjects;
DROP POLICY IF EXISTS "book_authors_select_policy" ON public.book_authors;
DROP POLICY IF EXISTS "book_genres_select_policy" ON public.book_genres;
DROP POLICY IF EXISTS "book_subjects_select_policy" ON public.book_subjects;

-- ============================================================================
-- 2. HARDENED POLICIES: PUBLIC.BOOKS
-- ============================================================================

-- SELECT: Public sees only published, unarchived books; Admins see all books
CREATE POLICY "books_select_policy"
  ON public.books FOR SELECT
  TO public
  USING (
    (is_published = true AND is_archived = false)
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );

-- INSERT: Restricted to administrators with ManageBooks permission
CREATE POLICY "books_insert_admin"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- UPDATE: Restricted to administrators with ManageBooks permission
CREATE POLICY "books_update_admin"
  ON public.books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- DELETE: Restricted to administrators with ManageBooks permission
CREATE POLICY "books_delete_admin"
  ON public.books FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- ============================================================================
-- 3. HARDENED POLICIES: PUBLIC.BOOK_FILES
-- ============================================================================

-- SELECT: Digital binary metadata visible only for published, unarchived books or admins
CREATE POLICY "book_files_select_policy"
  ON public.book_files FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_files.book_id
        AND b.is_published = true
        AND b.is_archived = false
    )
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );

-- INSERT: Restricted to administrators with ManageBooks permission
CREATE POLICY "book_files_insert_admin"
  ON public.book_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- UPDATE: Restricted to administrators with ManageBooks permission
CREATE POLICY "book_files_update_admin"
  ON public.book_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- DELETE: Restricted to administrators with ManageBooks permission
CREATE POLICY "book_files_delete_admin"
  ON public.book_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = (SELECT auth.uid())
        AND rp.permission = 'ManageBooks'
    )
  );

-- ============================================================================
-- 4. HARDENED POLICIES: PUBLIC.DISCOVERY_SEARCH_DOCUMENTS
-- ============================================================================

CREATE POLICY "discovery_search_documents_select_policy"
  ON public.discovery_search_documents FOR SELECT
  TO public
  USING (
    is_public = true
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );

-- ============================================================================
-- 5. HARDENED POLICIES: RELATIONSHIP TABLES
-- ============================================================================

CREATE POLICY "book_authors_select_policy"
  ON public.book_authors FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_authors.book_id
        AND b.is_published = true
        AND b.is_archived = false
    )
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );

CREATE POLICY "book_genres_select_policy"
  ON public.book_genres FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_genres.book_id
        AND b.is_published = true
        AND b.is_archived = false
    )
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );

CREATE POLICY "book_subjects_select_policy"
  ON public.book_subjects FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_subjects.book_id
        AND b.is_published = true
        AND b.is_archived = false
    )
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = (SELECT auth.uid())
          AND rp.permission = 'ManageBooks'
      )
    )
  );
