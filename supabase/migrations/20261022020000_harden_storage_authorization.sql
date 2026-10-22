-- Migration: 20261022020000_harden_storage_authorization.sql
-- Description: Hardens storage RLS policies, isolates catalog buckets to admin/ingestion,
-- and configures bucket limits for avatars, shelves, user-images, book-covers, and book-pdfs.
--
-- Security model:
--   INSERT:  WITH CHECK requires the caller's auth.uid() as the first path segment.
--            No owner/owner_id fallback: ownership is assigned by Storage after insertion,
--            so it cannot be used to authorize a new row's path.
--   UPDATE:  USING authorises access to the existing row via owner/owner_id.
--            WITH CHECK enforces the new row's name satisfies the caller's prefix.
--   DELETE:  USING requires the caller's auth.uid() path prefix (deterministic; owner
--            metadata can be stale for legacy objects).

-- ============================================================================
-- 1. Bucket configuration: ensure all buckets exist with strict limits and MIME types
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shelves',
  'shelves',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-images',
  'user-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-pdfs',
  'book-pdfs',
  false,
  104857600, -- 100 MB
  ARRAY['application/pdf', 'application/epub+zip']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/pdf', 'application/epub+zip']::text[];

-- ============================================================================
-- 2. Drop ALL existing permissive/insecure policies on storage.objects
--    These are cumulative from every prior migration that touched Storage.
--    Permissive RLS policies combine with OR, so a single remaining broad
--    policy undermines every restriction added below.
-- ============================================================================

-- Original avatar policies (20260717, 20260902)
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- Original shelf policies (20260902000000)
DROP POLICY IF EXISTS "Authenticated users can upload to shelves" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update shelves" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete shelves" ON storage.objects;
DROP POLICY IF EXISTS "Shelf images are publicly accessible" ON storage.objects;

-- Original user-images policies (20260823000004)
DROP POLICY IF EXISTS "Authenticated users can upload to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update user-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete user-images" ON storage.objects;
DROP POLICY IF EXISTS "User images are publicly accessible" ON storage.objects;

-- Original catalog policies (if any broad ones exist)
DROP POLICY IF EXISTS "Authenticated upload to book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to book-pdfs" ON storage.objects;

-- Policies created by the 20261022010000 hardening migration (also flawed: OR fallback)
DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own shelf image" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own shelf image" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own shelf image" ON storage.objects;

-- Catalog policies from any earlier version of this migration
DROP POLICY IF EXISTS "Book covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to book-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update book-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete book-pdfs" ON storage.objects;

-- ============================================================================
-- 3. User asset buckets: strict auth.uid() path-prefix policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- AVATARS
-- ---------------------------------------------------------------------------

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- INSERT: path prefix is the sole gate; owner metadata does not exist yet.
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- UPDATE: USING authorises access to the existing row via ownership.
--         WITH CHECK enforces the new name stays under the caller's prefix.
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- DELETE: path prefix enforced; also allows verified owners to delete legacy un-prefixed files
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      cardinality(storage.foldername(name)) = 0
      AND (
        owner = (SELECT auth.uid())
        OR owner_id = (SELECT auth.uid())::text
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- SHELVES
-- ---------------------------------------------------------------------------

CREATE POLICY "shelves_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shelves');

CREATE POLICY "shelves_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shelves'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "shelves_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'shelves'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "shelves_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      cardinality(storage.foldername(name)) = 0
      AND (
        owner = (SELECT auth.uid())
        OR owner_id = (SELECT auth.uid())::text
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- USER-IMAGES
-- ---------------------------------------------------------------------------

CREATE POLICY "user_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-images');

CREATE POLICY "user_images_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "user_images_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "user_images_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ============================================================================
-- 4. Catalog buckets: restricted to administrators with ManageBooks permission
--    (Direct service_role / backend ingestion bypasses RLS entirely)
-- ============================================================================

-- ManageBooks is granted only to 'admin' and 'curator' roles in
-- role_permissions (seeded by 20260828020000_repair_authorization_foundation).
-- user_roles has RLS restricting writes to service_role; ordinary authenticated
-- users cannot self-assign roles.

-- ---------------------------------------------------------------------------
-- BOOK-COVERS
-- ---------------------------------------------------------------------------

CREATE POLICY "book_covers_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_insert_admin"
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

CREATE POLICY "book_covers_update_admin"
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

CREATE POLICY "book_covers_delete_admin"
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

-- ---------------------------------------------------------------------------
-- BOOK-PDFS
-- ---------------------------------------------------------------------------

CREATE POLICY "book_pdfs_insert_admin"
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

CREATE POLICY "book_pdfs_update_admin"
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

CREATE POLICY "book_pdfs_delete_admin"
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
