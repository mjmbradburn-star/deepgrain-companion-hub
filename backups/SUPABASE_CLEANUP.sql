-- ============================================================
-- DEEPGRAIN COMPANION HUB — SUPABASE CLEANUP SCRIPT
-- Run this in Lovable SQL Editor or Supabase Dashboard SQL Editor
-- ============================================================

-- 1. CREATE NEW ARCHETYPE RESULTS TABLE
-- This stores scan results for logged-in users
create table if not exists public.archetype_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  archetype_index smallint not null check (archetype_index between 0 and 4),
  answers jsonb not null default '{}',
  level text not null check (level in ('company','function','individual')),
  created_at timestamptz default now()
);

-- Enable RLS on archetype_results
alter table public.archetype_results enable row level security;

-- Users can only read their own results
create policy "Users can read own archetype results"
  on public.archetype_results for select
  using (auth.uid() = user_id);

-- Users can only insert their own results
create policy "Users can insert own archetype results"
  on public.archetype_results for insert
  with check (auth.uid() = user_id);

-- Allow anon inserts for email-capture flow (stores with null user_id)
create policy "Allow anon archetype inserts"
  on public.archetype_results for insert
  to anon
  with check (true);


-- 2. CREATE EMAIL CAPTURES TABLE
-- This stores emails from non-logged-in users on the result page
-- Lovable's email system can read from here to send PDF reports
create table if not exists public.email_captures (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  archetype_index smallint not null check (archetype_index between 0 and 4),
  answers jsonb not null default '{}',
  level text not null check (level in ('company','function','individual')),
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS on email_captures
alter table public.email_captures enable row level security;

-- Only service_role can read all rows (for Lovable email system)
create policy "Service role can read email captures"
  on public.email_captures for select
  to service_role
  using (true);

-- Anon can insert their own email
create policy "Anon can insert email captures"
  on public.email_captures for insert
  to anon
  with check (true);


-- 3. DROP EMPTY TABLES (zero rows, safe to delete)
drop table if exists public.email_send_log;
drop table if exists public.email_send_state;
drop table if exists public.email_unsubscribe_tokens;
drop table if exists public.events;
drop table if exists public.next_actions;
drop table if exists public.report_chat_messages;
drop table if exists public.reports;
drop table if exists public.respondents;
drop table if exists public.responses;
drop table if exists public.suppressed_emails;
drop table if exists public.user_roles;


-- 4. DROP OLD 8-PILLAR TABLES (data already backed up to JSON)
drop table if exists public.benchmarks_materialised;
drop table if exists public.outcomes_library;
drop table if exists public.question_options;
drop table if exists public.questions;
drop table if exists public.question_variants;


-- 5. DROP OLD FUNCTIONS
drop function if exists public.claim_report_by_slug(text, text);
drop function if exists public.delete_email(uuid);
drop function if exists public.enqueue_email(text, text, jsonb);
drop function if exists public.get_outcomes_for_report(text);
drop function if exists public.has_role(text);
drop function if exists public.move_to_dlq(uuid, text);
drop function if exists public.read_email_batch(integer);


-- 6. CLEAN UP OLD ENUMS (if no longer referenced)
-- Note: assessment_level enum might still be referenced by archetype_results level column
-- which we changed to text with check constraint above. If the enum is unused elsewhere:
drop type if exists public.assessment_level;


-- 7. VERIFY
select 'archetype_results' as table_name, count(*) as rows from public.archetype_results
union all
select 'email_captures', count(*) from public.email_captures;
