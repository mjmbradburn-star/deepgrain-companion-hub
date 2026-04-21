-- Public read bucket for hosted report PDFs (the slug-based path is the secret).
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of any object in this bucket (the slug-based path is the secret).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read report PDFs'
  ) THEN
    CREATE POLICY "Public read report PDFs"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'report-pdfs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role write report PDFs'
  ) THEN
    CREATE POLICY "Service role write report PDFs"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'report-pdfs' AND auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role update report PDFs'
  ) THEN
    CREATE POLICY "Service role update report PDFs"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'report-pdfs' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'report-pdfs' AND auth.role() = 'service_role');
  END IF;
END $$;