-- Migration Rollback: 20261022040000_harden_catalog_rls_visibility_rollback.sql
-- Description: Rollback script for catalog RLS visibility hardening.
-- Scope: Restores permissive public read policies for books, book_files, search documents, and relationships.

-- 1. Drop hardened policies
DROP POLICY IF EXISTS "books_select_policy" ON public.books;
DROP POLICY IF EXISTS "books_insert_admin" ON public.books;
DROP POLICY IF EXISTS "books_update_admin" ON public.books;
DROP POLICY IF EXISTS "books_delete_admin" ON public.books;

DROP POLICY IF EXISTS "book_files_select_policy" ON public.book_files;
DROP POLICY IF EXISTS "book_files_insert_admin" ON public.book_files;
DROP POLICY IF EXISTS "book_files_update_admin" ON public.book_files;
DROP POLICY IF EXISTS "book_files_delete_admin" ON public.book_files;

DROP POLICY IF EXISTS "discovery_search_documents_select_policy" ON public.discovery_search_documents;

DROP POLICY IF EXISTS "book_authors_select_policy" ON public.book_authors;
DROP POLICY IF EXISTS "book_genres_select_policy" ON public.book_genres;
DROP POLICY IF EXISTS "book_subjects_select_policy" ON public.book_subjects;

-- 2. Restore baseline permissive public read policies
CREATE POLICY "books_public_select"
  ON public.books FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read for book_files"
  ON public.book_files FOR SELECT
  TO public
  USING (true);

CREATE POLICY "discovery_search_documents_public_select"
  ON public.discovery_search_documents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for book_authors"
  ON public.book_authors FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for book_genres"
  ON public.book_genres FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for book_subjects"
  ON public.book_subjects FOR SELECT
  TO public
  USING (true);
