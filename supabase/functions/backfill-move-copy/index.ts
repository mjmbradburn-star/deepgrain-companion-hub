// backfill-move-copy
// One-shot content backfill. For active Moves that have a populated `body`
// but are missing one or more of `why_matters` / `what_to_do` / `how_to_know`,
// uses Lovable AI Gateway to draft the missing fields in the AIOI voice and
// updates the row.
//
// Idempotent: re-running only touches rows that are still incomplete.
// Service-role gated. Dry-run by default — caller must pass `apply: true`
// to actually write.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICE_MODEL = Deno.env.get("VOICE_WRAPPER_MODEL") ?? "google/gemini-2.5-flash";
const VOICE_TIMEOUT_MS = 12_000;

interface BackfillBody {
  apply?: boolean;
  limit?: number;
  delay_ms?: number;
}

interface MoveRow {
  id: string;
  title: string;
  pillar: number;
  tier_band: string | null;
  lens: string;
  function: string | null;
  body: string | null;
  why_matters: string | null;
  what_to_do: string | null;
  how_to_know: string | null;
}

interface PerRowResult {
  id: string;
  title: string;
  status: "ok" | "skipped_no_body" | "ai_error" | "write_error" | "would_update";
  filled?: string[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      return json({ error: "Missing service config" }, 500);
    }

    // Service-role gating.
    const authHeader = req.headers.get("Authorization") ?? "";
    const apikeyHeader = (req.headers.get("apikey") ?? "").trim();
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : "";
    if (token !== SUPABASE_SERVICE_ROLE_KEY && apikeyHeader !== SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as BackfillBody;
    const apply = body.apply === true;
    const limit = clampInt(body.limit, 1, 200, 100);
    const delayMs = clampInt(body.delay_ms, 0, 5_000, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pull every active Move missing at least one structured field.
    const { data: rows, error: qErr } = await admin
      .from("outcomes_library")
      .select("id, title, pillar, tier_band, lens, function, body, why_matters, what_to_do, how_to_know")
      .eq("active", true)
      .or(
        "why_matters.is.null,what_to_do.is.null,how_to_know.is.null",
      )
      .order("pillar", { ascending: true })
      .limit(limit);
    if (qErr) return json({ error: qErr.message }, 500);

    const candidates = (rows ?? []) as MoveRow[];
    const results: PerRowResult[] = [];
    const startedAt = Date.now();

    for (const row of candidates) {
      const needsWhy = !row.why_matters?.trim();
      const needsWhat = !row.what_to_do?.trim();
      const needsHow = !row.how_to_know?.trim();
      if (!needsWhy && !needsWhat && !needsHow) continue;

      const seed = (row.body ?? "").trim();
      if (!seed && needsWhat) {
        results.push({ id: row.id, title: row.title, status: "skipped_no_body" });
        continue;
      }

      // For dry-run we just record what would change.
      if (!apply) {
        const filled = [
          needsWhy ? "why_matters" : null,
          needsWhat ? "what_to_do" : null,
          needsHow ? "how_to_know" : null,
        ].filter(Boolean) as string[];
        results.push({ id: row.id, title: row.title, status: "would_update", filled });
        continue;
      }

      try {
        const drafted = await draftMissingFields({
          apiKey: LOVABLE_API_KEY,
          row,
          needsWhy,
          needsWhat,
          needsHow,
        });

        const update: Record<string, string> = {};
        if (needsWhy && drafted.why_matters) update.why_matters = drafted.why_matters;
        if (needsWhat) update.what_to_do = drafted.what_to_do ?? seed;
        if (needsHow && drafted.how_to_know) update.how_to_know = drafted.how_to_know;
        // Touch reviewed-at so the Stale view reflects the work.
        update.last_reviewed_at = new Date().toISOString();

        const { error: upErr } = await admin
          .from("outcomes_library")
          .update(update)
          .eq("id", row.id);
        if (upErr) {
          results.push({ id: row.id, title: row.title, status: "write_error", error: upErr.message });
        } else {
          results.push({
            id: row.id,
            title: row.title,
            status: "ok",
            filled: Object.keys(update).filter((k) => k !== "last_reviewed_at"),
          });
        }
      } catch (err) {
        results.push({
          id: row.id,
          title: row.title,
          status: "ai_error",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    const summary = summarise(results);
    const totalMs = Date.now() - startedAt;

    admin.from("events").insert({
      name: apply ? "moves.copy_backfill_applied" : "moves.copy_backfill_dry_run",
      payload: { limit, delay_ms: delayMs, total_ms: totalMs, ...summary },
    }).then(({ error }) => {
      if (error) console.error("[backfill-move-copy] audit insert failed", error);
    });

    return json({ ok: true, apply, total_ms: totalMs, ...summary, results });
  } catch (err) {
    console.error("[backfill-move-copy] fatal", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─── AI drafting ────────────────────────────────────────────────────────────

interface DraftArgs {
  apiKey: string;
  row: MoveRow;
  needsWhy: boolean;
  needsWhat: boolean;
  needsHow: boolean;
}

async function draftMissingFields(args: DraftArgs): Promise<{
  why_matters?: string;
  what_to_do?: string;
  how_to_know?: string;
}> {
  const { row } = args;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  if (args.needsWhy) {
    properties.why_matters = {
      type: "string",
      description:
        "1-2 short sentences. Why this Move matters for an organisation at this tier_band on this pillar. Plain, direct. No marketing words.",
    };
    required.push("why_matters");
  }
  if (args.needsWhat) {
    properties.what_to_do = {
      type: "string",
      description:
        "The concrete action. Use the supplied seed copy verbatim if it already reads as a clear instruction. Otherwise tighten it.",
    };
    required.push("what_to_do");
  }
  if (args.needsHow) {
    properties.how_to_know = {
      type: "string",
      description:
        "1-2 sentences. The signal that tells you this Move has landed. Behavioural or artefactual, not metric theatre.",
    };
    required.push("how_to_know");
  }

  const tools = [{
    type: "function",
    function: {
      name: "publish_move_copy",
      description: "Publish the missing structured fields for this AIOI Move.",
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  }];

  const system = `You write copy for the AIOI playbook. Voice rules (non-negotiable):
- British English. Direct, dry, plain.
- Short sentences. Never use: "unlock", "leverage", "delve", "synergy", "journey", "exciting", "game-changing", "revolutionary", "seamless", "cutting-edge".
- Never use em-dashes. Use full stops, commas, semicolons.
- Never invent tools, vendors or statistics.
- Address the reader as "you" or describe the organisation in the third person consistently.
- Do not patronise. The reader already runs the business.

You are filling gaps in an existing Move. The seed copy below is the canonical action. Stay faithful to it.`;

  const user = `Move:
- Title: ${row.title}
- Pillar: ${row.pillar}
- Tier band: ${row.tier_band ?? "(unknown)"}
- Lens: ${row.lens}
- Function: ${row.function ?? "(none)"}

Seed copy (the existing action):
"""
${row.body ?? "(none)"}
"""

Existing fields (do not rewrite, just for context):
- why_matters: ${row.why_matters ?? "(missing)"}
- what_to_do: ${row.what_to_do ?? "(missing)"}
- how_to_know: ${row.how_to_know ?? "(missing)"}

Now call publish_move_copy and write only the missing fields listed in the schema.`;

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
        tool_choice: { type: "function", function: { name: "publish_move_copy" } },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  const parsed = JSON.parse(call.function.arguments) as Record<string, string>;

  const out: { why_matters?: string; what_to_do?: string; how_to_know?: string } = {};
  if (args.needsWhy && parsed.why_matters) out.why_matters = sanitise(parsed.why_matters);
  if (args.needsWhat && parsed.what_to_do) out.what_to_do = sanitise(parsed.what_to_do);
  if (args.needsHow && parsed.how_to_know) out.how_to_know = sanitise(parsed.how_to_know);
  return out;
}

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
  /—/g,
];

function sanitise(input: string): string {
  let out = String(input ?? "").trim();
  for (const re of BANNED_PATTERNS) {
    out = out.replace(re, (match) => {
      const lower = match.toLowerCase();
      if (lower === "—") return ", ";
      if (lower.includes("unlock")) return "open up";
      if (lower.includes("leverag")) return "use";
      if (lower.includes("delve")) return "look at";
      if (lower.includes("synerg")) return "fit";
      if (lower.includes("journey")) return "path";
      if (lower.includes("exciting")) return "useful";
      if (lower.includes("seamless")) return "clean";
      if (lower.includes("cutting-edge") || lower.includes("cutting edge")) return "current";
      return "";
    });
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function summarise(results: PerRowResult[]) {
  const counts = {
    processed: results.length,
    ok: 0,
    would_update: 0,
    skipped_no_body: 0,
    ai_errors: 0,
    write_errors: 0,
  };
  for (const r of results) {
    if (r.status === "ok") counts.ok++;
    else if (r.status === "would_update") counts.would_update++;
    else if (r.status === "skipped_no_body") counts.skipped_no_body++;
    else if (r.status === "ai_error") counts.ai_errors++;
    else if (r.status === "write_error") counts.write_errors++;
  }
  return counts;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
