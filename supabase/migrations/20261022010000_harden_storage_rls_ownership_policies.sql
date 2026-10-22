-- Migration: Harden storage RLS ownership policies for avatars, shelves, and user-images
-- Ensures authenticated users can only update or delete storage objects that they own.

-- 1. Avatars bucket: update and delete policies
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
  )
);

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
  )
);

-- 2. Shelves bucket: update and delete policies
DROP POLICY IF EXISTS "Authenticated users can delete shelves" ON storage.objects;
CREATE POLICY "Authenticated users can delete shelves"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
  )
);

DROP POLICY IF EXISTS "Authenticated users can update shelves" ON storage.objects;
CREATE POLICY "Authenticated users can update shelves"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shelves'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
  )
);

-- 3. User-images bucket: update and delete policies
DROP POLICY IF EXISTS "Authenticated users can delete user-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete user-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
    OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Authenticated users can update user-images" ON storage.objects;
CREATE POLICY "Authenticated users can update user-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT auth.uid()::text) = owner_id
    OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
);
