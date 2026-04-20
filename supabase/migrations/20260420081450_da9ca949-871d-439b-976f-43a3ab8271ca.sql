-- 1) Function column on respondents (nullable; constrained to known slugs)
ALTER TABLE public.respondents
  ADD COLUMN IF NOT EXISTS function text;

ALTER TABLE public.respondents
  DROP CONSTRAINT IF EXISTS respondents_function_check;

ALTER TABLE public.respondents
  ADD CONSTRAINT respondents_function_check
  CHECK (function IS NULL OR function IN ('sales','marketing','engineering-product','people-hr','finance','ops-cs'));

-- 2) Question variants table — alternative wording per function
CREATE TABLE IF NOT EXISTS public.question_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  function text NOT NULL,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, function),
  CHECK (function IN ('sales','marketing','engineering-product','people-hr','finance','ops-cs'))
);

ALTER TABLE public.question_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Question variants are public" ON public.question_variants;
CREATE POLICY "Question variants are public"
  ON public.question_variants
  FOR SELECT
  TO public
  USING (true);

CREATE TRIGGER update_question_variants_updated_at
  BEFORE UPDATE ON public.question_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Deactivate previous function-level questions (we'll add the new set via insert)
UPDATE public.questions
SET active = false
WHERE level = 'function';