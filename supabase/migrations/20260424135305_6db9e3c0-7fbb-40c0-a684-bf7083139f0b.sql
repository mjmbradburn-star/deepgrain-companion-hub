-- Phase 1: extend outcomes_library into the Playbook of Moves
-- and add cache columns to reports for the Voice Wrapper output.

-- 1. Add Move columns to outcomes_library (additive, all nullable or defaulted)
ALTER TABLE public.outcomes_library
  ADD COLUMN IF NOT EXISTS lens TEXT NOT NULL DEFAULT 'organisational'
    CHECK (lens IN ('individual', 'functional', 'organisational')),
  ADD COLUMN IF NOT EXISTS tier_band TEXT
    CHECK (tier_band IN ('low', 'mid', 'high')),
  ADD COLUMN IF NOT EXISTS function TEXT,
  ADD COLUMN IF NOT EXISTS size_bands TEXT[],
  ADD COLUMN IF NOT EXISTS why_matters TEXT,
  ADD COLUMN IF NOT EXISTS what_to_do TEXT,
  ADD COLUMN IF NOT EXISTS how_to_know TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS cta_type TEXT
    CHECK (cta_type IS NULL OR cta_type IN ('book_call', 'try_tool', 'read_more')),
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Backfill tier_band from existing applies_to_tier on legacy rows
UPDATE public.outcomes_library
SET tier_band = CASE
  WHEN applies_to_tier <= 1 THEN 'low'
  WHEN applies_to_tier <= 3 THEN 'mid'
  ELSE 'high'
END
WHERE tier_band IS NULL;

-- 3. Indexes for the Selection Engine lookup path
CREATE INDEX IF NOT EXISTS idx_outcomes_lookup
  ON public.outcomes_library (lens, pillar, tier_band, function, active);
CREATE INDEX IF NOT EXISTS idx_outcomes_tags
  ON public.outcomes_library USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_outcomes_size_bands
  ON public.outcomes_library USING GIN (size_bands);

-- 4. Reports: cache the Voice Wrapper output and the audit trail of selected moves
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS recommendations JSONB,
  ADD COLUMN IF NOT EXISTS move_ids UUID[];

COMMENT ON COLUMN public.outcomes_library.lens IS 'Playbook lens: individual | functional | organisational';
COMMENT ON COLUMN public.outcomes_library.tier_band IS 'Tier band the move applies to: low (0-1) | mid (2-3) | high (4-5)';
COMMENT ON COLUMN public.outcomes_library.size_bands IS 'Org size bands this move applies to (S/M1/M2/M3/L1/L2/XL); NULL = all sizes';
COMMENT ON COLUMN public.reports.recommendations IS 'Cached Voice Wrapper JSON output for this respondent';
COMMENT ON COLUMN public.reports.move_ids IS 'Ordered list of outcomes_library IDs the Selection Engine picked';