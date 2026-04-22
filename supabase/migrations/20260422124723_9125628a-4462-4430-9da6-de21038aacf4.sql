CREATE OR REPLACE FUNCTION public.normalize_size_band(_org_size text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _org_size IS NULL THEN NULL
    WHEN _org_size ILIKE 'Early-stage%' OR _org_size ILIKE '1–50%' OR _org_size ILIKE '1-50%' OR _org_size ILIKE 'Just me%' OR _org_size ILIKE '2–10%' OR _org_size ILIKE '2-10%' OR _org_size ILIKE '11–50%' OR _org_size ILIKE '11-50%' THEN 'S'
    WHEN _org_size ILIKE 'Early scale-up%' OR _org_size ILIKE '51–100%' OR _org_size ILIKE '51-100%' THEN 'M1'
    WHEN _org_size ILIKE 'Mid scale-up%' OR _org_size ILIKE '101–200%' OR _org_size ILIKE '101-200%' OR _org_size ILIKE '51–200%' OR _org_size ILIKE '51-200%' THEN 'M2'
    WHEN _org_size ILIKE 'Late scale-up%' OR _org_size ILIKE '201–500%' OR _org_size ILIKE '201-500%' OR _org_size ILIKE '201–600%' OR _org_size ILIKE '201-600%' OR _org_size ILIKE '51–250%' OR _org_size ILIKE '51-250%' THEN 'M3'
    WHEN _org_size ILIKE 'Growth%' OR _org_size ILIKE '501–1,000%' OR _org_size ILIKE '501-1,000%' OR _org_size ILIKE '501-1000%' OR _org_size ILIKE '251%' THEN 'L1'
    WHEN _org_size ILIKE 'Upper-mid-market%' OR _org_size ILIKE '1,001–2,000%' OR _org_size ILIKE '1,001-2,000%' OR _org_size ILIKE '1001-2000%' OR _org_size ILIKE '601–2000%' OR _org_size ILIKE '601-2000%' THEN 'L2'
    WHEN _org_size ILIKE 'Enterprise%' OR _org_size ILIKE '2,001+%' OR _org_size ILIKE '2001+%' OR _org_size ILIKE '2000+%' OR _org_size ILIKE '1,000+%' OR _org_size ILIKE '1000+%' OR _org_size ILIKE '1k+%' THEN 'XL'
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_report_by_slug(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'respondent', jsonb_build_object(
      'id', r.id,
      'slug', r.slug,
      'level', r.level,
      'function', r.function,
      'region', r.region,
      'org_size', r.org_size,
      'submitted_at', r.submitted_at,
      'is_anonymous', (r.user_id IS NULL)
    ),
    'report', CASE WHEN rep.id IS NULL THEN NULL ELSE jsonb_build_object(
      'aioi_score', rep.aioi_score,
      'overall_tier', rep.overall_tier,
      'pillar_tiers', rep.pillar_tiers,
      'hotspots', rep.hotspots,
      'diagnosis', rep.diagnosis,
      'plan', rep.plan,
      'generated_at', rep.generated_at,
      'cap_flags', rep.cap_flags,
      'benchmark_excluded', rep.benchmark_excluded,
      'score_audit', rep.score_audit
    ) END,
    'response_count', (SELECT COUNT(*) FROM public.responses WHERE respondent_id = r.id),
    'has_deepdive', (SELECT COUNT(*) FROM public.responses WHERE respondent_id = r.id) > 8
  )
  FROM public.respondents r
  LEFT JOIN public.reports rep ON rep.respondent_id = r.id
  WHERE r.slug = _slug;
$function$;