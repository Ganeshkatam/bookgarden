-- PR 2: Reader & Content Security
-- Transitions book-pdfs storage bucket to private, enforces unique primary files,
-- and normalizes book_files.storage_path from raw public URLs to relative canonical object keys.
-- INVARIANT: Canonical object key grammar must be: <book_id>/<safe_filename>

-- 1. Preflight Stage 1: Validate legacy path shapes
-- Enforces that no records contain directory traversal, backslashes, query parameters,
-- or malformed empty values prior to transformation.
DO $$
DECLARE
  v_invalid_shape_count integer;
BEGIN
  SELECT count(*)
  INTO v_invalid_shape_count
  FROM public.book_files
  WHERE storage_path IS NULL
     OR length(btrim(storage_path)) = 0
     OR storage_path LIKE '%..%'
     OR storage_path LIKE '%\%'
     OR storage_path LIKE '%?%'
     OR storage_path LIKE '%#%';

  IF v_invalid_shape_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % book_files records contain invalid/malformed path shapes', v_invalid_shape_count;
  END IF;
END $$;

-- 2. Preflight Stage 2: Fail-closed check: Ensure only supported formats exist
DO $$
DECLARE
  v_invalid_format_count integer;
BEGIN
  SELECT count(*)
  INTO v_invalid_format_count
  FROM public.book_files
  WHERE format NOT IN ('pdf', 'epub');

  IF v_invalid_format_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % book_files records contain unsupported formats', v_invalid_format_count;
  END IF;
END $$;

-- 3. Preflight Stage 3: Fail-closed check: Ensure any URL-based storage_path specifically targets the book-pdfs bucket
DO $$
DECLARE
  v_external_count integer;
BEGIN
  SELECT count(*)
  INTO v_external_count
  FROM public.book_files
  WHERE (storage_path LIKE 'http://%' OR storage_path LIKE 'https://%')
    AND storage_path NOT LIKE '%/storage/v1/object/public/book-pdfs/%'
    AND storage_path NOT LIKE '%/storage/v1/object/sign/book-pdfs/%';

  IF v_external_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % book_files records reference non-book-pdfs URLs', v_external_count;
  END IF;
END $$;

-- 4. Preflight Stage 4 (CRITICAL GATE): Source object existence certification
-- Verifies that EVERY book_files row has a corresponding object in storage.objects under bucket 'book-pdfs'.
-- Fails closed if any source object is missing.
DO $$
DECLARE
  v_missing_objects_count integer;
BEGIN
  WITH source_mappings AS (
    SELECT
      id,
      book_id,
      storage_path,
      ltrim(
        regexp_replace(
          regexp_replace(
            storage_path,
            '^https?://[^/]+/storage/v1/object/(?:public|sign)/book-pdfs/',
            ''
          ),
          '^book-pdfs/',
          ''
        ),
        '/'
      ) AS source_object_key
    FROM public.book_files
  )
  SELECT count(*)
  INTO v_missing_objects_count
  FROM source_mappings sm
  WHERE NOT EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'book-pdfs'
      AND (
        so.name = sm.source_object_key
        OR so.name = sm.book_id::text || '/' || sm.source_object_key
      )
  );

  IF v_missing_objects_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % book_files records have no corresponding storage object in book-pdfs bucket', v_missing_objects_count;
  END IF;
END $$;

-- 5. Preflight Stage 5: Target object collision certification
-- Detects if any target canonical object name (<book_id>/<filename>) already exists unexpectedly
-- in storage.objects prior to executing renames.
DO $$
DECLARE
  v_collision_count integer;
BEGIN
  WITH pending_renames AS (
    SELECT
      bf.book_id::text || '/' || so.name AS target_name
    FROM storage.objects so
    JOIN public.book_files bf
      ON so.bucket_id = 'book-pdfs'
     AND so.name = ltrim(
           regexp_replace(
             regexp_replace(
               bf.storage_path,
               '^https?://[^/]+/storage/v1/object/(?:public|sign)/book-pdfs/',
               ''
             ),
             '^book-pdfs/',
             ''
           ),
           '/'
         )
    WHERE so.name NOT LIKE (bf.book_id::text || '/%')
  )
  SELECT count(*)
  INTO v_collision_count
  FROM pending_renames pr
  WHERE EXISTS (
    SELECT 1
    FROM storage.objects existing
    WHERE existing.bucket_id = 'book-pdfs'
      AND existing.name = pr.target_name
  );

  IF v_collision_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % storage object rename targets already exist (collision detected)', v_collision_count;
  END IF;
END $$;

-- 6. Transition book-pdfs bucket to private
UPDATE storage.buckets
SET public = false
WHERE id = 'book-pdfs';

-- 7. Environment-agnostic normalization: Strip URL protocols, hostnames, and storage endpoints
UPDATE public.book_files
SET storage_path = regexp_replace(
  storage_path,
  '^https?://[^/]+/storage/v1/object/(?:public|sign)/book-pdfs/',
  ''
)
WHERE storage_path ~* '^https?://[^/]+/storage/v1/object/(?:public|sign)/book-pdfs/';

-- Strip residual bucket prefixes
UPDATE public.book_files
SET storage_path = regexp_replace(storage_path, '^book-pdfs/', '')
WHERE storage_path LIKE 'book-pdfs/%';

-- Strip leading slashes
UPDATE public.book_files
SET storage_path = ltrim(storage_path, '/')
WHERE storage_path LIKE '/%';

-- 8. Canonical path prefixing: Ensure path root matches book_id (<book_id>/<filename>)
UPDATE public.book_files
SET storage_path = book_id::text || '/' || storage_path
WHERE storage_path NOT LIKE (book_id::text || '/%');

-- 9. Synchronize storage.objects flat names to canonical prefixed names
UPDATE storage.objects
SET name = bf.book_id::text || '/' || storage.objects.name
FROM public.book_files bf
WHERE storage.objects.bucket_id = 'book-pdfs'
  AND storage.objects.name NOT LIKE (bf.book_id::text || '/%')
  AND storage.objects.name = split_part(bf.storage_path, '/', 2);

-- 10. Fail-closed check: Verify normalization produced non-empty, non-duplicate canonical paths
DO $$
DECLARE
  v_empty_count integer;
  v_duplicate_count integer;
BEGIN
  SELECT count(*)
  INTO v_empty_count
  FROM public.book_files
  WHERE storage_path IS NULL OR length(btrim(storage_path)) = 0;

  IF v_empty_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % book_files records resolved to empty paths', v_empty_count;
  END IF;

  SELECT count(*)
  INTO v_duplicate_count
  FROM (
    SELECT book_id, storage_path, count(*)
    FROM public.book_files
    GROUP BY book_id, storage_path
    HAVING count(*) > 1
  ) dups;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'PR2 Migration Aborted: % duplicate (book_id, storage_path) collisions detected', v_duplicate_count;
  END IF;
END $$;

-- 11. Add positive canonical grammar check constraint
-- ENFORCES EXACT PARITY WITH APPLICATION CanonicalStorageKey.ts:
-- - First path segment strictly matches the row's book_id (ownership binding)
-- - Second segment consists of safe filename characters and must end with .pdf or .epub
-- - Exactly two path segments (no nested directories)
-- - Disallows double quotes, directory traversal (..), backslashes, queries, and fragments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.book_files'::regclass
      AND conname = 'chk_book_files_storage_path_canonical'
  ) THEN
    ALTER TABLE public.book_files
      ADD CONSTRAINT chk_book_files_storage_path_canonical
      CHECK (
        split_part(storage_path, '/', 1) = book_id::text
        AND split_part(storage_path, '/', 2) ~ '^[a-zA-Z0-9._ ()\-'']+\.(pdf|epub)$'
        AND split_part(storage_path, '/', 3) = ''
        AND storage_path NOT LIKE '%..%'
        AND storage_path NOT LIKE '%\%'
        AND storage_path NOT LIKE '%?%'
        AND storage_path NOT LIKE '%#%'
      );
  END IF;
END $$;

-- 12. Add partial unique index: Exactly one primary content file per book
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_files_primary
  ON public.book_files (book_id)
  WHERE is_primary = true;
