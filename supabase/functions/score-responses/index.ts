// score-responses
// Compute the AIOI for a respondent the user owns, draft the diagnosis copy
// and 3-month plan via Lovable AI, and write a `reports` row.
//
// Auth: validates the caller's JWT in code; respondent ownership is enforced
// by re-checking respondents.user_id against the JWT's sub.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  PILLAR_NAMES,
  PILLAR_WEIGHTS,
  TIER_LABELS,
  type TierLabel,
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

// ─── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // 1. Verify caller and read body
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const respondentId = typeof body.respondent_id === "string" ? body.respondent_id : null;
    if (!respondentId) return json({ error: "respondent_id is required" }, 400);

    // 2. Service-role client for the deterministic side. We re-verify ownership.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: respondent, error: rErr } = await admin
      .from("respondents")
      .select("id, user_id, slug, level, role, org_size, pain")
      .eq("id", respondentId)
      .maybeSingle();
    if (rErr || !respondent) return json({ error: "Respondent not found" }, 404);
    if (respondent.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // 3. Pull responses + the questions they map to (for pillar lookup)
    const { data: responses, error: respErr } = await admin
      .from("responses")
      .select("question_id, tier")
      .eq("respondent_id", respondentId);
    if (respErr) return json({ error: "Could not load responses" }, 500);
    if (!responses || responses.length === 0) {
      return json({ error: "No responses to score" }, 400);
    }

    const questionIds = responses.map((r) => r.question_id);
    const { data: questions, error: qErr } = await admin
      .from("questions")
      .select("id, pillar")
      .in("id", questionIds);
    if (qErr || !questions) return json({ error: "Could not load questions" }, 500);

    const pillarOf = new Map<string, number>();
    for (const q of questions) pillarOf.set(q.id, q.pillar);

    // 4. Compute pillar tiers, weighted AIOI, and hotspots (pure helpers)
    const { tiers: rawPillarTiers, answered } = computePillarTiers(responses, pillarOf);
    const capped = applyConsistencyCaps(rawPillarTiers, responses);
    const pillarTiers = capped.tiers;
    const aioi = aioiScore(pillarTiers, answered);
    const overallTier = tierForScore(aioi);
    const hotspots = topHotspots(pillarTiers, 3);

    // 7. Pull candidate interventions for hotspots from outcomes_library
    const hotspotPillars = hotspots.map((h) => h.pillar);
    const { data: outcomes } = await admin
      .from("outcomes_library")
      .select("id, pillar, applies_to_tier, title, body, effort, impact, time_to_value")
      .in("pillar", hotspotPillars.length ? hotspotPillars : [1])
      .eq("active", true);

    // 8. Diagnosis copy + plan ordering via Lovable AI (best-effort)
    let diagnosis: string | null = null;
    let plan: { month: number; title: string; rationale: string; outcome_ids: string[] }[] | null = null;

    if (LOVABLE_API_KEY) {
      try {
        const { diagnosisOut, planOut } = await draftCopy({
          apiKey: LOVABLE_API_KEY,
          aioi,
          overallTier,
          pillarTiers,
          hotspots,
          outcomes: outcomes ?? [],
          respondent,
        });
        diagnosis = diagnosisOut;
        plan = planOut;
      } catch (err) {
        console.error("[score-responses] AI draft failed, falling back:", err);
      }
    }

    if (!diagnosis) diagnosis = fallbackDiagnosis(overallTier, hotspots);
    if (!plan) plan = fallbackPlan(hotspots, outcomes ?? []);

    const pillar_tiers_payload = Object.fromEntries(
      Object.entries(pillarTiers).map(([p, t]) => [p, { tier: t, label: tierLabel(Math.round(t)), name: PILLAR_NAMES[Number(p)] }]),
    );

    // 9. Upsert the report (one per respondent)
    const reportRow = {
      respondent_id: respondentId,
      aioi_score: aioi,
      overall_tier: overallTier,
      pillar_tiers: pillar_tiers_payload,
      hotspots,
      diagnosis,
      plan,
      generated_at: new Date().toISOString(),
      cap_flags: capped.capFlags,
      benchmark_excluded: capped.benchmarkExcluded,
      score_audit: { version: "v1.1", raw_pillar_tiers: rawPillarTiers, cap_count: capped.capFlags.length },
    };

    const { data: existing } = await admin
      .from("reports")
      .select("id")
      .eq("respondent_id", respondentId)
      .maybeSingle();

    if (existing) {
      await admin.from("reports").update(reportRow).eq("id", existing.id);
    } else {
      await admin.from("reports").insert(reportRow);
    }

    return json({
      ok: true,
      slug: respondent.slug,
      aioi,
      overall_tier: overallTier,
    });
  } catch (err) {
    console.error("[score-responses] error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─── helpers ───────────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DraftArgs {
  apiKey: string;
  aioi: number;
  overallTier: TierLabel;
  pillarTiers: Record<number, number>;
  hotspots: Array<{ pillar: number; name: string; tier: number; tierLabel: TierLabel }>;
  outcomes: Array<{
    id: string;
    pillar: number;
    applies_to_tier: number;
    title: string;
    body: string;
    effort: number | null;
    impact: number | null;
    time_to_value: string | null;
  }>;
  respondent: { level: string; role: string | null; org_size: string | null; pain: string | null };
}

async function draftCopy(args: DraftArgs) {
  const tools = [{
    type: "function",
    function: {
      name: "publish_report_copy",
      description: "Publish a one-sentence diagnosis and a three-month plan.",
      parameters: {
        type: "object",
        properties: {
          diagnosis: {
            type: "string",
            description: "One sentence, max 28 words. British English. Direct, plain. No hype, no exclamation marks. Should name the operating shape, not the score.",
          },
          plan: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                month: { type: "integer", enum: [1, 2, 3] },
                title: { type: "string", description: "Punchy 4–7 word title" },
                rationale: { type: "string", description: "Two sentences max. Why this month, why these moves." },
                outcome_ids: {
                  type: "array",
                  items: { type: "string" },
                  description: "1–2 outcome ids drawn from the supplied library.",
                },
              },
              required: ["month", "title", "rationale", "outcome_ids"],
              additionalProperties: false,
            },
          },
        },
        required: ["diagnosis", "plan"],
        additionalProperties: false,
      },
    },
  }];

  const system = `You write for an executive AI maturity report called the AIOI.
Voice: direct, British, dry. Short sentences. No marketing words ("unlock", "leverage", "journey", "exciting").
Never use the word "synergy". Never say "in today's fast-paced world".
The reader is a function lead who already knows AI matters. Tell them what their operating shape is, not what they should feel.`;

  const user = `Respondent: ${args.respondent.level} level, ${args.respondent.role ?? "unknown role"}, ${args.respondent.org_size ?? "unknown size"}.
Stated pain: ${args.respondent.pain ?? "(not given)"}
Overall AIOI: ${args.aioi} → tier ${args.overallTier}.

Pillar tiers (0–5):
${Object.entries(args.pillarTiers).map(([p, t]) => `  P${p} ${PILLAR_NAMES[Number(p)]}: ${t}`).join("\n")}

Hotspots (lowest pillars):
${args.hotspots.map((h) => `  P${h.pillar} ${h.name} — tier ${h.tier} (${h.tierLabel})`).join("\n")}

Outcomes library (id · pillar · applies_to_tier · title — body):
${args.outcomes.map((o) => `  ${o.id} · P${o.pillar} · T${o.applies_to_tier} · ${o.title} — ${o.body}`).join("\n")}

Compose:
1. A single-sentence diagnosis naming the operating shape.
2. A three-month plan. Each month picks 1–2 outcome ids from the library — prefer outcomes whose pillar is a hotspot and whose applies_to_tier is at or just above the user's pillar tier. Sequence them so foundations come first.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "publish_report_copy" } },
    }),
  });

  if (!resp.ok) throw new Error(`AI gateway ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  const parsed = JSON.parse(call.function.arguments);

  // Validate outcome ids actually exist in our library
  const validIds = new Set(args.outcomes.map((o) => o.id));
  const plan = (parsed.plan as DraftArgs["outcomes"][number][] & { month: number; title: string; rationale: string; outcome_ids: string[] }[]).map(
    (m: { month: number; title: string; rationale: string; outcome_ids: string[] }) => ({
      ...m,
      outcome_ids: m.outcome_ids.filter((id) => validIds.has(id)),
    }),
  );

  return { diagnosisOut: String(parsed.diagnosis).trim(), planOut: plan };
}
