CREATE OR REPLACE FUNCTION public.get_auth_email_state(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text := lower(trim(coalesce(_email, '')));
  _confirmed_at timestamptz;
BEGIN
  IF _normalized = '' OR length(_normalized) > 254 OR position('@' in _normalized) <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'state', 'invalid_email');
  END IF;

  SELECT u.email_confirmed_at INTO _confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = _normalized
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'state', 'new');
  END IF;

  IF _confirmed_at IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'state', 'unconfirmed');
  END IF;

  RETURN jsonb_build_object('ok', true, 'state', 'confirmed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_email_state(text) TO anon, authenticated;