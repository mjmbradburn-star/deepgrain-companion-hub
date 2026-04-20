// Persists a completed assessment draft to Lovable Cloud after the user signs in.
// Idempotent: if a respondent already exists for this user + level, we re-use it
// and upsert responses (no duplicates).

import { supabase } from "@/integrations/supabase/client";
import { clearDraft, type AssessmentDraft } from "./assessment";

export const FUNCTION_QUESTIONS = [
  "q1_vision",
  "q2_strategy",
  "q3_process",
  "q4_data",
  "q5_people",
  "q6_tech",
  "q7_culture",
  "q8_governance"
];

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
 * Push the local draft to the database. The user MUST be authenticated.
 * Returns the respondent slug (used to address the report once Phase 3 lands).
 */
export async function syncDraft(draft: AssessmentDraft): Promise<SyncResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new SyncError("Not authenticated");

  if (!draft.level) throw new SyncError("Draft has no level");
  const answers = Object.entries(draft.answers ?? {});
  if (answers.length === 0) throw new SyncError("Draft has no answers");

  // Find or create the respondent for this user + level. We let the user run
  // multiple levels over time; one (user, level, started_at) row each.
  const { data: existing, error: findErr } = await supabase
    .from("respondents")
    .select("id, slug")
    .eq("user_id", user.id)
    .eq("level", draft.level)
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
        consent_marketing: !!draft.qualifier?.consentMarketing,
        consent_benchmark: !!draft.qualifier?.consentBenchmark,
        started_at: draft.startedAt ?? new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single();
    if (insertErr || !created) throw new SyncError("Could not create respondent", insertErr);
    respondentId = created.id;
    slug = created.slug;
  } else {
    // Existing respondent — refresh qualifier + submitted_at
    const { error: updateErr } = await supabase
      .from("respondents")
      .update({
        role: draft.qualifier?.role ?? null,
        org_size: draft.qualifier?.size ?? null,
        pain: draft.qualifier?.pain ?? null,
        consent_marketing: !!draft.qualifier?.consentMarketing,
        consent_benchmark: !!draft.qualifier?.consentBenchmark,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", respondentId);
    if (updateErr) throw new SyncError("Could not update respondent", updateErr);

    // Wipe previous answers so a re-take cleanly replaces them.
    await supabase.from("responses").delete().eq("respondent_id", respondentId);
  }

  // Bulk-insert answers
  const rows = answers.map(([question_id, tier]) => ({
    respondent_id: respondentId!,
    question_id,
    tier,
  }));
  const { error: respErr } = await supabase.from("responses").insert(rows);
  if (respErr) throw new SyncError("Could not save answers", respErr);

  // Fire-and-forget analytics event
  await supabase.from("events").insert({
    name: "assessment_submitted",
    user_id: user.id,
    payload: {
      respondent_id: respondentId,
      level: draft.level,
      answer_count: rows.length,
    },
  });

  clearDraft();

  return { respondentId: respondentId!, slug: slug!, inserted: rows.length };
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
