// Streaming AI chat assistant grounded in a single respondent's report.
// Lives behind the report page. Loads the respondent's scores, hotspots and
// Moves server-side and forwards the conversation to the Lovable AI Gateway.
//
// Auth: requires a signed-in user who owns the respondent (RLS enforced via
// `is_my_respondent` when we read context with the user's JWT).
//
// Quotas: free tier (no deep dive) = 3 user turns per respondent.
//         deep-dive unlocked        = 50 user turns per respondent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const FREE_TURN_LIMIT = 3;
const DEEPDIVE_TURN_LIMIT = 50;
const HISTORY_CAP = 30;
const MODEL = "google/gemini-3-flash-preview";

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

interface ChatBody {
  respondent_id: string;
  message: string;
}

function jsonError(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(ctx: {
  level: string;
  fn: string | null;
  size_band: string | null;
  aioi_score: number | null;
  overall_tier: string | null;
  pillar_tiers: Record<string, { tier: number; label: string; name: string }> | null;
  hotspots: Array<{ pillar: number; name: string; tier: number; tierLabel: string }> | null;
  diagnosis: string | null;
  recommendations: {
    headline_diagnosis?: string;
    personalised_intro?: string;
    moves: Array<{
      move_id: string;
      personalised_why_matters?: string;
      snapshot: {
        title: string;
        pillar: number;
        tier_band: string;
        why_matters: string | null;
        what_to_do: string | null;
        how_to_know: string | null;
        effort: number | null;
        impact: number | null;
      };
    }>;
  } | null;
}): string {
  const pillarLines = ctx.pillar_tiers
    ? Object.entries(ctx.pillar_tiers)
        .map(([k, v]) => `  - Pillar ${k} (${PILLAR_NAMES[Number(k)] ?? v.name}): tier ${v.tier} — ${v.label}`)
        .join("\n")
    : "  (not available)";

  const hotspotLines = ctx.hotspots && ctx.hotspots.length > 0
    ? ctx.hotspots.map((h) => `  - ${h.name} (Pillar ${h.pillar}): tier ${h.tier} — ${h.tierLabel}`).join("\n")
    : "  (none flagged)";

  const moveLines = ctx.recommendations?.moves?.length
    ? ctx.recommendations.moves
        .slice(0, 12)
        .map((m, i) => {
          const s = m.snapshot;
          const pName = PILLAR_NAMES[s.pillar] ?? `Pillar ${s.pillar}`;
          const why = m.personalised_why_matters || s.why_matters || "";
          return `  ${i + 1}. "${s.title}" — ${pName} · ${s.tier_band} band · effort ${s.effort ?? "?"} · impact ${s.impact ?? "?"}\n     Why it matters: ${why}\n     What to do: ${s.what_to_do ?? ""}\n     How you'll know: ${s.how_to_know ?? ""}`;
        })
        .join("\n\n")
    : "  (no Moves generated yet)";

  return `You are the AI Operating Index (AIOI) Report Assistant. You help one specific person make sense of their AI maturity report and turn the recommended Moves into action.

VOICE AND STYLE
- British English. No em-dashes (use commas, full stops, or "and"). No "delve", "leverage", "synergy", "navigate the landscape", "in today's fast-paced world".
- Direct, plain, useful. Short paragraphs. Bullet lists when helpful. Markdown formatting (bold, lists, tables) is fine.
- Speak to the respondent as "you", not "the user".

SCOPE
- You only discuss this report and how to act on it. If the user asks about anything outside their report (general trivia, code help, other companies, etc.), politely redirect: "I can only help with your AI Operating Index report and the Moves it recommends."
- Always cite Move titles in quotes when recommending action: e.g., "Start with 'Set a 90-day AI mandate' because…"
- Never invent scores, tiers, pillars, or Moves that are not in the context below. If asked about something not present, say so.
- If asked to compare to other organisations, refer only to the benchmark context if present, otherwise say the data is not available in this report.

THIS RESPONDENT'S REPORT
- Lens: ${ctx.level}${ctx.fn ? ` · function: ${ctx.fn}` : ""}${ctx.size_band ? ` · org size band: ${ctx.size_band}` : ""}
- AIOI score: ${ctx.aioi_score ?? "n/a"} / 100
- Overall tier: ${ctx.overall_tier ?? "n/a"}

Pillar tiers:
${pillarLines}

Top hotspots (weakest pillars to address first):
${hotspotLines}

${ctx.recommendations?.headline_diagnosis ? `Headline diagnosis: ${ctx.recommendations.headline_diagnosis}\n` : ""}${ctx.recommendations?.personalised_intro ? `Personalised intro: ${ctx.recommendations.personalised_intro}\n` : ""}${ctx.diagnosis ? `Long-form diagnosis: ${ctx.diagnosis}\n` : ""}
Ranked Moves (in recommended order):
${moveLines}

Help the user pick a starting Move, sequence them, draft briefs for stakeholders, or translate any of the above into a concrete next step. Keep answers tight: aim for under 200 words unless they ask for a longer artefact.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, { error: "method_not_allowed" });

  // 1. Auth — require a real user JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonError(401, { error: "unauthorized" });
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonError(401, { error: "unauthorized" });
  }
  const userId = userData.user.id;

  // 2. Validate body.
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, { error: "invalid_json" });
  }
  const respondentId = String(body.respondent_id ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!respondentId || respondentId.length > 64) return jsonError(400, { error: "invalid_respondent_id" });
  if (!message) return jsonError(400, { error: "empty_message" });
  if (message.length > 2000) return jsonError(400, { error: "message_too_long" });

  // 3. Verify respondent ownership + load context using the user's JWT
  // (so RLS gates everything by `is_my_respondent`).
  const { data: respondent, error: respErr } = await userClient
    .from("respondents")
    .select("id, level, function, org_size, user_id")
    .eq("id", respondentId)
    .maybeSingle();
  if (respErr || !respondent) return jsonError(404, { error: "report_not_found" });
  if (respondent.user_id !== userId) return jsonError(403, { error: "not_owner" });

  const { data: report } = await userClient
    .from("reports")
    .select("aioi_score, overall_tier, pillar_tiers, hotspots, diagnosis, recommendations")
    .eq("respondent_id", respondentId)
    .maybeSingle();

  // Count responses to determine deep-dive status.
  const { count: responseCount } = await userClient
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("respondent_id", respondentId);
  const hasDeepdive = (responseCount ?? 0) > 8;

  // 4. Quota check — count prior user turns.
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { count: priorTurns } = await service
    .from("report_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("respondent_id", respondentId)
    .eq("role", "user");

  const limit = hasDeepdive ? DEEPDIVE_TURN_LIMIT : FREE_TURN_LIMIT;
  if ((priorTurns ?? 0) >= limit) {
    return jsonError(402, {
      error: "quota_exceeded",
      limit,
      hasDeepdive,
      message: hasDeepdive
        ? "You've explored this report deeply. For more, get in touch."
        : "You've used your free questions on this report. Unlock the Deep Dive for full access.",
    });
  }

  // 5. Pull last N messages for history.
  const { data: history } = await service
    .from("report_chat_messages")
    .select("role, content, created_at")
    .eq("respondent_id", respondentId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_CAP);

  // 6. Persist the user message immediately so it survives stream failures.
  await service.from("report_chat_messages").insert({
    respondent_id: respondentId,
    role: "user",
    content: message,
  });

  // 7. Build payload for Lovable AI Gateway.
  const systemPrompt = buildSystemPrompt({
    level: respondent.level,
    fn: respondent.function,
    size_band: respondent.org_size,
    aioi_score: report?.aioi_score ?? null,
    overall_tier: (report?.overall_tier as string | null) ?? null,
    pillar_tiers: (report?.pillar_tiers as Record<string, { tier: number; label: string; name: string }> | null) ?? null,
    hotspots: (report?.hotspots as Array<{ pillar: number; name: string; tier: number; tierLabel: string }> | null) ?? null,
    diagnosis: (report?.diagnosis as string | null) ?? null,
    // deno-lint-ignore no-explicit-any
    recommendations: ((report?.recommendations as any) ?? null),
  });

  const messages = [
    { role: "system", content: systemPrompt },
    ...((history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))),
    { role: "user", content: message },
  ];

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  });

  if (!upstream.ok) {
    if (upstream.status === 429) {
      return jsonError(429, { error: "rate_limited", message: "Too many requests, try again in a moment." });
    }
    if (upstream.status === 402) {
      return jsonError(402, { error: "credits_exhausted", message: "AI credits exhausted for this workspace." });
    }
    const t = await upstream.text();
    console.error("AI gateway error", upstream.status, t);
    return jsonError(500, { error: "ai_gateway_error" });
  }

  // 8. Pipe the SSE stream straight back to the client and persist the
  // assembled assistant reply at the end.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let assistantText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // Forward raw bytes to the client (it knows how to parse SSE).
          controller.enqueue(value);
          // Also parse line-by-line locally so we can persist the final text.
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string") assistantText += delta;
            } catch {
              // Partial JSON; will arrive on the next chunk via SSE forwarding.
            }
          }
        }
      } catch (e) {
        console.error("stream error", e);
      } finally {
        controller.close();
        if (assistantText.trim().length > 0) {
          await service.from("report_chat_messages").insert({
            respondent_id: respondentId,
            role: "assistant",
            content: assistantText,
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
