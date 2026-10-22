-- Migration: 20261022020000_harden_storage_authorization.sql
-- Description: Hardens storage RLS policies, isolates catalog buckets to admin/ingestion,
-- and configures bucket limits for avatars, shelves, book-covers, and book-pdfs.

-- 1. Update bucket limits and allowed MIME types in storage.buckets
UPDATE storage.buckets
SET 
  file_size_limit = 2097152, -- 2MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'avatars';

UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
WHERE id = 'shelves';

UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'book-covers';

UPDATE storage.buckets
SET 
  file_size_limit = 104857600, -- 100MB
  allowed_mime_types = ARRAY['application/pdf', 'application/epub+zip']::text[]
WHERE id = 'book-pdfs';

-- 2. Drop existing permissive and insecure policies on storage.objects
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to book-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to shelves" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update shelves" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete shelves" ON storage.objects;

-- 3. User Asset Buckets: Strict auth.uid() owner-prefix policies
-- AVATARS
CREATE POLICY "Authenticated users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

CREATE POLICY "Authenticated users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

CREATE POLICY "Authenticated users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

-- SHELVES
CREATE POLICY "Authenticated users can upload own shelf image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shelves'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

CREATE POLICY "Authenticated users can update own shelf image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'shelves'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

CREATE POLICY "Authenticated users can delete own shelf image"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
);

-- 4. Catalog Buckets: Restricted to administrators with ManageBooks permission
-- (Direct service_role / backend ingestion bypasses RLS)

-- BOOK-COVERS
CREATE POLICY "Book covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'book-covers');

CREATE POLICY "Admins can upload to book-covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-covers'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);

CREATE POLICY "Admins can update book-covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-covers'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
)
WITH CHECK (
  bucket_id = 'book-covers'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);

CREATE POLICY "Admins can delete book-covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-covers'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);

-- BOOK-PDFS
CREATE POLICY "Admins can upload to book-pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);

CREATE POLICY "Admins can update book-pdfs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
)
WITH CHECK (
  bucket_id = 'book-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);

CREATE POLICY "Admins can delete book-pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = (SELECT auth.uid())
      AND rp.permission = 'ManageBooks'
  )
);
