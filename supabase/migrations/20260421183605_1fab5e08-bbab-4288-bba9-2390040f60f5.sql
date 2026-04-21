
-- 1. Allow anonymous respondents (no auth required for the 3-min Quickscan)
ALTER TABLE public.respondents ALTER COLUMN user_id DROP NOT NULL;

-- 2. Public RPC: returns just enough to render a report by slug, no PII.
CREATE OR REPLACE FUNCTION public.get_report_by_slug(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'respondent', jsonb_build_object(
      'id', r.id,
      'slug', r.slug,
      'level', r.level,
      'function', r.function,
      'region', r.region,
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
      'generated_at', rep.generated_at
    ) END,
    'response_count', (SELECT COUNT(*) FROM public.responses WHERE respondent_id = r.id),
    'has_deepdive', (SELECT COUNT(*) FROM public.responses WHERE respondent_id = r.id) > 8
  )
  FROM public.respondents r
  LEFT JOIN public.reports rep ON rep.respondent_id = r.id
  WHERE r.slug = _slug;
$$;

-- 3. Public RPC: list outcome rows (already public via outcomes_library RLS,
--    but we expose a helper that returns just what the report card needs).
CREATE OR REPLACE FUNCTION public.get_outcomes_for_report(_slug text)
RETURNS SETOF public.outcomes_library
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.outcomes_library o
  JOIN public.reports rep ON rep.id IS NOT NULL
  JOIN public.respondents r ON r.id = rep.respondent_id
  WHERE r.slug = _slug
    AND o.active = true
    AND o.id::text = ANY (
      SELECT jsonb_array_elements_text(elem->'outcome_ids')
      FROM jsonb_array_elements(rep.plan) elem
    );
$$;

-- 4. Allow these RPCs to be called by anon + authenticated.
GRANT EXECUTE ON FUNCTION public.get_report_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_outcomes_for_report(text) TO anon, authenticated;
