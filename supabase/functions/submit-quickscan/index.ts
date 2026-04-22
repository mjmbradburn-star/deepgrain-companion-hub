// submit-quickscan
// Anonymous endpoint: takes 8 (pillar, tier) answers + optional function/region,
// creates a respondent + responses + report and returns the public slug.
//
// No auth required — slug is the secret. Authenticated callers are also
// supported (the row is bound to user_id so they can later upgrade via /assess/deep).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  PILLAR_NAMES,
  tierForScore,
  tierLabel,
  pillarTiers as computePillarTiers,
  aioiScore,
  topHotspots,
  applyConsistencyCaps,
  fallbackDiagnosis,
  fallbackPlan,
} from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScanAnswer {
  question_id: string;
  tier: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Optional auth — if present, link the respondent to the user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const level = typeof body.level === "string" ? body.level : null;
    const fn = typeof body.function === "string" ? body.function : null;
    const region = typeof body.region === "string" ? body.region : null;
    const answers = Array.isArray(body.answers) ? (body.answers as ScanAnswer[]) : [];

    if (!level || !["company", "function", "individual"].includes(level)) {
      return json({ error: "Invalid level" }, 400);
    }
    if (answers.length < 1 || answers.length > 16) {
      return json({ error: "Expected 1..16 answers" }, 400);
    }
    for (const a of answers) {
      if (typeof a.question_id !== "string" || typeof a.tier !== "number" || a.tier < 0 || a.tier > 5) {
        return json({ error: "Bad answer shape" }, 400);
      }
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Create the respondent
    const { data: respondent, error: insErr } = await admin
      .from("respondents")
      .insert({
        user_id: userId,
        level,
        function: fn,
        region,
        consent_benchmark: true, // Quickscan opt-in by default; can be tightened later
        consent_marketing: false,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single();

    if (insErr || !respondent) {
      console.error("[submit-quickscan] create respondent failed", insErr);
      return json({ error: "Could not create respondent" }, 500);
    }

    // 2. Insert responses
    const responseRows = answers.map((a) => ({
      respondent_id: respondent.id,
      question_id: a.question_id,
      tier: a.tier,
    }));
    const { error: respErr } = await admin.from("responses").insert(responseRows);
    if (respErr) {
      console.error("[submit-quickscan] insert responses failed", respErr);
      return json({ error: "Could not save responses" }, 500);
    }

    // 3. Score it (deterministic; no AI call on the hot path so we stay sub-second)
    const { data: questions } = await admin
      .from("questions")
      .select("id, pillar")
      .in("id", answers.map((a) => a.question_id));
    const pillarOf = new Map<string, number>();
    for (const q of questions ?? []) pillarOf.set(q.id, q.pillar);

    const { tiers: rawTiers, answered } = computePillarTiers(answers, pillarOf);
    const capped = applyConsistencyCaps(rawTiers, answers);
    const tiers = capped.tiers;
    const aioi = aioiScore(tiers, answered);
    const overallTier = tierForScore(aioi);
    const hotspots = topHotspots(tiers, 3);

    const pillar_tiers_payload = Object.fromEntries(
      Object.entries(tiers).map(([p, t]) => [
        p,
        { tier: t, label: tierLabel(Math.round(t)), name: PILLAR_NAMES[Number(p)] },
      ]),
    );

    // Pull a couple of outcomes for the locked plan teaser
    const hotspotPillars = hotspots.map((h) => h.pillar);
    const { data: outcomes } = await admin
      .from("outcomes_library")
      .select("id, pillar, applies_to_tier, title")
      .in("pillar", hotspotPillars.length ? hotspotPillars : [1])
      .eq("active", true);

    const diagnosis = fallbackDiagnosis(overallTier, hotspots);
    const plan = fallbackPlan(hotspots, outcomes ?? []);

    await admin.from("reports").insert({
      respondent_id: respondent.id,
      aioi_score: aioi,
      overall_tier: overallTier,
      pillar_tiers: pillar_tiers_payload,
      hotspots,
      diagnosis,
      plan,
      generated_at: new Date().toISOString(),
      cap_flags: capped.capFlags,
      benchmark_excluded: capped.benchmarkExcluded,
      score_audit: { version: "v1.1", raw_pillar_tiers: rawTiers, cap_count: capped.capFlags.length },
    });

    // Telemetry — fire-and-forget
    void admin.from("events").insert({
      name: "quickscan_completed",
      user_id: userId,
      payload: { respondent_id: respondent.id, slug: respondent.slug, level, score: aioi },
    });

    return json({ ok: true, slug: respondent.slug, score: aioi, tier: overallTier });
  } catch (err) {
    console.error("[submit-quickscan] error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
