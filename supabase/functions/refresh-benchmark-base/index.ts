import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEVELS = ["company", "function", "individual"] as const;
const FUNCTIONS = ["Sales", "Marketing", "Engineering & Product", "Operations & Supply Chain", "Finance", "People & HR", "Customer Support", "Legal, Risk & Compliance", "Executive / Leadership"] as const;
const SECTORS = ["Tech", "Finance", "Healthcare", "Retail", "Industry", "Public"] as const;
const REGIONS = ["North America", "Europe", "UK & Ireland", "Asia-Pacific", "Latin America", "Middle East & Africa"] as const;
const SIZE_LABELS = ["1–50", "51–250", "251–1k", "1k+"] as const;
const ORG_SIZE_BY_FILTER: Record<string, string[]> = {
  "1–50": ["1–50"],
  "51–250": ["51–100", "101–200", "201–500"],
  "251–1k": ["201–500", "501–1,000"],
  "1k+": ["1,001–2,000", "2,001+"],
};

type Level = typeof LEVELS[number];

type BenchmarkRespondentRow = {
  id: string;
  function: string | null;
  sector: string | null;
  region: string | null;
  org_size: string | null;
};

const BodySchema = z.object({
  level: z.enum(LEVELS).default("function"),
  function: z.enum(["All", ...FUNCTIONS]).default("All"),
  sector: z.enum(["All", ...SECTORS]).default("All"),
  region: z.enum(["All", ...REGIONS]).default("All"),
  size: z.enum(["All", ...SIZE_LABELS]).default("All"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const url = Deno.env.get("SUPABASE_URL")?.trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    if (!serviceKey || !url) return json({ error: "Benchmark refresh is not configured" }, 500);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { level, sector, region, size } = parsed.data;
    const fn = parsed.data.function;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey ?? "", { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const email = userData.user?.email?.toLowerCase() ?? "";
    if (!email.endsWith("@deepgrain.ai")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const prefix = `seed-benchmark-${level}-`;

    const { data: existing, error: existingErr } = await admin
      .from("respondents")
      .select("id")
      .like("slug", `${prefix}%`);
    if (existingErr) return json({ error: existingErr.message }, 500);

    const existingIds = (existing ?? []).map((row: { id: string }) => row.id);
    if (existingIds.length) {
      await admin.from("reports").delete().in("respondent_id", existingIds);
      await admin.from("responses").delete().in("respondent_id", existingIds);
      const { error } = await admin.from("respondents").delete().in("id", existingIds);
      if (error) return json({ error: error.message }, 500);
    }

    const dimensions = buildDimensions({ fn, sector, region, size });
    const seedId = `${Date.now().toString(36)}`;
    const respondentRows = dimensions.map((dimension, index) => ({
      slug: `${prefix}${seedId}-${index.toString().padStart(3, "0")}`,
      level,
      function: dimension.function,
      sector: dimension.sector,
      region: dimension.region,
      org_size: dimension.orgSize,
      consent_benchmark: true,
      consent_marketing: false,
      started_at: new Date(Date.now() - index * 3600_000).toISOString(),
      submitted_at: new Date(Date.now() - index * 3600_000 + 900_000).toISOString(),
    }));

    const { data: respondents, error: insertErr } = await admin
      .from("respondents")
      .insert(respondentRows)
      .select("id, function, sector, region, org_size");
    if (insertErr || !respondents?.length) return json({ error: insertErr?.message ?? "Could not seed respondents" }, 500);

    const reportRows = (respondents as BenchmarkRespondentRow[]).map((respondent, index) => syntheticReport(respondent.id, level, respondent, index));
    const { error: reportErr } = await admin.from("reports").insert(reportRows);
    if (reportErr) return json({ error: reportErr.message }, 500);

    const { data: benchmarkRows, error: recomputeErr } = await admin.rpc("recompute_benchmarks", { _min_sample: 5 });
    if (recomputeErr) return json({ error: recomputeErr.message }, 500);

    await admin.from("events").insert({
      name: "benchmark_base_refreshed",
      payload: { level, function: fn, sector, region, size, seeded: respondents.length, benchmark_rows: benchmarkRows },
    });

    return json({ ok: true, seeded: respondents.length, benchmark_rows: benchmarkRows });
  } catch (error) {
    console.error("[refresh-benchmark-base] error", error);
    return json({ error: "Internal server error" }, 500);
  }
});

function buildDimensions(filters: { fn: string; sector: string; region: string; size: string }) {
  const functions = filters.fn === "All" ? FUNCTIONS : [filters.fn];
  const sectors = filters.sector === "All" ? SECTORS : [filters.sector];
  const regions = filters.region === "All" ? REGIONS : [filters.region];
  const sizes = filters.size === "All" ? SIZE_LABELS.flatMap((label) => ORG_SIZE_BY_FILTER[label]) : ORG_SIZE_BY_FILTER[filters.size];
  const rows: Array<{ function: string; sector: string; region: string; orgSize: string }> = [];

  for (let i = 0; i < 180; i++) {
    rows.push({
      function: functions[i % functions.length],
      sector: sectors[Math.floor(i / 2) % sectors.length],
      region: regions[Math.floor(i / 3) % regions.length],
      orgSize: sizes[Math.floor(i / 5) % sizes.length],
    });
  }
  return rows;
}

function syntheticReport(respondentId: string, level: Level, respondent: BenchmarkRespondentRow, index: number) {
  const levelBase = level === "company" ? 55 : level === "function" ? 59 : 62;
  const functionLift = String(respondent.function ?? "").length % 9;
  const sectorLift = String(respondent.sector ?? "").length % 7;
  const regionLift = String(respondent.region ?? "").length % 5;
  const wave = ((index * 17) % 31) - 15;
  const score = Math.max(18, Math.min(92, Math.round(levelBase + functionLift + sectorLift + regionLift + wave * 0.7)));
  const tierBase = Math.max(0.8, Math.min(4.7, score / 20));
  const pillarTiers = Object.fromEntries(Array.from({ length: 8 }, (_, offset) => {
    const pillar = offset + 1;
    const variance = ((((index + 3) * (pillar + 5)) % 9) - 4) / 10;
    const tier = Math.max(0.4, Math.min(5, Math.round((tierBase + variance) * 10) / 10));
    return [String(pillar), { tier, label: tierLabel(Math.round(tier)), name: pillarName(pillar) }];
  }));

  return {
    respondent_id: respondentId,
    aioi_score: score,
    overall_tier: tierForScore(score),
    pillar_tiers: pillarTiers,
    hotspots: [{ pillar: 2, tier: pillarTiers["2"].tier }, { pillar: 4, tier: pillarTiers["4"].tier }, { pillar: 7, tier: pillarTiers["7"].tier }],
    diagnosis: "Synthetic benchmark seed used to calibrate current cohort filters.",
    plan: [],
    generated_at: new Date().toISOString(),
    cap_flags: [],
    benchmark_excluded: false,
    score_audit: { version: "synthetic-benchmark-v1", synthetic: true },
  };
}

function tierForScore(score: number) {
  if (score < 20) return "Dormant";
  if (score < 40) return "Exploring";
  if (score < 60) return "Deployed";
  if (score < 75) return "Integrated";
  if (score < 90) return "Leveraged";
  return "AI-Native";
}

function tierLabel(tier: number) {
  return ["Dormant", "Exploring", "Deployed", "Integrated", "Leveraged", "AI-Native"][Math.max(0, Math.min(5, tier))];
}

function pillarName(pillar: number) {
  return ["", "Strategy & Mandate", "Data Foundations", "Tooling & Infrastructure", "Workflow Integration", "Skills & Fluency", "Governance & Risk", "Measurement & ROI", "Culture & Adoption"][pillar];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}