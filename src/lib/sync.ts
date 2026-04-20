// Persists the local assessment draft to Lovable Cloud.
// Strategy:
//   • The respondent row is created the moment the user first signs in (after
//     the magic link). Its id + slug are written back into the draft so that
//     subsequent answer selections can stream straight into the responses
//     table while the user is still answering questions.
//   • Each answer is upserted on (respondent_id, question_id) — answering the
//     same question twice cleanly overwrites the previous tier.
//   • localStorage stays the source of truth: every DB write is best-effort,
//     so a flaky network never blocks the flow. On the final processing step
//     we flush anything that didn't make it.

import { supabase } from "@/integrations/supabase/client";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type AssessmentDraft,
} from "./assessment";

export interface SyncResult {
  respondentId: string;
  slug: string;
  inserted: number;
}

export class SyncError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "SyncError";
  }
}

/**
 * Ensure a respondent row exists for the current user + draft. Returns the
 * row id + slug and writes them back into the draft for subsequent calls.
 * Idempotent — safe to call on every sign-in or page load.
 */
export async function ensureRespondent(
  draft: AssessmentDraft = loadDraft(),
): Promise<{ respondentId: string; slug: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new SyncError("Not authenticated");
  if (!draft.level) throw new SyncError("Draft has no level");

  // Already linked? Trust the cached id.
  if (draft.respondentId && draft.respondentSlug) {
    return { respondentId: draft.respondentId, slug: draft.respondentSlug };
  }

  // Re-use the most recent in-progress respondent for this (user, level) so
  // a magic-link sign-in on the same device doesn't create duplicates.
  const { data: existing, error: findErr } = await supabase
    .from("respondents")
    .select("id, slug")
    .eq("user_id", user.id)
    .eq("level", draft.level)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw new SyncError("Lookup failed", findErr);

  let respondentId = existing?.id;
  let slug = existing?.slug;

  if (!respondentId) {
    const { data: created, error: insertErr } = await supabase
      .from("respondents")
      .insert({
        user_id: user.id,
        level: draft.level,
        role: draft.qualifier?.role ?? null,
        org_size: draft.qualifier?.size ?? null,
        pain: draft.qualifier?.pain ?? null,
        function: draft.qualifier?.function ?? null,
        region: draft.qualifier?.region ?? null,
        consent_marketing: !!draft.qualifier?.consentMarketing,
        consent_benchmark: !!draft.qualifier?.consentBenchmark,
        started_at: draft.startedAt ?? new Date().toISOString(),
      })
      .select("id, slug")
      .single();
    if (insertErr || !created) throw new SyncError("Could not create respondent", insertErr);
    respondentId = created.id;
    slug = created.slug;
  } else {
    // Refresh qualifier in case the user revised it after signing in.
    await supabase
      .from("respondents")
      .update({
        role: draft.qualifier?.role ?? null,
        org_size: draft.qualifier?.size ?? null,
        pain: draft.qualifier?.pain ?? null,
        function: draft.qualifier?.function ?? null,
        region: draft.qualifier?.region ?? null,
        consent_marketing: !!draft.qualifier?.consentMarketing,
        consent_benchmark: !!draft.qualifier?.consentBenchmark,
      })
      .eq("id", respondentId);
  }

  // Persist to draft so the question screen can stream answers.
  saveDraft({ ...draft, respondentId, respondentSlug: slug });
  return { respondentId: respondentId!, slug: slug! };
}

/**
 * Stream a single answer to the database. Best-effort: on failure we keep
 * the local draft and return false so the caller can decide what to do.
 */
export async function pushAnswer(
  respondentId: string,
  questionId: string,
  tier: number,
): Promise<boolean> {
  const { error } = await supabase
    .from("responses")
    .upsert(
      { respondent_id: respondentId, question_id: questionId, tier },
      { onConflict: "respondent_id,question_id" },
    );
  if (error) {
    console.warn("[sync] pushAnswer failed", error);
    return false;
  }
  return true;
}

/**
 * Flush every locally-cached answer to the database. Used both when a user
 * signs in mid-flow (backfill) and when finalising on the processing screen
 * (catch anything that failed live). Returns the number of rows written.
 */
export async function flushAnswers(
  respondentId: string,
  draft: AssessmentDraft = loadDraft(),
): Promise<number> {
  const entries = Object.entries(draft.answers ?? {});
  if (entries.length === 0) return 0;
  const rows = entries.map(([question_id, tier]) => ({
    respondent_id: respondentId,
    question_id,
    tier,
  }));
  const { error } = await supabase
    .from("responses")
    .upsert(rows, { onConflict: "respondent_id,question_id" });
  if (error) throw new SyncError("Could not save answers", error);
  return rows.length;
}

/**
 * Finalise the assessment: ensure respondent, flush answers, mark submitted,
 * invoke the scoring engine. Called from the processing screen after the
 * user has answered every question and is signed-in.
 */
export async function finaliseAssessment(): Promise<SyncResult> {
  const draft = loadDraft();
  const answers = Object.entries(draft.answers ?? {});
  if (answers.length === 0) throw new SyncError("Draft has no answers");

  const { respondentId, slug } = await ensureRespondent(draft);
  const inserted = await flushAnswers(respondentId, draft);

  await supabase
    .from("respondents")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", respondentId);

  // Analytics — fire-and-forget
  const { data: sessionData } = await supabase.auth.getSession();
  await supabase.from("events").insert({
    name: "assessment_submitted",
    user_id: sessionData.session?.user.id ?? null,
    payload: {
      respondent_id: respondentId,
      level: draft.level,
      answer_count: inserted,
    },
  });

  // Score (best-effort — the report row will appear once it lands)
  try {
    const { error: scoreErr } = await supabase.functions.invoke("score-responses", {
      body: { respondent_id: respondentId },
    });
    if (scoreErr) console.error("[sync] score-responses error", scoreErr);
  } catch (err) {
    console.error("[sync] score-responses threw", err);
  }

  clearDraft();
  return { respondentId, slug, inserted };
}

/** Send a magic link to the given email. Returns when the request was accepted. */
export async function sendMagicLink(email: string, redirectTo: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) throw new SyncError(error.message, error);
}
