CREATE POLICY "Owners can upload their report pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.respondents r
    WHERE r.user_id = auth.uid()
      AND storage.objects.name = (r.slug || '/aioi-report.pdf')
  )
);

CREATE POLICY "Owners can update their report pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.respondents r
    WHERE r.user_id = auth.uid()
      AND storage.objects.name = (r.slug || '/aioi-report.pdf')
  )
)
WITH CHECK (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.respondents r
    WHERE r.user_id = auth.uid()
      AND storage.objects.name = (r.slug || '/aioi-report.pdf')
  )
);

CREATE POLICY "Owners can delete their report pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.respondents r
    WHERE r.user_id = auth.uid()
      AND storage.objects.name = (r.slug || '/aioi-report.pdf')
  )
);