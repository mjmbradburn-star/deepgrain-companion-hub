-- Drop unused reports.pdf_path column.
-- PDFs are no longer stored by path; signed URLs are generated on demand
-- inside the email-report-pdf edge function (private bucket, 7-day TTL).
-- Removing the column eliminates the temptation to persist a long-lived
-- (potentially public) URL or path that bypasses owner checks.

-- The existing storage.objects RLS policy "Owners can read their report pdfs"
-- references rep.pdf_path; recreate it to match by the deterministic
-- {slug}/aioi-report.pdf object name instead.
DROP POLICY IF EXISTS "Owners can read their report pdfs" ON storage.objects;

ALTER TABLE public.reports DROP COLUMN IF EXISTS pdf_path;

CREATE POLICY "Owners can read their report pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.respondents r
    WHERE r.user_id = auth.uid()
      AND storage.objects.name = r.slug || '/aioi-report.pdf'
  )
);