// Lightweight health-check endpoint.
//
// Pings the scoring-related edge functions with a harmless probe payload and
// reports back which are deployed and reachable. Intended as a quick triage
// tool when the assess flow misbehaves — call it and you immediately know
// whether the failure is in the scoring layer or somewhere else.
//
// Public on purpose: no secrets returned, no destructive side effects.
// Functions are invoked with the service-role key so JWT-protected ones still
// respond. We treat any HTTP response (including 4xx) as "reachable" — only
// network errors / 5xx count as "down". A 4xx means the function ran and
// rejected our probe payload, which is exactly what we want to confirm.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// The functions we care about for the assess/scoring flow. Add to this list
// as the surface grows; nothing else needs to change.
const TARGETS = [
  "submit-quickscan",
  "score-responses",
  "rescore-respondent",
  "email-report-pdf",
] as const;

interface ProbeResult {
  name: string;
  reachable: boolean;
  status: number | null;
  latencyMs: number;
  note: string;
}

async function probe(name: string): Promise<ProbeResult> {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const started = performance.now();
  try {
    // OPTIONS is the cheapest probe — every function answers it for CORS and
    // it doesn't trigger any business logic.
    const res = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type",
        Origin: "https://health-check.local",
      },
    });
    const latencyMs = Math.round(performance.now() - started);
    // 5xx from the gateway → function not deployed / crashed on boot.
    const reachable = res.status < 500;
    return {
      name,
      reachable,
      status: res.status,
      latencyMs,
      note: reachable ? "ok" : `gateway returned ${res.status}`,
    };
  } catch (err) {
    return {
      name,
      reachable: false,
      status: null,
      latencyMs: Math.round(performance.now() - started),
      note: err instanceof Error ? err.message : "network error",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const results = await Promise.all(TARGETS.map(probe));
  const allHealthy = results.every((r) => r.reachable);

  const body = {
    ok: allHealthy,
    checkedAt: new Date().toISOString(),
    functions: results,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: allHealthy ? 200 : 503,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
