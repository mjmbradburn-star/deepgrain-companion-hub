CREATE POLICY "Own report insert"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (public.is_my_respondent(respondent_id));

CREATE POLICY "Own report update"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_my_respondent(respondent_id))
WITH CHECK (public.is_my_respondent(respondent_id));

CREATE POLICY "Own report delete"
ON public.reports
FOR DELETE
TO authenticated
USING (public.is_my_respondent(respondent_id));