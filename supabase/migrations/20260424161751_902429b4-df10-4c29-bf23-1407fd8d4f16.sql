CREATE TABLE IF NOT EXISTS public.next_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  respondent_id uuid NOT NULL,
  move_id uuid,
  title text NOT NULL,
  due_date date,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_next_actions_respondent_sort
  ON public.next_actions (respondent_id, sort_order, created_at);

ALTER TABLE public.next_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own actions select"
  ON public.next_actions FOR SELECT TO authenticated
  USING (public.is_my_respondent(respondent_id));

CREATE POLICY "Own actions insert"
  ON public.next_actions FOR INSERT TO authenticated
  WITH CHECK (public.is_my_respondent(respondent_id));

CREATE POLICY "Own actions update"
  ON public.next_actions FOR UPDATE TO authenticated
  USING (public.is_my_respondent(respondent_id))
  WITH CHECK (public.is_my_respondent(respondent_id));

CREATE POLICY "Own actions delete"
  ON public.next_actions FOR DELETE TO authenticated
  USING (public.is_my_respondent(respondent_id));

CREATE POLICY "Admins read all actions"
  ON public.next_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_next_actions_updated_at
  BEFORE UPDATE ON public.next_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
