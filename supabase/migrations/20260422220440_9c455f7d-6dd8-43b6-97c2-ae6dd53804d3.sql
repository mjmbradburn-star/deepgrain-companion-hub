CREATE OR REPLACE FUNCTION public.recompute_benchmarks(_min_sample integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _inserted int;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'permission denied for function recompute_benchmarks';
  END IF;

  CREATE TEMP TABLE _new_benchmarks ON COMMIT DROP AS
  WITH base AS (
    SELECT
      r.level::text AS level,
      public.normalize_size_band(r.org_size) AS size_band,
      CASE
        WHEN NULLIF(r.sector, '') IN ('B2B SaaS', 'Technology', 'Software') THEN 'Tech'
        WHEN NULLIF(r.sector, '') IN ('Financial Services') THEN 'Finance'
        WHEN NULLIF(r.sector, '') IN ('Healthcare & Life Sciences') THEN 'Healthcare'
        WHEN NULLIF(r.sector, '') IN ('Retail & Ecommerce') THEN 'Retail'
        WHEN NULLIF(r.sector, '') IN ('Manufacturing & Supply Chain', 'Industrial') THEN 'Industry'
        WHEN NULLIF(r.sector, '') IN ('Public Sector & Nonprofit') THEN 'Public'
        ELSE NULLIF(r.sector, '')
      END AS sector,
      CASE NULLIF(r.function, '')
        WHEN 'sales' THEN 'Sales'
        WHEN 'marketing' THEN 'Marketing'
        WHEN 'engineering-product' THEN 'Engineering & Product'
        WHEN 'people-hr' THEN 'People & HR'
        WHEN 'finance' THEN 'Finance'
        WHEN 'ops-cs' THEN 'Operations & Supply Chain'
        ELSE NULLIF(r.function, '')
      END AS function,
      CASE NULLIF(r.region, '')
        WHEN 'APAC' THEN 'Asia-Pacific'
        WHEN 'Western Europe' THEN 'Europe'
        WHEN 'Eastern Europe' THEN 'Europe'
        WHEN 'Nordics' THEN 'Europe'
        ELSE NULLIF(r.region, '')
      END AS region,
      rep.aioi_score AS score,
      rep.pillar_tiers AS pillar_tiers
    FROM public.respondents r
    JOIN public.reports rep ON rep.respondent_id = r.id
    WHERE rep.aioi_score IS NOT NULL
      AND r.consent_benchmark = true
      AND rep.benchmark_excluded = false
  ),
  rolled AS (
    SELECT
      level,
      size_band,
      sector,
      function,
      region,
      COUNT(*)::int AS sample_size,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score)::numeric(5,2) AS median_score,
      jsonb_build_object(
        '1', jsonb_build_object('name','Strategy & Mandate',      'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'1'->>'tier')::numeric)::numeric, 1)),
        '2', jsonb_build_object('name','Data Foundations',         'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'2'->>'tier')::numeric)::numeric, 1)),
        '3', jsonb_build_object('name','Tooling & Infrastructure', 'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'3'->>'tier')::numeric)::numeric, 1)),
        '4', jsonb_build_object('name','Workflow Integration',     'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'4'->>'tier')::numeric)::numeric, 1)),
        '5', jsonb_build_object('name','Skills & Fluency',         'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'5'->>'tier')::numeric)::numeric, 1)),
        '6', jsonb_build_object('name','Governance & Risk',        'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'6'->>'tier')::numeric)::numeric, 1)),
        '7', jsonb_build_object('name','Measurement & ROI',        'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'7'->>'tier')::numeric)::numeric, 1)),
        '8', jsonb_build_object('name','Culture & Adoption',       'tier', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (pillar_tiers->'8'->>'tier')::numeric)::numeric, 1))
      ) AS pillar_medians
    FROM base
    GROUP BY GROUPING SETS (
      (level),
      (level, size_band),
      (level, sector),
      (level, function),
      (level, region),
      (level, size_band, sector),
      (level, function, sector),
      (level, function, region)
    )
  )
  SELECT * FROM rolled WHERE sample_size >= _min_sample;

  DELETE FROM public.benchmarks_materialised WHERE true;

  INSERT INTO public.benchmarks_materialised
    (level, size_band, sector, function, region, sample_size, median_score, pillar_medians, refreshed_at)
  SELECT
    level::assessment_level,
    size_band,
    sector,
    function,
    region,
    sample_size,
    median_score,
    pillar_medians,
    now()
  FROM _new_benchmarks;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$function$;

UPDATE public.benchmarks_materialised
SET function = CASE function
  WHEN 'sales' THEN 'Sales'
  WHEN 'marketing' THEN 'Marketing'
  WHEN 'engineering-product' THEN 'Engineering & Product'
  WHEN 'people-hr' THEN 'People & HR'
  WHEN 'finance' THEN 'Finance'
  WHEN 'ops-cs' THEN 'Operations & Supply Chain'
  ELSE function
END,
region = CASE region
  WHEN 'APAC' THEN 'Asia-Pacific'
  WHEN 'Western Europe' THEN 'Europe'
  WHEN 'Eastern Europe' THEN 'Europe'
  WHEN 'Nordics' THEN 'Europe'
  ELSE region
END,
sector = CASE sector
  WHEN 'B2B SaaS' THEN 'Tech'
  WHEN 'Financial Services' THEN 'Finance'
  WHEN 'Healthcare & Life Sciences' THEN 'Healthcare'
  WHEN 'Retail & Ecommerce' THEN 'Retail'
  WHEN 'Manufacturing & Supply Chain' THEN 'Industry'
  WHEN 'Public Sector & Nonprofit' THEN 'Public'
  ELSE sector
END
WHERE function IN ('sales','marketing','engineering-product','people-hr','finance','ops-cs')
   OR region IN ('APAC','Western Europe','Eastern Europe','Nordics')
   OR sector IN ('B2B SaaS','Financial Services','Healthcare & Life Sciences','Retail & Ecommerce','Manufacturing & Supply Chain','Public Sector & Nonprofit');