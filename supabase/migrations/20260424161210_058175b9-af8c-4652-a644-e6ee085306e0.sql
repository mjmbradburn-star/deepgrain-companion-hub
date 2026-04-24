-- Role enum for chat messages
DO $$ BEGIN
  CREATE TYPE public.chat_message_role AS ENUM ('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.report_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  respondent_id uuid NOT NULL,
  role public.chat_message_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_chat_messages_respondent_created
  ON public.report_chat_messages (respondent_id, created_at);

ALTER TABLE public.report_chat_messages ENABLE ROW LEVEL SECURITY;

-- Owners (signed-in respondents) can read their own chat
CREATE POLICY "Own chat select"
  ON public.report_chat_messages
  FOR SELECT
  TO authenticated
  USING (public.is_my_respondent(respondent_id));

-- Owners can append messages to their own chat
CREATE POLICY "Own chat insert"
  ON public.report_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_my_respondent(respondent_id));

-- Admins can read everything for QA / abuse review
CREATE POLICY "Admins read all chat"
  ON public.report_chat_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No update / delete policies — chat history is immutable
