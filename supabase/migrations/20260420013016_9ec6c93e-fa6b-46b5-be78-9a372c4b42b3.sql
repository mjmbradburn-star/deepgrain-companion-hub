-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: normalize free-text org_size to compact size_band used by benchmarks
CREATE OR REPLACE FUNCTION public.normalize_size_band(_org_size text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _org_size IS NULL THEN NULL
    WHEN _org_size ILIKE 'just me%'
      OR _org_size ILIKE '2–10%' OR _org_size ILIKE '2-10%'
      OR _org_size ILIKE '11–50%' OR _org_size ILIKE '11-50%'
      OR _org_size ILIKE '1–50%' OR _org_size ILIKE '1-50%'
      THEN '1–50'
    WHEN _org_size ILIKE '51–250%' OR _org_size ILIKE '51-250%'
      THEN '51–250'
    WHEN _org_size ILIKE '251%'
      THEN '251–1k'
    WHEN _org_size ILIKE '1,000+%' OR _org_size ILIKE '1000+%' OR _org_size ILIKE '1k+%'
      THEN '1k+'
    ELSE NULL
  END;
$$;

-- Recompute benchmarks_materialised from real, scored reports.
-- Min sample size = 5. Cohorts emitted at every (level, size_band|NULL, sector|NULL) slice.
CREATE OR REPLACE FUNCTION public.recompute_benchmarks(_min_sample int DEFAULT 5)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted int;
BEGIN
  -- Build a working set of (level, size_band, sector, aioi_score, pillar_tiers)
  WITH base AS (
    SELECT
      r.level::text                              AS level,
      public.normalize_size_band(r.org_size)     AS size_band,
      NULLIF(r.sector, '')                       AS sector,
      rep.aioi_score                             AS score,
      rep.pillar_tiers                           AS pillar_tiers
    FROM public.respondents r
    JOIN public.reports rep ON rep.respondent_id = r.id
    WHERE rep.aioi_score IS NOT NULL
      AND r.consent_benchmark = true
  ),
  -- Generate every (size_band, sector) rollup combination via GROUPING SETS.
  rolled AS (
    SELECT
      level,
      size_band,
      sector,
      COUNT(*)::int                              AS sample_size,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score)::numeric(5,2) AS median_score,
      -- Per-pillar median tier (0..5)
      jsonb_build_object(
        '1', jsonb_build_object('name','Strategy & Mandate',     'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'1'->>'tier')::numeric)::numeric, 1)),
        '2', jsonb_build_object('name','Data Foundations',        'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'2'->>'tier')::numeric)::numeric, 1)),
        '3', jsonb_build_object('name','Tooling & Infrastructure','tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'3'->>'tier')::numeric)::numeric, 1)),
        '4', jsonb_build_object('name','Workflow Integration',    'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'4'->>'tier')::numeric)::numeric, 1)),
        '5', jsonb_build_object('name','Skills & Fluency',        'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'5'->>'tier')::numeric)::numeric, 1)),
        '6', jsonb_build_object('name','Governance & Risk',       'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'6'->>'tier')::numeric)::numeric, 1)),
        '7', jsonb_build_object('name','Measurement & ROI',       'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'7'->>'tier')::numeric)::numeric, 1)),
        '8', jsonb_build_object('name','Culture & Adoption',      'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'8'->>'tier')::numeric)::numeric, 1))
      ) AS pillar_medians
    FROM base
    GROUP BY GROUPING SETS (
      (level),
      (level, size_band),
      (level, sector),
      (level, size_band, sector)
    )
  )
  -- Atomic swap inside a single statement: delete then insert
  , wipe AS (
    DELETE FROM public.benchmarks_materialised RETURNING 1
  )
  INSERT INTO public.benchmarks_materialised
    (level, size_band, sector, sample_size, median_score, pillar_medians, refreshed_at)
  SELECT
    level::assessment_level,
    size_band,
    sector,
    sample_size,
    median_score,
    pillar_medians,
    now()
  FROM rolled, (SELECT count(*) FROM wipe) _w  -- force wipe to evaluate
  WHERE rolled.sample_size >= _min_sample;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$$;

-- Schedule nightly recompute at 02:15 UTC
SELECT cron.unschedule('recompute-benchmarks-nightly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recompute-benchmarks-nightly');

SELECT cron.schedule(
  'recompute-benchmarks-nightly',
  '15 2 * * *',
  $$ SELECT public.recompute_benchmarks(5); $$
);