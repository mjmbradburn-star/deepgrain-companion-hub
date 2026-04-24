// recommend-report
// Phase B — Voice Wrapper.
//
// Pulls a respondent's scored profile, calls the pure Selection Engine to pick
// the right Moves from outcomes_library, then asks Lovable AI Gateway
// (gemini-2.5-flash by default) to wrap the selection in personalised voice
// copy. Result cached on reports.recommendations + move_ids.
//
// Auth: caller JWT validated. Respondent ownership re-verified. Service-role
// is used to read outcomes_library / write reports.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  selectMoves,
  lensFromLevel,
  bandify,
  type Lens,
  type Move,
  type RespondentProfile,
  type SelectedMove,
  type SizeBand,
} from "../_shared/selection-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICE_MODEL = Deno.env.get("VOICE_WRAPPER_MODEL") ?? "google/gemini-2.5-flash";
const VOICE_TIMEOUT_MS = 8_000;

// Words/phrases we don't want in the wrapper output.
const BANNED_PATTERNS: RegExp[] = [
  /\bunlock(ing|ed|s)?\b/gi,
  /\bleverag(e|ed|es|ing)\b/gi,
  /\bdelve(s|d|ing)?\b/gi,
  /\bsynerg(y|ies|istic)\b/gi,
  /\bjourney(s)?\b/gi,
  /\bexciting\b/gi,
  /\bgame[- ]chang(er|ing|ed)\b/gi,
  /\brevolution(ary|ise|ize)?\b/gi,
  /\bseamless(ly)?\b/gi,
  /\bcutting[- ]edge\b/gi,
  /\bin today'?s (fast[- ]paced|rapidly[- ]changing) world\b/gi,
  /—/g, // em-dash
];

interface RecRequestBody {
  respondent_id?: string;
  // Internal call from score-responses bypasses user JWT verification.
  internal?: boolean;
  internal_secret?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = (await req.json().catch(() => ({}))) as RecRequestBody;
    const respondentId = typeof body.respondent_id === "string" ? body.respondent_id : null;
    if (!respondentId) return json({ error: "respondent_id is required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: either internal (called from score-responses with service-role) or user JWT.
    const internalCall = body.internal === true &&
      body.internal_secret === SUPABASE_SERVICE_ROLE_KEY;

    if (!internalCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

      const { data: r } = await admin
        .from("respondents")
        .select("user_id")
        .eq("id", respondentId)
        .maybeSingle();
      if (!r || r.user_id !== userData.user.id) return json({ error: "Forbidden" }, 403);
    }

    // 1. Load respondent + report (need scored profile).
    const { data: respondent, error: rErr } = await admin
      .from("respondents")
      .select("id, slug, level, function, role, org_size, pain, region, sector, legacy_size_band")
      .eq("id", respondentId)
      .maybeSingle();
    if (rErr || !respondent) return json({ error: "Respondent not found" }, 404);

    const { data: report } = await admin
      .from("reports")
      .select("id, aioi_score, overall_tier, pillar_tiers, hotspots, cap_flags")
      .eq("respondent_id", respondentId)
      .maybeSingle();
    if (!report) return json({ error: "Report not yet scored" }, 409);

    // 2. Build RespondentProfile for the engine.
    const lens: Lens = lensFromLevel(respondent.level);
    const pillarTiers: Record<number, number> = {};
    if (report.pillar_tiers && typeof report.pillar_tiers === "object") {
      for (const [k, v] of Object.entries(report.pillar_tiers as Record<string, unknown>)) {
        const tier = typeof v === "number"
          ? v
          : (v as { tier?: number })?.tier;
        if (typeof tier === "number") pillarTiers[Number(k)] = tier;
      }
    }

    const capPillars: number[] = Array.isArray(report.cap_flags)
      ? (report.cap_flags as Array<{ pillar?: number }>)
        .map((c) => c?.pillar)
        .filter((p): p is number => typeof p === "number")
      : [];

    const sizeBand = normaliseSizeBand(respondent.org_size, respondent.legacy_size_band);
    const profile: RespondentProfile = {
      lens,
      function: respondent.function ?? null,
      size_band: sizeBand,
      pillar_tiers: pillarTiers,
      cap_flag_pillars: capPillars,
    };

    // 3. Load active playbook scoped to candidate lens (and function for functional).
    let playbookQuery = admin
      .from("outcomes_library")
      .select(
        "id, lens, pillar, tier_band, function, size_bands, title, body, why_matters, what_to_do, how_to_know, effort, impact, time_to_value, tags, cta_type, cta_url, active, applies_to_tier, last_reviewed_at",
      )
      .eq("active", true)
      .eq("lens", lens);
    if (lens === "functional" && respondent.function) {
      playbookQuery = playbookQuery.or(
        `function.is.null,function.eq.${respondent.function}`,
      );
    }
    const { data: playbookRows, error: playbookErr } = await playbookQuery;
    if (playbookErr) return json({ error: "Could not load playbook" }, 500);

    const playbook = (playbookRows ?? []) as Move[];
    const selected: SelectedMove[] = selectMoves(profile, playbook);

    // Coverage guardrail: if the engine returns nothing for a lens that should
    // produce output, log it so we can see playbook gaps in production rather
    // than only via user complaints. Fire-and-forget; never blocks the response.
    if (selected.length === 0) {
      admin.from("events").insert({
        name: "recommendations.empty_result",
        payload: {
          respondent_id: respondentId,
          lens,
          function: respondent.function,
          size_band: sizeBand,
          pillar_tiers: pillarTiers,
          cap_flag_pillars: capPillars,
          playbook_pool_size: playbook.length,
        },
      }).then(({ error }) => {
        if (error) console.error("[recommend-report] empty_result event insert failed", error);
      });
    }
    // 4. Voice Wrapper — Lovable AI tool-calling. Fall back to bare render.
    let recommendations: Recommendations;
    let usedFallback = false;
    if (!LOVABLE_API_KEY || selected.length === 0) {
      recommendations = buildFallback(selected, respondent, report);
      usedFallback = true;
    } else {
      try {
        const wrapped = await callVoiceWrapper({
          apiKey: LOVABLE_API_KEY,
          respondent,
          report,
          lens,
          selected,
        });
        recommendations = stitchRecommendations(wrapped, selected, respondent);
      } catch (err) {
        console.error("[recommend-report] voice wrapper failed, using fallback:", err);
        recommendations = buildFallback(selected, respondent, report);
        usedFallback = true;
      }
    }

    // 5. Persist on the report row.
    const moveIds = selected.map((s) => s.id);
    const { error: updateErr } = await admin
      .from("reports")
      .update({
        recommendations,
        move_ids: moveIds,
        recommendations_generated_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    if (updateErr) {
      console.error("[recommend-report] persist failed:", updateErr);
      return json({ error: "Could not persist recommendations" }, 500);
    }

    return json({
      ok: true,
      slug: respondent.slug,
      move_count: selected.length,
      used_fallback: usedFallback,
    });
  } catch (err) {
    console.error("[recommend-report] error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ─── Voice Wrapper ─────────────────────────────────────────────────────────

interface VoiceCallArgs {
  apiKey: string;
  respondent: {
    level: string;
    function: string | null;
    role: string | null;
    org_size: string | null;
    pain: string | null;
    sector: string | null;
    region: string | null;
  };
  report: {
    aioi_score: number | null;
    overall_tier: string | null;
    pillar_tiers: unknown;
  };
  lens: Lens;
  selected: SelectedMove[];
}

interface WrapperOutput {
  headline_diagnosis: string;
  personalised_intro: string;
  moves: Array<{
    move_id: string;
    personalised_why_matters: string;
    personalised_what_to_do_intro?: string;
  }>;
  closing_cta: string;
}

interface Recommendations extends WrapperOutput {
  generated_at: string;
  voice_model: string;
  used_fallback: boolean;
  moves: Array<{
    move_id: string;
    personalised_why_matters: string;
    personalised_what_to_do_intro?: string;
    role?: "forced_rank";
    // Snapshot of the source Move at generation time so the UI never has to
    // refetch and stays consistent if the library changes later.
    snapshot: {
      title: string;
      pillar: number;
      tier_band: string;
      lens: Lens;
      function: string | null;
      why_matters: string | null;
      what_to_do: string | null;
      how_to_know: string | null;
      effort: number | null;
      impact: number | null;
      tags: string[] | null;
      cta_type: string | null;
      cta_url: string | null;
    };
  }>;
}

async function callVoiceWrapper(args: VoiceCallArgs): Promise<WrapperOutput> {
  const allowedIds = args.selected.map((m) => m.id);
  const tools = [{
    type: "function",
    function: {
      name: "publish_recommendations",
      description: "Publish personalised recommendations for this AIOI report.",
      parameters: {
        type: "object",
        properties: {
          headline_diagnosis: {
            type: "string",
            description: "One sentence, max 24 words. Names the operating shape — not the score. British English. No marketing words.",
          },
          personalised_intro: {
            type: "string",
            description: "Two short sentences. MUST reference the respondent's stated pain or role. Direct, plain. No hype.",
          },
          moves: {
            type: "array",
            minItems: 1,
            maxItems: args.selected.length,
            items: {
              type: "object",
              properties: {
                move_id: {
                  type: "string",
                  enum: allowedIds,
                  description: "Must be one of the supplied Move ids.",
                },
                personalised_why_matters: {
                  type: "string",
                  description: "1-2 sentences. Why this Move matters for THIS respondent given their pain/role/sector. Reference specifics from the brief, not the Move's generic copy.",
                },
                personalised_what_to_do_intro: {
                  type: "string",
                  description: "Optional one-sentence lede before the canonical what_to_do. Skip if it would just paraphrase.",
                },
              },
              required: ["move_id", "personalised_why_matters"],
              additionalProperties: false,
            },
          },
          closing_cta: {
            type: "string",
            description: "One sentence closer. Tier-aware: low → start with the first Move; mid → sequence the next 30 days; high → consolidate and govern.",
          },
        },
        required: ["headline_diagnosis", "personalised_intro", "moves", "closing_cta"],
        additionalProperties: false,
      },
    },
  }];

  const system = `You write the personalised wrapper for an AI maturity report called the AIOI.

Voice rules (non-negotiable):
- British English. Direct, dry, plain.
- Short sentences. No marketing words: never use "unlock", "leverage", "delve", "synergy", "journey", "exciting", "game-changing", "revolutionary", "seamless", "cutting-edge".
- Never use em-dashes. Use full stops, commas, semicolons.
- Never invent tools, vendors, statistics or capabilities. Only reference what is in the supplied Move copy or respondent context.
- Address the reader as "you". Do not patronise. They already know AI matters.
- Do not restate the AIOI score in prose.
- Tell them what their operating shape is and what to do about it.

You will be given a respondent profile and a pre-selected list of Moves. Your job:
1. Write the headline diagnosis naming the operating shape.
2. Write a personalised intro that explicitly references their pain or role.
3. For each supplied Move, write a short personalised "why this matters for you" that ties the generic Move to their specific situation.
4. Write a closing CTA appropriate to their overall tier.

Constraints:
- Do not add Moves that aren't in the supplied list.
- Do not change Move ids.
- Do not change the canonical what_to_do or how_to_know — those render verbatim from the library.`;

  const user = `Respondent profile:
- Lens: ${args.lens}
- Level: ${args.respondent.level}
- Function: ${args.respondent.function ?? "(none)"}
- Role: ${args.respondent.role ?? "(unknown)"}
- Org size: ${args.respondent.org_size ?? "(unknown)"}
- Sector: ${args.respondent.sector ?? "(unknown)"}
- Region: ${args.respondent.region ?? "(unknown)"}
- Stated pain: ${args.respondent.pain ?? "(not given)"}

Scored profile:
- AIOI: ${args.report.aioi_score ?? "?"} (overall tier: ${args.report.overall_tier ?? "?"})
- Pillar tiers: ${JSON.stringify(args.report.pillar_tiers)}

Selected Moves (write personalised_why_matters for each, keep ids exactly):
${args.selected.map((m, i) =>
    `[${i + 1}] id=${m.id}
     pillar=${m.pillar} band=${m.tier_band} effort=${m.effort ?? "?"}
     title: ${m.title}
     generic why_matters: ${m.why_matters ?? "(none)"}
     generic what_to_do: ${m.what_to_do ?? m.body ?? "(none)"}`
  ).join("\n\n")}

Now call publish_recommendations.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VOICE_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VOICE_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "publish_recommendations" } },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  const parsed = JSON.parse(call.function.arguments) as WrapperOutput;

  // Validate + sanitise.
  const allowed = new Set(allowedIds);
  parsed.moves = (parsed.moves ?? []).filter((m) => allowed.has(m.move_id));
  if (parsed.moves.length === 0) throw new Error("No valid moves in wrapper output");

  parsed.headline_diagnosis = sanitise(parsed.headline_diagnosis);
  parsed.personalised_intro = sanitise(parsed.personalised_intro);
  parsed.closing_cta = sanitise(parsed.closing_cta);
  for (const m of parsed.moves) {
    m.personalised_why_matters = sanitise(m.personalised_why_matters);
    if (m.personalised_what_to_do_intro) {
      m.personalised_what_to_do_intro = sanitise(m.personalised_what_to_do_intro);
    }
  }
  return parsed;
}

function sanitise(input: string): string {
  let out = String(input ?? "").trim();
  for (const re of BANNED_PATTERNS) out = out.replace(re, (match) => softReplace(match));
  // Collapse double spaces from substitutions.
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

function softReplace(match: string): string {
  const lower = match.toLowerCase();
  if (lower === "—") return ". ";
  if (lower.includes("unlock")) return "open up";
  if (lower.includes("leverag")) return "use";
  if (lower.includes("delve")) return "look at";
  if (lower.includes("synerg")) return "fit";
  if (lower.includes("journey")) return "path";
  if (lower.includes("exciting")) return "useful";
  if (lower.includes("seamless")) return "clean";
  if (lower.includes("cutting-edge") || lower.includes("cutting edge")) return "current";
  return "";
}

// ─── Stitching + fallback ──────────────────────────────────────────────────

function stitchRecommendations(
  wrapped: WrapperOutput,
  selected: SelectedMove[],
  respondent: { function: string | null },
): Recommendations {
  const wrappedById = new Map(wrapped.moves.map((m) => [m.move_id, m]));
  const moves: Recommendations["moves"] = selected.map((m) => {
    const w = wrappedById.get(m.id);
    return {
      move_id: m.id,
      personalised_why_matters: w?.personalised_why_matters ?? m.why_matters ?? "",
      personalised_what_to_do_intro: w?.personalised_what_to_do_intro,
      role: m.role,
      snapshot: {
        title: m.title,
        pillar: m.pillar,
        tier_band: m.tier_band,
        lens: m.lens,
        function: m.function,
        why_matters: m.why_matters,
        what_to_do: m.what_to_do ?? m.body ?? null,
        how_to_know: m.how_to_know,
        effort: m.effort,
        impact: m.impact,
        tags: m.tags,
        cta_type: m.cta_type,
        cta_url: m.cta_url,
      },
    };
  });
  return {
    headline_diagnosis: wrapped.headline_diagnosis,
    personalised_intro: wrapped.personalised_intro,
    closing_cta: wrapped.closing_cta,
    moves,
    generated_at: new Date().toISOString(),
    voice_model: VOICE_MODEL,
    used_fallback: false,
  };
}

function buildFallback(
  selected: SelectedMove[],
  respondent: { role: string | null; pain: string | null; function: string | null },
  report: { overall_tier: string | null },
): Recommendations {
  const tier = report.overall_tier ?? "Exploring";
  const intro = respondent.pain
    ? `You named ${truncate(respondent.pain, 80)} as the live problem. The Moves below are the shortest path from where you are to where that stops being the bottleneck.`
    : `You sit at ${tier}. The Moves below are the shortest path to the next operating shape.`;
  return {
    headline_diagnosis: fallbackDiagnosisCopy(tier),
    personalised_intro: intro,
    closing_cta: fallbackClosingCta(tier),
    moves: selected.map((m) => ({
      move_id: m.id,
      personalised_why_matters: m.why_matters ?? "",
      role: m.role,
      snapshot: {
        title: m.title,
        pillar: m.pillar,
        tier_band: m.tier_band,
        lens: m.lens,
        function: m.function,
        why_matters: m.why_matters,
        what_to_do: m.what_to_do ?? m.body ?? null,
        how_to_know: m.how_to_know,
        effort: m.effort,
        impact: m.impact,
        tags: m.tags,
        cta_type: m.cta_type,
        cta_url: m.cta_url,
      },
    })),
    generated_at: new Date().toISOString(),
    voice_model: VOICE_MODEL,
    used_fallback: true,
  };
}

function fallbackDiagnosisCopy(tier: string): string {
  switch (tier) {
    case "Dormant": return "You are pre-AI in operating shape. Foundations come before tooling.";
    case "Exploring": return "You have pockets of activity but no operating model. The next step is to make AI a function, not a hobby.";
    case "Deployed": return "You have AI in production but it does not yet compound. Govern, measure, and connect.";
    case "Integrated": return "AI is part of how work flows. The constraint now is consistency and governance, not enthusiasm.";
    case "Leveraged": return "AI shapes outcomes across the operating model. Defend the gains and harden the controls.";
    case "AI-Native": return "AI is the substrate of how you operate. Your job is to keep raising the floor.";
    default: return "Your operating shape needs sequencing before scale.";
  }
}

function fallbackClosingCta(tier: string): string {
  if (tier === "Dormant" || tier === "Exploring") {
    return "Start with the first Move this week. Pace beats plan at this stage.";
  }
  if (tier === "Deployed" || tier === "Integrated") {
    return "Sequence these Moves across the next 30 days. Review what stuck before adding more.";
  }
  return "Consolidate, govern, and treat the highest-impact Move as a board-level commitment.";
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trim() + "…";
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normaliseSizeBand(orgSize: string | null, legacy: string | null): SizeBand | null {
  const raw = (legacy ?? orgSize ?? "").trim();
  if (!raw) return null;
  const valid: SizeBand[] = ["S", "M1", "M2", "M3", "L1", "L2", "XL"];
  if (valid.includes(raw as SizeBand)) return raw as SizeBand;
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
