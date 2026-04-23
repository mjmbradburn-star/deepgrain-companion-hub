DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.respondents'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.respondents'::regclass AND attname = 'user_id')
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.respondents DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.respondents_user_id_key;
DROP INDEX IF EXISTS public.respondents_user_id_unique;
DROP INDEX IF EXISTS public.idx_respondents_user_id_unique;

CREATE INDEX IF NOT EXISTS idx_respondents_user_id ON public.respondents(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_respondents_slug ON public.respondents(slug);
CREATE INDEX IF NOT EXISTS idx_reports_respondent_id ON public.reports(respondent_id);
CREATE INDEX IF NOT EXISTS idx_responses_respondent_id ON public.responses(respondent_id);

CREATE OR REPLACE FUNCTION public.claim_report_by_slug(_slug text, _consent_marketing boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _respondent public.respondents%ROWTYPE;
  _uid uuid := auth.uid();
  _normalized_slug text := trim(coalesce(_slug, ''));
  _updated_count integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthorized');
  END IF;

  IF _normalized_slug = '' OR length(_normalized_slug) > 64 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_slug');
  END IF;

  SELECT * INTO _respondent
  FROM public.respondents
  WHERE slug = _normalized_slug
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

  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  IF _updated_count <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'already_claimed');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN _respondent.user_id IS NULL THEN 'claimed' ELSE 'already_owned' END,
    'respondent_id', _respondent.id,
    'slug', _respondent.slug
  );
END;
$function$;