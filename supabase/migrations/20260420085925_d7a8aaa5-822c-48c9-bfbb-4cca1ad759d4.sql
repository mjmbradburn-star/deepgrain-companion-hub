-- Replace authenticated-only insert policy with one that also accepts anon
-- telemetry (user_id must be NULL for anon, or match auth.uid() if signed in).
DROP POLICY IF EXISTS "Authenticated can log events" ON public.events;

CREATE POLICY "Anyone can log events"
ON public.events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (user_id IS NULL)
  OR (user_id = auth.uid())
);