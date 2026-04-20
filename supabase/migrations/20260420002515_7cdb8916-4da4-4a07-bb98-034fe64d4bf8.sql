-- Enums
CREATE TYPE public.assessment_level AS ENUM ('company', 'function', 'individual');
CREATE TYPE public.maturity_tier AS ENUM ('Dormant', 'Reactive', 'Exploratory', 'Operational', 'Integrated', 'AI-Native');

-- Shared updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Slug helper: 12-char URL-safe slug derived from a uuid
CREATE OR REPLACE FUNCTION public.gen_slug()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

-- questions
CREATE TABLE public.questions (
  id          TEXT PRIMARY KEY,
  level       public.assessment_level NOT NULL,
  pillar      SMALLINT NOT NULL CHECK (pillar BETWEEN 1 AND 8),
  position    SMALLINT NOT NULL,
  prompt      TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_level_position ON public.questions(level, position);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are public" ON public.questions FOR SELECT USING (active);
CREATE TRIGGER trg_questions_updated BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- question_options
CREATE TABLE public.question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tier        SMALLINT NOT NULL CHECK (tier BETWEEN 0 AND 5),
  label       TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, tier)
);
CREATE INDEX idx_options_question ON public.question_options(question_id);
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Question options are public" ON public.question_options FOR SELECT USING (true);

-- respondents
CREATE TABLE public.respondents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL UNIQUE DEFAULT public.gen_slug(),
  level             public.assessment_level NOT NULL,
  role              TEXT,
  org_size          TEXT,
  pain              TEXT,
  sector            TEXT,
  consent_benchmark BOOLEAN NOT NULL DEFAULT FALSE,
  consent_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_respondents_user ON public.respondents(user_id);
CREATE INDEX idx_respondents_level ON public.respondents(level);
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own respondent select" ON public.respondents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own respondent insert" ON public.respondents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own respondent update" ON public.respondents
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_respondents_updated BEFORE UPDATE ON public.respondents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper: is the respondent owned by the caller?
CREATE OR REPLACE FUNCTION public.is_my_respondent(_respondent_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.respondents WHERE id = _respondent_id AND user_id = auth.uid()
  );
$$;

-- responses
CREATE TABLE public.responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id UUID NOT NULL REFERENCES public.respondents(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tier          SMALLINT NOT NULL CHECK (tier BETWEEN 0 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(respondent_id, question_id)
);
CREATE INDEX idx_responses_respondent ON public.responses(respondent_id);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own responses select" ON public.responses
  FOR SELECT TO authenticated USING (public.is_my_respondent(respondent_id));
CREATE POLICY "Own responses insert" ON public.responses
  FOR INSERT TO authenticated WITH CHECK (public.is_my_respondent(respondent_id));
CREATE POLICY "Own responses update" ON public.responses
  FOR UPDATE TO authenticated USING (public.is_my_respondent(respondent_id))
  WITH CHECK (public.is_my_respondent(respondent_id));
CREATE TRIGGER trg_responses_updated BEFORE UPDATE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reports
CREATE TABLE public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id   UUID NOT NULL UNIQUE REFERENCES public.respondents(id) ON DELETE CASCADE,
  aioi_score      SMALLINT,
  overall_tier    public.maturity_tier,
  pillar_tiers    JSONB,
  hotspots        JSONB,
  diagnosis       TEXT,
  plan            JSONB,
  claude_payload  JSONB,
  pdf_path        TEXT,
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_respondent ON public.reports(respondent_id);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own report select" ON public.reports
  FOR SELECT TO authenticated USING (public.is_my_respondent(respondent_id));
-- writes happen via service role in edge functions; no client write policies.
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- outcomes_library
CREATE TABLE public.outcomes_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar          SMALLINT NOT NULL CHECK (pillar BETWEEN 1 AND 8),
  applies_to_tier SMALLINT NOT NULL CHECK (applies_to_tier BETWEEN 0 AND 5),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  effort          SMALLINT CHECK (effort BETWEEN 1 AND 5),
  impact          SMALLINT CHECK (impact BETWEEN 1 AND 5),
  time_to_value   TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outcomes_pillar_tier ON public.outcomes_library(pillar, applies_to_tier);
ALTER TABLE public.outcomes_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Outcomes are public" ON public.outcomes_library FOR SELECT USING (active);
CREATE TRIGGER trg_outcomes_updated BEFORE UPDATE ON public.outcomes_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- benchmarks_materialised
CREATE TABLE public.benchmarks_materialised (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level          public.assessment_level NOT NULL,
  size_band      TEXT,
  sector         TEXT,
  sample_size    INTEGER NOT NULL DEFAULT 0,
  median_score   NUMERIC(5,2),
  pillar_medians JSONB,
  refreshed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(level, size_band, sector)
);
ALTER TABLE public.benchmarks_materialised ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Benchmarks are public" ON public.benchmarks_materialised FOR SELECT USING (true);

-- events (append-only)
CREATE TABLE public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_name_created ON public.events(name, created_at DESC);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can log events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());