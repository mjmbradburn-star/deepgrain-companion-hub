// rescore-all-reports
// Admin-only historical v1.1 rescoring job. Recomputes existing reports from
// stored responses, preserves the previous report snapshot in score_audit, and
// refreshes benchmark aggregates after applied runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  PILLAR_NAMES,
  aioiScore,
  applyConsistencyCaps,
  fallbackDiagnosis,
  fallbackPlan,
  pillarTiers as computePillarTiers,
  tierForScore,
  tierLabel,
  topHotspots,
} from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RescoreBody {
  apply?: boolean;
  limit?: number;
  offset?: number;
  slug?: string;
  recompute_benchmarks?: boolean;
}

interface ResponseRow {
  question_id: string;
  tier: number;
}

interface QuestionPillarRow {
  id: string;
  pillar: number;
}

interface OutcomeRow {
  id: string;
  pillar: number;
  applies_to_tier: number;
  title: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const authHeader = req.headers.get("Authorization") ?? "";
    const apikeyHeader = (req.headers.get("apikey") ?? "").trim();
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : "";

    if (!serviceKey || !await isServiceRoleRequest(serviceKey, token, apikeyHeader)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as RescoreBody;
    const apply = body.apply === true;
    const limit = clampInt(body.limit, 1, 500, 100);
    const offset = clampInt(body.offset, 0, 100_000, 0);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const shouldRecomputeBenchmarks = body.recompute_benchmarks !== false;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let respondentQuery = admin
      .from("respondents")
      .select("id, slug")
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: true });

    if (slug) {
      respondentQuery = respondentQuery.eq("slug", slug);
    } else {
      respondentQuery = respondentQuery.range(offset, offset + limit - 1);
    }

    const { data: respondents, error: respondentErr } = await respondentQuery;
    if (respondentErr) return json({ error: respondentErr.message }, 500);

    const results = [];
    for (const respondent of respondents ?? []) {
      const result = await rescoreRespondent(admin, respondent.id, respondent.slug, apply);
      results.push(result);
    }

    let benchmarkRows: number | null = null;
    if (apply && shouldRecomputeBenchmarks && results.some((r) => r.status === "rescored")) {
      const { data, error } = await admin.rpc("recompute_benchmarks", { _min_sample: 5 });
      if (error) {
        console.error("[rescore-all-reports] benchmark recompute failed", error);
      } else {
        benchmarkRows = data as number;
      }
    }

    await admin.from("events").insert({
      name: apply ? "historic_rescore_applied" : "historic_rescore_dry_run",
      payload: {
        slug: slug || null,
        limit,
        offset,
        processed: results.length,
        rescored: results.filter((r) => r.status === "rescored").length,
        benchmark_rows: benchmarkRows,
      },
    });

    return json({
      ok: true,
      mode: apply ? "apply" : "dry_run",
      processed: results.length,
      rescored: results.filter((r) => r.status === "rescored").length,
      benchmark_rows: benchmarkRows,
      results,
    });
  } catch (err) {
    console.error("[rescore-all-reports] error", err);
    return json({ error: "Internal server error" }, 500);
  }
});

async function rescoreRespondent(admin: any, respondentId: string, slug: string, apply: boolean) {
  const { data: responses, error: responseErr } = await admin
    .from("responses")
    .select("question_id, tier")
    .eq("respondent_id", respondentId);
  if (responseErr) return { slug, status: "error", error: responseErr.message };
  if (!responses?.length) return { slug, status: "skipped", reason: "no_responses" };

  const questionIds = [...new Set((responses as ResponseRow[]).map((r) => r.question_id))];
  const { data: questions, error: questionErr } = await admin
    .from("questions")
    .select("id, pillar")
    .in("id", questionIds);
  if (questionErr || !questions?.length) {
    return { slug, status: "error", error: questionErr?.message ?? "No matching questions" };
  }

  const pillarOf = new Map<string, number>();
  for (const question of (questions ?? []) as QuestionPillarRow[]) pillarOf.set(question.id, question.pillar);

  const { tiers: rawPillarTiers, answered } = computePillarTiers(responses as ResponseRow[], pillarOf);
  const capped = applyConsistencyCaps(rawPillarTiers, responses as ResponseRow[]);
  const pillarTiers = capped.tiers;
  const aioi = aioiScore(pillarTiers, answered);
  const overallTier = tierForScore(aioi);
  const hotspots = topHotspots(pillarTiers, 3);

  const pillarTiersPayload = Object.fromEntries(
    Object.entries(pillarTiers).map(([pillar, tier]) => [
      pillar,
      { tier, label: tierLabel(Math.round(tier)), name: PILLAR_NAMES[Number(pillar)] },
    ]),
  );

  const { data: outcomes } = await admin
    .from("outcomes_library")
    .select("id, pillar, applies_to_tier, title")
    .in("pillar", hotspots.length ? hotspots.map((h) => h.pillar) : [1])
    .eq("active", true);

  const { data: existingReport } = await admin
    .from("reports")
    .select("id, aioi_score, overall_tier, pillar_tiers, hotspots, diagnosis, plan, cap_flags, benchmark_excluded, score_audit, generated_at")
    .eq("respondent_id", respondentId)
    .maybeSingle();

  const previous = existingReport
    ? {
      aioi_score: existingReport.aioi_score,
      overall_tier: existingReport.overall_tier,
      pillar_tiers: existingReport.pillar_tiers,
      hotspots: existingReport.hotspots,
      diagnosis: existingReport.diagnosis,
      plan: existingReport.plan,
      cap_flags: existingReport.cap_flags,
      benchmark_excluded: existingReport.benchmark_excluded,
      score_audit: existingReport.score_audit,
      generated_at: existingReport.generated_at,
    }
    : null;

  const nextReport = {
    respondent_id: respondentId,
    aioi_score: aioi,
    overall_tier: overallTier,
    pillar_tiers: pillarTiersPayload,
    hotspots,
    diagnosis: fallbackDiagnosis(overallTier, hotspots),
    plan: fallbackPlan(hotspots, ((outcomes ?? []) as OutcomeRow[])),
    generated_at: new Date().toISOString(),
    cap_flags: capped.capFlags,
    benchmark_excluded: capped.benchmarkExcluded,
    score_audit: {
      version: "v1.1",
      rescored_at: new Date().toISOString(),
      raw_pillar_tiers: rawPillarTiers,
      cap_count: capped.capFlags.length,
      previous,
    },
  };

  if (apply) {
    if (existingReport?.id) {
      const { error } = await admin.from("reports").update(nextReport).eq("id", existingReport.id);
      if (error) return { slug, status: "error", error: error.message };
    } else {
      const { error } = await admin.from("reports").insert(nextReport);
      if (error) return { slug, status: "error", error: error.message };
    }
  }

  return {
    slug,
    status: "rescored",
    previous_score: previous?.aioi_score ?? null,
    next_score: aioi,
    previous_tier: previous?.overall_tier ?? null,
    next_tier: overallTier,
    cap_count: capped.capFlags.length,
    benchmark_excluded: capped.benchmarkExcluded,
    changed: previous?.aioi_score !== aioi || previous?.overall_tier !== overallTier,
  };
}

async function isServiceRoleRequest(serviceKey: string, token: string, apikeyHeader: string) {
  if (token === serviceKey || apikeyHeader === serviceKey) return true;
  if (!token) return false;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getClaims(token);
  if (error || !data?.claims) return false;
  return data.claims.role === "service_role";
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}