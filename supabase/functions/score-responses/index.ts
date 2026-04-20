// score-responses
// Compute the AIOI for a respondent the user owns, draft the diagnosis copy
// and 3-month plan via Lovable AI, and write a `reports` row.
//
// Auth: validates the caller's JWT in code; respondent ownership is enforced
// by re-checking respondents.user_id against the JWT's sub.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Domain constants ──────────────────────────────────────────────────────
const PILLAR_NAMES: Record<number, string> = {
  1: "Strategy & Mandate",
  2: "Data Foundations",
  3: "Tooling & Infrastructure",
  4: "Workflow Integration",
  5: "Skills & Fluency",
  6: "Governance & Risk",
  7: "Measurement & ROI",
  8: "Culture & Adoption",
};

// Causal weighting — Strategy / Data / Workflow upstream of the rest.
const PILLAR_WEIGHTS: Record<number, number> = {
  1: 0.14,
  2: 0.14,
  3: 0.12,
  4: 0.14,
  5: 0.12,
  6: 0.12,
  7: 0.12,
  8: 0.10,
};

const TIER_LABELS = [
  "Dormant",
  "Reactive",
  "Exploratory",
  "Operational",
  "Integrated",
  "AI-Native",
] as const;

type TierLabel = (typeof TIER_LABELS)[number];

const SCORE_BANDS: Array<{ max: number; tier: TierLabel }> = [
  { max: 14, tier: "Dormant" },
  { max: 29, tier: "Reactive" },
  { max: 49, tier: "Exploratory" },
  { max: 69, tier: "Operational" },
  { max: 87, tier: "Integrated" },
  { max: 100, tier: "AI-Native" },
];

function tierForScore(score: number): TierLabel {
  return SCORE_BANDS.find((b) => score <= b.max)!.tier;
}

function tierLabel(idx: number): TierLabel {
  return TIER_LABELS[Math.max(0, Math.min(5, idx))];
}

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

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

    // 4. Compute pillar tiers (mean tier of answered questions in each pillar)
    const pillarSums: Record<number, { sum: number; n: number }> = {};
    for (const r of responses) {
      const pillar = pillarOf.get(r.question_id);
      if (!pillar) continue;
      pillarSums[pillar] ??= { sum: 0, n: 0 };
      pillarSums[pillar].sum += r.tier;
      pillarSums[pillar].n += 1;
    }

    const pillarTiers: Record<number, number> = {};
    for (let p = 1; p <= 8; p++) {
      const agg = pillarSums[p];
      pillarTiers[p] = agg ? Math.round((agg.sum / agg.n) * 10) / 10 : 0;
    }

    // 5. Weighted overall AIOI on a 0–100 scale (tier 0..5 → 0..100 via /5)
    let weighted = 0;
    let weightUsed = 0;
    for (let p = 1; p <= 8; p++) {
      if (pillarSums[p]) {
        weighted += (pillarTiers[p] / 5) * 100 * PILLAR_WEIGHTS[p];
        weightUsed += PILLAR_WEIGHTS[p];
      }
    }
    const aioi = Math.round(weightUsed > 0 ? weighted / weightUsed : 0);
    const overallTier = tierForScore(aioi);

    // 6. Hotspots: bottom-quartile pillars (or weakest 3 if everyone clusters)
    const ranked = Object.entries(pillarTiers)
      .map(([p, t]) => ({ pillar: Number(p), tier: t }))
      .sort((a, b) => a.tier - b.tier);
    const cutoff = ranked[Math.min(2, ranked.length - 1)]?.tier ?? 0;
    const hotspots = ranked
      .filter((r) => r.tier <= cutoff)
      .slice(0, 3)
      .map((r) => ({
        pillar: r.pillar,
        name: PILLAR_NAMES[r.pillar],
        tier: r.tier,
        tierLabel: tierLabel(Math.round(r.tier)),
      }));

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

function fallbackDiagnosis(
  tier: TierLabel,
  hotspots: Array<{ name: string }>,
): string {
  const weakest = hotspots[0]?.name ?? "the operating model";
  return `Operating at ${tier}. The drag is in ${weakest} — that's where the next quarter has to land.`;
}

function fallbackPlan(
  hotspots: Array<{ pillar: number; tier: number }>,
  outcomes: Array<{ id: string; pillar: number; applies_to_tier: number; title: string }>,
) {
  const monthsArr: { month: number; title: string; rationale: string; outcome_ids: string[] }[] = [];
  for (let m = 1; m <= 3; m++) {
    const targetPillar = hotspots[(m - 1) % hotspots.length]?.pillar ?? 1;
    const tier = hotspots[(m - 1) % hotspots.length]?.tier ?? 0;
    const candidates = outcomes
      .filter((o) => o.pillar === targetPillar && o.applies_to_tier >= Math.floor(tier))
      .slice(0, 2);
    monthsArr.push({
      month: m,
      title: candidates[0]?.title ?? `Month ${m}`,
      rationale: "Foundations first, then leverage. This month tackles the lowest-scoring pillar.",
      outcome_ids: candidates.map((c) => c.id),
    });
  }
  return monthsArr;
}
