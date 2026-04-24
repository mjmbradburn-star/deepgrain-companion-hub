// Expands a single Move into 3-5 concrete checklist items the user can add
// to their Next Actions. Uses the Lovable AI Gateway with tool-calling so we
// get strict JSON back. Returns the items only — the client decides which to
// persist via the standard supabase-js client (RLS gates the writes).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-3-flash-preview";

interface Body {
  respondent_id: string;
  move_id: string;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json(401, { error: "unauthorized" });

  let body: Body;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const respondentId = String(body.respondent_id ?? "").trim();
  const moveId = String(body.move_id ?? "").trim();
  if (!respondentId || !moveId) return json(400, { error: "missing_ids" });

  // Verify the respondent owns this report and the move appears in their recs.
  const { data: respondent } = await userClient
    .from("respondents")
    .select("id, level, function, org_size, user_id")
    .eq("id", respondentId)
    .maybeSingle();
  if (!respondent || respondent.user_id !== u.user.id) {
    return json(403, { error: "not_owner" });
  }

  const { data: report } = await userClient
    .from("reports")
    .select("recommendations, hotspots")
    .eq("respondent_id", respondentId)
    .maybeSingle();

  // deno-lint-ignore no-explicit-any
  const moves = (report?.recommendations as any)?.moves ?? [];
  // deno-lint-ignore no-explicit-any
  const move = moves.find((m: any) => m.move_id === moveId);
  if (!move) return json(404, { error: "move_not_in_report" });

  const snapshot = move.snapshot ?? {};
  const pillarName = PILLAR_NAMES[snapshot.pillar] ?? `Pillar ${snapshot.pillar}`;

  const systemPrompt = `You are the AIOI Report Assistant. Convert one recommended Move into 3-5 concrete, do-able checklist items the user can tick off in the next 30 days.

VOICE: British English, direct, plain. No em-dashes. No "leverage", "delve", "synergy". Each item should start with a verb and be doable in one sitting or one short meeting. No vague items like "think about" or "explore".

CONTEXT
- Respondent lens: ${respondent.level}${respondent.function ? ` · function ${respondent.function}` : ""}${respondent.org_size ? ` · size ${respondent.org_size}` : ""}
- Move title: "${snapshot.title}"
- Pillar: ${pillarName}
- Why it matters: ${move.personalised_why_matters || snapshot.why_matters || ""}
- What to do: ${snapshot.what_to_do ?? ""}
- How you'll know it worked: ${snapshot.how_to_know ?? ""}

Return 3-5 items. Suggest a sensible due date offset in days from today (3, 7, 14, 21, or 30) for each item, sequenced earliest first.`;

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Expand "${snapshot.title}" into a checklist.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_checklist",
          description: "Emit the checklist of next actions.",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Imperative, ≤90 chars." },
                    due_in_days: { type: "integer", enum: [3, 7, 14, 21, 30] },
                  },
                  required: ["title", "due_in_days"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_checklist" } },
    }),
  });

  if (!upstream.ok) {
    if (upstream.status === 429) return json(429, { error: "rate_limited" });
    if (upstream.status === 402) return json(402, { error: "credits_exhausted" });
    const t = await upstream.text();
    console.error("AI gateway error", upstream.status, t);
    return json(500, { error: "ai_gateway_error" });
  }

  const completion = await upstream.json();
  const call = completion.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return json(500, { error: "no_tool_call" });

  let parsed: { items: Array<{ title: string; due_in_days: number }> };
  try { parsed = JSON.parse(call.function.arguments); } catch {
    return json(500, { error: "bad_tool_args" });
  }

  // Compute concrete due_date strings (YYYY-MM-DD) for the client.
  const today = new Date();
  const items = parsed.items.map((it, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() + it.due_in_days);
    return {
      title: it.title.slice(0, 200),
      due_date: d.toISOString().slice(0, 10),
      sort_order: idx,
    };
  });

  return json(200, { items, move_title: snapshot.title });
});
