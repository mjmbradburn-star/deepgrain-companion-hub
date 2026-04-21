-- ─────────────────────────────────────────────────────────────────────────
-- 1. Add the new enum values (Postgres requires this before backfill)
--    Dormant, Integrated, AI-Native already exist.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TYPE public.maturity_tier ADD VALUE IF NOT EXISTS 'Exploring';
ALTER TYPE public.maturity_tier ADD VALUE IF NOT EXISTS 'Deployed';
ALTER TYPE public.maturity_tier ADD VALUE IF NOT EXISTS 'Leveraged';

-- New enum values must be committed before they can be used in UPDATE/DML.
COMMIT;
BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Backfill existing reports.overall_tier using the mapping table:
--      Reactive     → Dormant
--      Exploratory  → Exploring
--      Operational  → Deployed
--    (Dormant, Integrated, AI-Native unchanged)
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.reports
SET overall_tier = 'Dormant'::public.maturity_tier
WHERE overall_tier::text = 'Reactive';

UPDATE public.reports
SET overall_tier = 'Exploring'::public.maturity_tier
WHERE overall_tier::text = 'Exploratory';

UPDATE public.reports
SET overall_tier = 'Deployed'::public.maturity_tier
WHERE overall_tier::text = 'Operational';

-- Also rewrite stored JSON labels inside pillar_tiers and hotspots so
-- the report-by-slug RPC returns consistent tier names.
UPDATE public.reports
SET pillar_tiers = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value->>'label' = 'Reactive'    THEN jsonb_set(value, '{label}', '"Dormant"'::jsonb)
      WHEN value->>'label' = 'Exploratory' THEN jsonb_set(value, '{label}', '"Exploring"'::jsonb)
      WHEN value->>'label' = 'Operational' THEN jsonb_set(value, '{label}', '"Deployed"'::jsonb)
      ELSE value
    END
  )
  FROM jsonb_each(pillar_tiers)
)
WHERE pillar_tiers IS NOT NULL;

UPDATE public.reports
SET hotspots = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'tierLabel' = 'Reactive'    THEN jsonb_set(elem, '{tierLabel}', '"Dormant"'::jsonb)
      WHEN elem->>'tierLabel' = 'Exploratory' THEN jsonb_set(elem, '{tierLabel}', '"Exploring"'::jsonb)
      WHEN elem->>'tierLabel' = 'Operational' THEN jsonb_set(elem, '{tierLabel}', '"Deployed"'::jsonb)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(hotspots) elem
)
WHERE hotspots IS NOT NULL AND jsonb_typeof(hotspots) = 'array';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Drop the old enum values by rebuilding the type.
--    Postgres has no DROP VALUE — we have to recreate the enum.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TYPE public.maturity_tier RENAME TO maturity_tier_old;

CREATE TYPE public.maturity_tier AS ENUM (
  'Dormant',
  'Exploring',
  'Deployed',
  'Integrated',
  'Leveraged',
  'AI-Native'
);

ALTER TABLE public.reports
  ALTER COLUMN overall_tier TYPE public.maturity_tier
  USING overall_tier::text::public.maturity_tier;

DROP TYPE public.maturity_tier_old;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Public assessment count for the homepage counter.
--    SECURITY DEFINER so anon can read the count without exposing
--    individual respondent rows (RLS still blocks row-level reads).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_assessment_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::int
  FROM public.respondents
  WHERE submitted_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_count() TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Recompute benchmarks so the materialised view reflects the new
--    tier names embedded in pillar_medians (label fields).
-- ─────────────────────────────────────────────────────────────────────────
SELECT public.recompute_benchmarks(5);
