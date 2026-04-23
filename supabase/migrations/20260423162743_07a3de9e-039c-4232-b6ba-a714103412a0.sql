-- Add an explicit owner-scoped read policy for events so future reads cannot expose all telemetry.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Users can view their own events'
  ) THEN
    CREATE POLICY "Users can view their own events"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Document and enforce the intended respondent posture: no anonymous direct table reads.
-- Public report access is mediated by public.get_report_by_slug(_slug), which returns a limited safe payload.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'respondents'
      AND policyname = 'Anonymous users cannot read respondents directly'
  ) THEN
    CREATE POLICY "Anonymous users cannot read respondents directly"
    ON public.respondents
    FOR SELECT
    TO anon
    USING (false);
  END IF;
END $$;