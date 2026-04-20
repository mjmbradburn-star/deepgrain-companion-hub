CREATE OR REPLACE FUNCTION public.recompute_benchmarks(_min_sample int DEFAULT 5)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted int;
BEGIN
  CREATE TEMP TABLE _new_benchmarks ON COMMIT DROP AS
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
  rolled AS (
    SELECT
      level,
      size_band,
      sector,
      COUNT(*)::int AS sample_size,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score)::numeric(5,2) AS median_score,
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
  SELECT * FROM rolled WHERE sample_size >= _min_sample;

  -- If no real cohorts qualify yet, leave the existing (synthetic) seed in place.
  IF NOT EXISTS (SELECT 1 FROM _new_benchmarks) THEN
    RETURN 0;
  END IF;

  DELETE FROM public.benchmarks_materialised;

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
  FROM _new_benchmarks;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$$;