DROP POLICY IF EXISTS "Anonymous users cannot insert respondents directly" ON public.respondents;

CREATE POLICY "Anonymous users cannot insert respondents directly"
ON public.respondents
FOR INSERT
TO anon
WITH CHECK (false);