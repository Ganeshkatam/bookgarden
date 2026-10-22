-- Migration Rollback: 20261022020000_harden_storage_authorization_rollback.sql
-- Description: Baseline rollback script for storage authorization hardening.
-- WARNING: DO NOT EXECUTE IN PRODUCTION AS WRITTEN.
-- This script restores legacy permissive policies (including unauthenticated avatar uploads
-- and un-prefixed bucket writes). In production, prefer fix-forward or a targeted corrective migration.

-- 1. Drop hardened storage policies
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

DROP POLICY IF EXISTS "shelves_select_public" ON storage.objects;
DROP POLICY IF EXISTS "shelves_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "shelves_update_own" ON storage.objects;
DROP POLICY IF EXISTS "shelves_delete_own" ON storage.objects;

DROP POLICY IF EXISTS "user_images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "user_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_images_update_own" ON storage.objects;
DROP POLICY IF EXISTS "user_images_delete_own" ON storage.objects;

DROP POLICY IF EXISTS "book_covers_select_public" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_delete_admin" ON storage.objects;

DROP POLICY IF EXISTS "book_pdfs_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "book_pdfs_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "book_pdfs_delete_admin" ON storage.objects;

-- 2. Restore baseline policies
CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner = auth.uid() OR owner_id = (auth.uid())::text)
);

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner = auth.uid() OR owner_id = (auth.uid())::text)
);

CREATE POLICY "Authenticated users can upload to shelves"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shelves');

CREATE POLICY "Shelf images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shelves');

CREATE POLICY "Authenticated users can update shelves"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (owner = auth.uid() OR owner_id = (auth.uid())::text)
);

CREATE POLICY "Authenticated users can delete shelves"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (owner = auth.uid() OR owner_id = (auth.uid())::text)
);

CREATE POLICY "Authenticated upload to book-covers"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'book-covers'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated upload to book-pdfs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'book-pdfs'
  AND auth.role() = 'authenticated'
);
