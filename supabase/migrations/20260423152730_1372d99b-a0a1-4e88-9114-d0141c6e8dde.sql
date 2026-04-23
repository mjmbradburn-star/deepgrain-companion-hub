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
      'is_anonymous', (r.user_id IS NULL),
      'is_owned', (r.user_id IS NOT NULL),
      'is_owner', (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
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