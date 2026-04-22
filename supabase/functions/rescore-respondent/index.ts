// rescore-respondent
// Re-runs the scoring engine against ALL responses for a respondent (looked up
// by slug) and updates the existing report row. Used by the deep-dive page
// when the user has answered the additional questions.
//
// Security: requires a valid Supabase JWT. The caller's user_id MUST match
// respondent.user_id — the slug alone is NOT sufficient authentication
// because slugs are visible in shareable report URLs.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Require a Bearer token. We do in-code auth because verify_jwt is
    //    disabled at the gateway (the signing-keys system doesn't validate
    //    non-JWT tokens reliably).
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // 2. Validate input.
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 64) return json({ error: "slug is required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Look up respondent + ownership. Return generic 404 for both
    //    "not found" and "not yours" so callers can't enumerate slugs.
    const { data: respondent, error: rErr } = await admin
      .from("respondents")
      .select("id, slug, user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (rErr || !respondent || respondent.user_id !== userId) {
      return json({ error: "Not found" }, 404);
    }

    const { data: responses, error: respErr } = await admin
      .from("responses")
      .select("question_id, tier")
      .eq("respondent_id", respondent.id);
    if (respErr || !responses?.length) return json({ error: "No responses" }, 400);

    const { data: questions } = await admin
      .from("questions")
      .select("id, pillar")
      .in("id", responses.map((r) => r.question_id));
    const pillarOf = new Map<string, number>();
    for (const q of questions ?? []) pillarOf.set(q.id, q.pillar);

    const { tiers: rawTiers, answered } = computePillarTiers(responses, pillarOf);
    const capped = applyConsistencyCaps(rawTiers, responses);
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

    const hotspotPillars = hotspots.map((h) => h.pillar);
    const { data: outcomes } = await admin
      .from("outcomes_library")
      .select("id, pillar, applies_to_tier, title")
      .in("pillar", hotspotPillars.length ? hotspotPillars : [1])
      .eq("active", true);

    const diagnosis = fallbackDiagnosis(overallTier, hotspots);
    const plan = fallbackPlan(hotspots, outcomes ?? []);

    const { data: existing } = await admin
      .from("reports")
      .select("id")
      .eq("respondent_id", respondent.id)
      .maybeSingle();

    const updates = {
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
    };

    if (existing) {
      await admin.from("reports").update(updates).eq("id", existing.id);
    } else {
      await admin.from("reports").insert({ respondent_id: respondent.id, ...updates });
    }

    void admin.from("events").insert({
      name: "deepdive_completed",
      user_id: userId,
      payload: { respondent_id: respondent.id, slug, score: aioi, response_count: responses.length },
    });

    return json({ ok: true, slug, score: aioi, tier: overallTier });
  } catch (err) {
    console.error("[rescore-respondent] error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
