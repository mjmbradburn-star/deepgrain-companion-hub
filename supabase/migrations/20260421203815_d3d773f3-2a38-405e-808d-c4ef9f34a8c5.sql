-- 1. Make report-pdfs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'report-pdfs';

-- 2. Drop any existing public/permissive SELECT policies on storage.objects for report-pdfs
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%report-pdfs%' OR policyname ILIKE '%report pdfs%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 3. Owner-scoped SELECT policy on storage.objects for report-pdfs.
-- File paths are stored as report.pdf_path; we match by checking the object's name
-- against any pdf_path on a report whose respondent belongs to the caller.
CREATE POLICY "Owners can read their report pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.reports rep
    JOIN public.respondents r ON r.id = rep.respondent_id
    WHERE r.user_id = auth.uid()
      AND rep.pdf_path = storage.objects.name
  )
);

-- 4. Tighten respondents INSERT to require a non-null user_id matching the caller.
DROP POLICY IF EXISTS "Own respondent insert" ON public.respondents;
CREATE POLICY "Own respondent insert"
ON public.respondents
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- 5. Events guard trigger: cap name length and payload size.
CREATE OR REPLACE FUNCTION public.guard_events_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR length(NEW.name) = 0 OR length(NEW.name) > 80 THEN
    RAISE EXCEPTION 'events.name must be 1-80 chars';
  END IF;
  IF NEW.payload IS NOT NULL AND octet_length(NEW.payload::text) > 8192 THEN
    RAISE EXCEPTION 'events.payload too large (max 8KB)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_events_insert_trg ON public.events;
CREATE TRIGGER guard_events_insert_trg
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_events_insert();