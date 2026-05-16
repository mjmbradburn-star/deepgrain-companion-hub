-- email_captures: records email submissions from the archetype result page.
-- Polled (or directly invoked) by the email-captures dispatcher to send the
-- archetype summary email and mark sent = true.
CREATE TABLE IF NOT EXISTS public.email_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  archetype_index smallint NOT NULL CHECK (archetype_index BETWEEN 0 AND 4),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text NOT NULL DEFAULT 'company',
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  attempts smallint NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_captures_unsent
  ON public.email_captures (created_at)
  WHERE sent = false;

ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;

-- Anon visitors may insert their own capture (the result page is public).
CREATE POLICY "Anyone can submit a capture"
  ON public.email_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- Only service role reads / updates captures.
CREATE POLICY "Service role reads captures"
  ON public.email_captures
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role updates captures"
  ON public.email_captures
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- archetype_results: signed-in respondents' saved archetype outcomes.
CREATE TABLE IF NOT EXISTS public.archetype_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  archetype_index smallint NOT NULL CHECK (archetype_index BETWEEN 0 AND 4),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text NOT NULL DEFAULT 'company',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archetype_results_user
  ON public.archetype_results (user_id, created_at DESC);

ALTER TABLE public.archetype_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own archetype result"
  ON public.archetype_results
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own archetype results"
  ON public.archetype_results
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete their own archetype results"
  ON public.archetype_results
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
