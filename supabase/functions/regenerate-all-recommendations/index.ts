// regenerate-all-recommendations
// Phase E backfill — populates `reports.recommendations` and `reports.move_ids`
// for existing reports by invoking `recommend-report` internally per respondent.
//
// Service-role gated (no public callers). Supports batch windowing, single-slug
// targeting, force overwrite, dry-run, and inter-call rate limiting so we don't
// flood the AI Gateway. Aggregates per-respondent outcomes and emits an event
// row so each run is auditable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BackfillBody {
  apply?: boolean;            // false = dry run (no writes, no AI calls beyond reporting)
  limit?: number;             // batch size (default 25, max 200)
  offset?: number;            // window into the eligible set (default 0)
  slug?: string;              // single-respondent retarget
  force?: boolean;            // overwrite even if recommendations already present
  delay_ms?: number;          // gap between calls — protects AI Gateway rate limits
}

interface PerRespondentResult {
  respondent_id: string;
  slug: string;
  status: "skipped_existing" | "missing_report" | "ok" | "ok_fallback" | "error";
  http_status?: number;
  used_fallback?: boolean;
  moves_count?: number;
  duration_ms?: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Missing service config" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const apikeyHeader = (req.headers.get("apikey") ?? "").trim();
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : "";
    if (!await isServiceRoleRequest(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, token, apikeyHeader)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as BackfillBody;
    const apply = body.apply === true;
    const limit = clampInt(body.limit, 1, 200, 25);
    const offset = clampInt(body.offset, 0, 1_000_000, 0);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const force = body.force === true;
    const delayMs = clampInt(body.delay_ms, 0, 5_000, 250);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Eligible set: rows in `reports` (joined to respondents for slug). We
    // can't rely on a PostgREST FK shortcut between reports↔respondents, so we
    // query reports directly and look up respondent metadata separately.
    let q = admin
      .from("reports")
      .select("id, respondent_id, recommendations")
      .order("created_at", { ascending: true });

    if (force) {
      // include all
    } else {
      q = q.is("recommendations", null);
    }

    if (slug) {
      // Resolve slug → respondent_id, then narrow.
      const { data: r, error: sErr } = await admin
        .from("respondents")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (sErr) return json({ error: sErr.message }, 500);
      if (!r) return json({ error: "Respondent not found for slug" }, 404);
      q = q.eq("respondent_id", r.id);
    } else {
      q = q.range(offset, offset + limit - 1);
    }

    const { data: reportRows, error: rowsErr } = await q;
    if (rowsErr) return json({ error: rowsErr.message }, 500);

    const reportArr = (reportRows ?? []) as Array<{ id: string; respondent_id: string; recommendations: unknown }>;

    // Hydrate slugs in one shot for clean reporting.
    const respondentIds = reportArr.map((r) => r.respondent_id);
    const slugByRespondent = new Map<string, string>();
    if (respondentIds.length > 0) {
      const { data: respRows } = await admin
        .from("respondents")
        .select("id, slug, submitted_at")
        .in("id", respondentIds);
      for (const r of (respRows ?? []) as Array<{ id: string; slug: string; submitted_at: string | null }>) {
        if (r.submitted_at) slugByRespondent.set(r.id, r.slug);
      }
    }

    type Row = { respondent_id: string; slug: string; recommendations: unknown };
    const candidates: Row[] = reportArr
      .filter((r) => slugByRespondent.has(r.respondent_id))
      .map((r) => ({
        respondent_id: r.respondent_id,
        slug: slugByRespondent.get(r.respondent_id)!,
        recommendations: r.recommendations,
      }));

    const results: PerRespondentResult[] = [];
    const startedAt = Date.now();

    for (const row of candidates) {
      const hasRecs = Array.isArray(row.reports) && row.reports.some((r) => r.recommendations !== null);
      if (hasRecs && !force) {
        results.push({ respondent_id: row.id, slug: row.slug, status: "skipped_existing" });
        continue;
      }
      if (!Array.isArray(row.reports) || row.reports.length === 0) {
        results.push({ respondent_id: row.id, slug: row.slug, status: "missing_report" });
        continue;
      }

      if (!apply) {
        // Dry-run: we'd attempt this respondent but make no calls.
        results.push({ respondent_id: row.id, slug: row.slug, status: "ok" });
        continue;
      }

      const t0 = Date.now();
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/recommend-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Service-role auth so the called function trusts the internal flag.
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            respondent_id: row.id,
            internal: true,
            internal_secret: SUPABASE_SERVICE_ROLE_KEY,
          }),
        });

        const duration = Date.now() - t0;
        const text = await resp.text();
        let parsed: { used_fallback?: boolean; moves?: unknown[] } | null = null;
        try { parsed = JSON.parse(text); } catch { /* leave null */ }

        if (!resp.ok) {
          results.push({
            respondent_id: row.id,
            slug: row.slug,
            status: "error",
            http_status: resp.status,
            duration_ms: duration,
            error: text.slice(0, 200),
          });
        } else {
          const usedFallback = parsed?.used_fallback === true;
          results.push({
            respondent_id: row.id,
            slug: row.slug,
            status: usedFallback ? "ok_fallback" : "ok",
            http_status: resp.status,
            used_fallback: usedFallback,
            moves_count: Array.isArray(parsed?.moves) ? parsed!.moves!.length : undefined,
            duration_ms: duration,
          });
        }
      } catch (err) {
        results.push({
          respondent_id: row.id,
          slug: row.slug,
          status: "error",
          duration_ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    const summary = summarise(results);
    const totalMs = Date.now() - startedAt;

    // Audit row — fire-and-forget; failure here must not poison the response.
    admin.from("events").insert({
      name: apply ? "recommendations_backfill_applied" : "recommendations_backfill_dry_run",
      payload: {
        slug: slug || null,
        limit,
        offset,
        force,
        delay_ms: delayMs,
        total_ms: totalMs,
        ...summary,
      },
    }).then(({ error }) => {
      if (error) console.error("[regenerate-all-recommendations] audit insert failed", error);
    });

    return json({
      ok: true,
      apply,
      limit,
      offset,
      total_ms: totalMs,
      ...summary,
      results,
    });
  } catch (err) {
    console.error("[regenerate-all-recommendations] fatal", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function summarise(results: PerRespondentResult[]) {
  const counts = {
    processed: results.length,
    ok: 0,
    ok_fallback: 0,
    skipped_existing: 0,
    missing_report: 0,
    errors: 0,
  };
  for (const r of results) {
    if (r.status === "ok") counts.ok++;
    else if (r.status === "ok_fallback") counts.ok_fallback++;
    else if (r.status === "skipped_existing") counts.skipped_existing++;
    else if (r.status === "missing_report") counts.missing_report++;
    else if (r.status === "error") counts.errors++;
  }
  return counts;
}

async function isServiceRoleRequest(url: string, serviceKey: string, token: string, apikeyHeader: string) {
  if (token === serviceKey || apikeyHeader === serviceKey) return true;
  if (!token) return false;
  // Token might be a service-role JWT minted elsewhere — verify by trying a privileged read.
  const verifier = createClient(url, token, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await verifier.from("email_send_state").select("id").limit(1);
  return !error;
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
