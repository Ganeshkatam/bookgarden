-- Security-Preserving Recovery Procedure: 20261022040000_harden_catalog_rls_visibility_security_preserving_recovery.sql
-- Description: Production recovery script that preserves publication isolation (DB-INV-01 / DB-INV-02).
--
-- IMPORTANT:
-- Unlike the baseline rollback script, this recovery script NEVER restores SELECT USING (true).
-- It keeps unpublished (draft) and archived books isolated from public/anonymous access,
-- while falling back to direct role-based checks for administrators in case the permission join fails.

-- 1. Reset books policies with publication protection
DROP POLICY IF EXISTS "books_select_policy" ON public.books;
DROP POLICY IF EXISTS "books_insert_admin" ON public.books;
DROP POLICY IF EXISTS "books_update_admin" ON public.books;
DROP POLICY IF EXISTS "books_delete_admin" ON public.books;
DROP POLICY IF EXISTS "books_public_select" ON public.books;

CREATE POLICY "books_select_policy_recovery"
  ON public.books FOR SELECT
  TO public
  USING (
    (is_published = true AND is_archived = false)
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );

CREATE POLICY "books_admin_all_recovery"
  ON public.books FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('admin', 'curator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('admin', 'curator')
    )
  );

-- 2. Reset book_files policies with associated book protection
DROP POLICY IF EXISTS "book_files_select_policy" ON public.book_files;
DROP POLICY IF EXISTS "book_files_insert_admin" ON public.book_files;
DROP POLICY IF EXISTS "book_files_update_admin" ON public.book_files;
DROP POLICY IF EXISTS "book_files_delete_admin" ON public.book_files;
DROP POLICY IF EXISTS "Public read for book_files" ON public.book_files;

CREATE POLICY "book_files_select_policy_recovery"
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
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );

CREATE POLICY "book_files_admin_all_recovery"
  ON public.book_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('admin', 'curator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('admin', 'curator')
    )
  );

-- 3. Reset discovery search documents with is_public protection
DROP POLICY IF EXISTS "discovery_search_documents_select_policy" ON public.discovery_search_documents;
DROP POLICY IF EXISTS "discovery_search_documents_public_select" ON public.discovery_search_documents;

CREATE POLICY "discovery_search_documents_select_recovery"
  ON public.discovery_search_documents FOR SELECT
  TO public
  USING (
    is_public = true
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );

-- 4. Reset relationship tables with associated book protection
DROP POLICY IF EXISTS "book_authors_select_policy" ON public.book_authors;
DROP POLICY IF EXISTS "book_genres_select_policy" ON public.book_genres;
DROP POLICY IF EXISTS "book_subjects_select_policy" ON public.book_subjects;
DROP POLICY IF EXISTS "Public read access for book_authors" ON public.book_authors;
DROP POLICY IF EXISTS "Public read access for book_genres" ON public.book_genres;
DROP POLICY IF EXISTS "Public read access for book_subjects" ON public.book_subjects;

CREATE POLICY "book_authors_select_recovery"
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
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );

CREATE POLICY "book_genres_select_recovery"
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
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );

CREATE POLICY "book_subjects_select_recovery"
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
        WHERE ur.user_id = (SELECT auth.uid())
          AND ur.role IN ('admin', 'curator')
      )
    )
  );
