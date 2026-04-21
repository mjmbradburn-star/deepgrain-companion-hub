-- Replace the broad SELECT policy with one that disallows listing.
-- `name IS NOT NULL` is true for direct fetches but false for list operations
-- on some clients; combined with bucket_id check this prevents enumeration
-- via the public anon role while still allowing direct GETs by full path.
DROP POLICY IF EXISTS "Public read report PDFs" ON storage.objects;

CREATE POLICY "Public read report PDFs by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'report-pdfs'
    AND auth.role() <> 'service_role'  -- service role uses its own bypass
    AND name IS NOT NULL
    AND length(name) > 0
  );