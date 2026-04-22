CREATE OR REPLACE FUNCTION public.claim_report_by_slug(_slug text, _consent_marketing boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _respondent public.respondents%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthorized');
  END IF;

  IF _slug IS NULL OR length(trim(_slug)) = 0 OR length(trim(_slug)) > 64 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_slug');
  END IF;

  SELECT * INTO _respondent
  FROM public.respondents
  WHERE slug = trim(_slug)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_found');
  END IF;

  IF _respondent.user_id IS NOT NULL AND _respondent.user_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'status', 'already_claimed');
  END IF;

  UPDATE public.respondents
  SET
    user_id = _uid,
    consent_marketing = public.respondents.consent_marketing OR COALESCE(_consent_marketing, false),
    updated_at = now()
  WHERE id = _respondent.id
    AND (user_id IS NULL OR user_id = _uid);

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN _respondent.user_id IS NULL THEN 'claimed' ELSE 'already_owned' END,
    'respondent_id', _respondent.id,
    'slug', _respondent.slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_report_by_slug(text, boolean) TO authenticated;