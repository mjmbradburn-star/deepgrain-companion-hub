import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { PillarBarChart } from "@/components/aioi/PillarBarChart";
import { PillarChartVariantToggle, usePillarChartVariant } from "@/components/aioi/PillarChartVariantToggle";
import { FilterRow } from "@/components/aioi/BenchmarkFilters";
import { supabase } from "@/integrations/supabase/client";
import { loadScan } from "@/lib/quickscan";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Level = Database["public"]["Enums"]["assessment_level"];
type Row = Database["public"]["Tables"]["benchmarks_materialised"]["Row"] & {
  function?: string | null;
  region?: string | null;
};

const PILLARS: { id: number; name: string }[] = [
  { id: 1, name: "Strategy & Mandate" },
  { id: 2, name: "Data Foundations" },
  { id: 3, name: "Tooling & Infrastructure" },
  { id: 4, name: "Workflow Integration" },
  { id: 5, name: "Skills & Fluency" },
  { id: 6, name: "Governance & Risk" },
  { id: 7, name: "Measurement & ROI" },
  { id: 8, name: "Culture & Adoption" },
];

const PILLAR_LABELS = PILLARS.reduce<Record<number, string>>((acc, p) => {
  // Short form for radar rim — full names crowd the SVG.
  const short: Record<number, string> = {
    1: "Strategy", 2: "Data", 3: "Tooling", 4: "Workflow",
    5: "Skills", 6: "Governance", 7: "ROI", 8: "Culture",
  };
  acc[p.id] = short[p.id];
  return acc;
}, {});

const LEVELS: { value: Level; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "function", label: "Function" },
  { value: "individual", label: "Individual" },
];

const FUNCTIONS = [
  "All",
  "Sales",
  "Marketing",
  "Engineering & Product",
  "Operations & Supply Chain",
  "Finance",
  "People & HR",
  "Customer Support",
  "Legal, Risk & Compliance",
  "Executive / Leadership",
] as const;

const SIZES = ["All", "1–50", "51–250", "251–1k", "1k+"] as const;
const SECTORS = ["All", "Tech", "Finance", "Healthcare", "Retail", "Industry", "Public"] as const;
const REGIONS = [
  "All",
  "North America",
  "Europe",
  "UK & Ireland",
  "Asia-Pacific",
  "Latin America",
  "Middle East & Africa",
] as const;

type FunctionSlice = (typeof FUNCTIONS)[number];
type SizeBand = (typeof SIZES)[number];
type Sector = (typeof SECTORS)[number];
type Region = (typeof REGIONS)[number];

/** Pillar median JSON comes in two shapes from the recompute function:
 *   shape A (legacy seed): `{ "1": 2.4 }`
 *   shape B (current):     `{ "1": { "name": "...", "tier": 2.4 } }`
 *  Normalise both. */
function readPillarTier(raw: unknown, pillar: number): number | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>)[String(pillar)];
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "tier" in v) {
    const t = (v as { tier: unknown }).tier;
    if (typeof t === "number") return t;
    if (typeof t === "string") {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

interface AggregateView {
  sample: number;
  median: number;
  pillars: Record<number, number>;
  refreshedAt: string;
}

function aggregate(rows: Row[]): AggregateView | null {
  if (!rows.length) return null;
  let sample = 0;
  let weightedScore = 0;
  const pillarSums: Record<number, { sum: number; n: number }> = {};
  for (const r of rows) {
    sample += r.sample_size;
    if (r.median_score != null) weightedScore += Number(r.median_score) * r.sample_size;
    for (const p of PILLARS) {
      const v = readPillarTier(r.pillar_medians, p.id);
      if (v != null) {
        pillarSums[p.id] ??= { sum: 0, n: 0 };
        pillarSums[p.id].sum += v * r.sample_size;
        pillarSums[p.id].n += r.sample_size;
      }
    }
  }
  const median = sample ? weightedScore / sample : 0;
  const pillars: Record<number, number> = {};
  for (const p of PILLARS) {
    const agg = pillarSums[p.id];
    pillars[p.id] = agg && agg.n ? Math.round((agg.sum / agg.n) * 10) / 10 : 0;
  }
  return {
    sample,
    median: Math.round(median),
    pillars,
    refreshedAt: rows[0].refreshed_at,
  };
}

/** Whether a row matches the active level + secondary filter set.
 *  Secondary filters are AND'd; "All" means "don't filter". */
function rowMatches(
  r: Row,
  level: Level,
  fn: FunctionSlice,
  size: SizeBand,
  sector: Sector,
  region: Region,
): boolean {
  if (r.level !== level) return false;
  if (fn !== "All" && r.function !== fn) return false;
  if (size !== "All" && r.size_band !== size) return false;
  if (sector !== "All" && r.sector !== sector) return false;
  if (region !== "All" && r.region !== region) return false;
  return true;
}

/**
 * Per-pillar comparison row used in the breakdown list.
 *
 * Replaces the old wavy sparkline (which read as decoration, not data) with
 * a clean 0–5 scale bar:
 *  - The cohort median is drawn as a solid brass bar from 0 to its value.
 *  - If we know the visitor's own tier for this pillar, a vertical brass-bright
 *    tick is overlaid at their position with a small "You" caption above it.
 *  - Five faint tick marks (one per tier) anchor the eye to the scale.
 */
function PillarComparisonBar({
  median,
  user,
  pillarName,
}: {
  median: number;
  user?: number;
  pillarName?: string;
}) {
  const max = 5;
  const clampedMedian = Math.max(0, Math.min(max, median));
  const medianPct = (clampedMedian / max) * 100;
  const userPct =
    typeof user === "number"
      ? (Math.max(0, Math.min(max, user)) / max) * 100
      : null;
  const delta = typeof user === "number" ? Math.round((user - median) * 10) / 10 : null;

  return (
    <div className="w-full max-w-full sm:max-w-[260px]">
      <div className="relative h-2 w-full bg-cream/8 rounded-full overflow-visible">
        {/* Cohort median fill */}
        <span
          className="absolute top-0 left-0 h-full bg-brass/55 rounded-full"
          style={{ width: `${medianPct}%` }}
          aria-hidden
        />
        {/* Tier ticks at 1..4 (0 and 5 are the bar edges) */}
        {[1, 2, 3, 4].map((t) => (
          <span
            key={t}
            className="absolute top-1/2 -translate-y-1/2 h-1 w-px bg-cream/20"
            style={{ left: `${(t / max) * 100}%` }}
            aria-hidden
          />
        ))}
        {/* User marker — vertical tick + tiny caption */}
        {userPct != null && (
          <>
            <span
              className="absolute -top-1 -bottom-1 w-[2px] bg-brass-bright rounded-full"
              style={{ left: `calc(${userPct}% - 1px)` }}
              aria-hidden
            />
            <span
              className="absolute -top-4 font-mono text-[8px] uppercase tracking-[0.18em] text-brass-bright whitespace-nowrap"
              style={{
                left: `${userPct}%`,
                transform: "translateX(-50%)",
              }}
            >
              You
            </span>
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">
        <span>0</span>
        {delta != null && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={
                  "inline-flex items-center gap-1 cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-brass rounded-sm " +
                  (delta > 0
                    ? "text-brass-bright"
                    : delta < 0
                    ? "text-pillar-7"
                    : "text-cream/40")
                }
                aria-label={`Your tier versus the cohort median${pillarName ? ` for ${pillarName}` : ""}`}
              >
                You {delta > 0 ? "+" : ""}{delta.toFixed(1)} vs median
                <Info className="h-2.5 w-2.5 opacity-70" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-left">
              <p className="font-ui text-xs leading-relaxed normal-case tracking-normal">
                Your tier on{" "}
                <span className="text-brass-bright">
                  {pillarName ?? "this pillar"}
                </span>{" "}
                is <span className="tabular-nums">{user?.toFixed(1)}</span> on the
                0–5 maturity scale. The cohort median is{" "}
                <span className="tabular-nums">{median.toFixed(1)}</span>, so you sit{" "}
                <span
                  className={
                    delta > 0
                      ? "text-brass-bright"
                      : delta < 0
                      ? "text-pillar-7"
                      : "text-cream/70"
                  }
                >
                  {delta === 0
                    ? "exactly at"
                    : `${Math.abs(delta).toFixed(1)} ${delta > 0 ? "above" : "below"}`}
                </span>{" "}
                {delta === 0 ? "the median" : "the median"} for the slice you've selected.
                One tier ≈ a full step on the maturity ladder (Dormant → AI-Native).
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        <span>5</span>
      </div>
    </div>
  );
}

/** Small radar tile used in the compare-functions strip. */
function RadarTile({
  title,
  view,
  cohort,
}: {
  title: string;
  view: AggregateView | null;
  cohort?: AggregateView | null;
}) {
  if (!view) {
    return (
      <div className="border border-cream/10 p-5 flex flex-col items-center justify-center text-center min-h-[220px]">
        <p className="font-display text-base text-cream/85">{title}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
          insufficient data
        </p>
      </div>
    );
  }
  return (
    <div className="border border-cream/10 p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-display text-base text-cream/90 truncate" title={title}>
          {title}
        </p>
        <p className="font-display text-xl text-brass-bright tabular-nums">{view.median}</p>
      </div>
      <PillarBarChart
        values={view.pillars}
        cohort={cohort?.pillars}
        labels={PILLAR_LABELS}
        showLabels={false}
        showValues={false}
      />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
        n = {view.sample.toLocaleString()}
      </p>
    </div>
  );
}

export default function Benchmarks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartVariant, setChartVariant] = usePillarChartVariant();

  const [searchParams, setSearchParams] = useSearchParams();

  // Validate URL params against the known option sets — anything unrecognised
  // falls back to the default. Keeps shared links robust to typos / stale
  // values without throwing.
  const validLevel = (v: string | null): Level =>
    LEVELS.some((l) => l.value === v) ? (v as Level) : "function";
  const oneOf = <T extends string>(opts: ReadonlyArray<T>, fallback: T) =>
    (v: string | null): T => (v && (opts as ReadonlyArray<string>).includes(v) ? (v as T) : fallback);
  const validFn = oneOf(FUNCTIONS, "All");
  const validSize = oneOf(SIZES, "All");
  const validSector = oneOf(SECTORS, "All");
  const validRegion = oneOf(REGIONS, "All");

  const level = validLevel(searchParams.get("level"));
  const fn = validFn(searchParams.get("fn"));
  const size = validSize(searchParams.get("size"));
  const sector = validSector(searchParams.get("sector"));
  const region = validRegion(searchParams.get("region"));

  const compareOpen = searchParams.get("compare") === "1";
  const compareSelection = useMemo<string[]>(() => {
    const raw = searchParams.get("cmp");
    if (!raw) return ["Sales", "Marketing", "Engineering & Product"];
    const allowed = new Set<string>(FUNCTIONS.filter((f) => f !== "All"));
    return raw
      .split(",")
      .map((s) => decodeURIComponent(s.trim()))
      .filter((s) => allowed.has(s))
      .slice(0, 4);
  }, [searchParams]);

  // Single setter that mutates one or more URL params at once. Any value
  // equal to its default is dropped from the query string to keep URLs tidy.
  const updateParams = (patch: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === "") next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  };

  const setLevel = (v: Level) => updateParams({ level: v === "function" ? null : v });
  const setFn = (v: FunctionSlice) => updateParams({ fn: v === "All" ? null : v });
  const setSize = (v: SizeBand) => updateParams({ size: v === "All" ? null : v });
  const setSector = (v: Sector) => updateParams({ sector: v === "All" ? null : v });
  const setRegion = (v: Region) => updateParams({ region: v === "All" ? null : v });
  const setCompareOpen = (open: boolean | ((v: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(compareOpen) : open;
    updateParams({ compare: next ? "1" : null });
  };
  const setCompareSelection = (
    update: string[] | ((prev: string[]) => string[]),
  ) => {
    const next = typeof update === "function" ? update(compareSelection) : update;
    const defaults = ["Sales", "Marketing", "Engineering & Product"];
    const isDefault =
      next.length === defaults.length && next.every((v, i) => v === defaults[i]);
    updateParams({ cmp: isDefault ? null : next.map(encodeURIComponent).join(",") });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("benchmarks_materialised")
        .select("*")
        .order("refreshed_at", { ascending: false });
      if (!cancelled) {
        if (error) console.error("[benchmarks] fetch failed", error);
        setRows((data as Row[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the visitor has completed a scan on this device, fetch their pillar
  // tiers so we can overlay a "You" marker against the cohort medians in the
  // pillar breakdown. Slug lives in localStorage; the public RPC keeps this
  // anonymous-safe (no PII in the response).
  //
  // We track *why* the overlay is unavailable so the breakdown can render a
  // meaningful empty-state instead of silently dropping the marker:
  //   - "loading"     → still resolving (don't message yet)
  //   - "no-scan"     → no slug in localStorage (visitor hasn't started)
  //   - "no-report"   → slug exists but report row missing/empty (mid-flow)
  //   - "ready"       → pillar tiers loaded
  type YouStatus = "loading" | "no-scan" | "no-report" | "ready";
  const [userPillars, setUserPillars] = useState<Record<number, number> | null>(null);
  const [youStatus, setYouStatus] = useState<YouStatus>("loading");
  useEffect(() => {
    let cancelled = false;
    const slug = loadScan().slug;
    if (!slug) {
      setYouStatus("no-scan");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("get_report_by_slug", { _slug: slug });
      if (cancelled) return;
      if (error || !data) {
        setYouStatus("no-report");
        return;
      }
      const payload = data as unknown as {
        report?: { pillar_tiers?: Record<string, { tier?: number } | number> } | null;
      };
      const raw = payload?.report?.pillar_tiers;
      if (!raw || typeof raw !== "object") {
        setYouStatus("no-report");
        return;
      }
      const out: Record<number, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(k);
        if (!Number.isFinite(n)) continue;
        if (typeof v === "number") out[n] = v;
        else if (v && typeof v === "object" && typeof v.tier === "number") out[n] = v.tier;
      }
      if (Object.keys(out).length) {
        setUserPillars(out);
        setYouStatus("ready");
      } else {
        setYouStatus("no-report");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => rowMatches(r, level, fn, size, sector, region)),
    [rows, level, fn, size, sector, region],
  );
  const view = useMemo(() => aggregate(filtered), [filtered]);

  // Cohort overlay = same level, but no other filters — so people can see
  // how the active slice compares to the broad field.
  const cohortRows = useMemo(
    () => rows.filter((r) => r.level === level && !r.function && !r.region && !r.size_band && !r.sector),
    [rows, level],
  );
  const cohort = useMemo(() => aggregate(cohortRows), [cohortRows]);

  // Side-by-side small multiples for the comparison strip.
  const compareViews = useMemo(() => {
    return compareSelection.map((name) => {
      const fnRows = rows.filter((r) => r.level === "function" && r.function === name);
      return { name, view: aggregate(fnRows) };
    });
  }, [rows, compareSelection]);

  const allFunctions = FUNCTIONS.filter((f) => f !== "All");

  const empty = !loading && !view;

  return (
    <main className="min-h-screen bg-walnut text-cream">
      <SiteNav />

      <section className="pt-24 sm:pt-32 pb-10 sm:pb-12 border-b border-cream/10">
        <div className="container">
          <p className="eyebrow text-cream/55 mb-4 sm:mb-5">Volume I · Benchmarks</p>
          <h1 className="font-display font-light headline-lg text-balance max-w-[18ch]">
            Where the field <span className="italic text-brass-bright">actually stands.</span>
          </h1>
          <p className="mt-5 sm:mt-6 max-w-2xl font-display text-base sm:text-lg text-cream/70 leading-[1.5] text-pretty">
            Live medians from every assessment that opted in. Slice by level, function,
            organisation size, sector, and region. Then compare functions side by side.
          </p>
        </div>
      </section>

      {/* Four filter rows */}
      <section className="py-6">
        <div className="container">
          <div className="flex justify-start sm:justify-end gap-2 mb-4">
            {/* Reset = clear every query param so all filters return to defaults
                (level=function, all secondaries=All, compare collapsed). */}
            <button
              onClick={() => {
                const isAlreadyDefault =
                  level === "function" &&
                  fn === "All" &&
                  size === "All" &&
                  sector === "All" &&
                  region === "All" &&
                  !compareOpen;
                setSearchParams(new URLSearchParams(), { replace: true });
                if (isAlreadyDefault) {
                  toast("Filters already at defaults");
                } else {
                  toast.success("Filters reset", {
                    description: "All slices back to defaults.",
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm font-ui text-xs tracking-wide transition-colors border bg-transparent text-cream/65 border-cream/15 hover:border-cream/45 hover:text-cream"
              aria-label="Reset all filters to defaults"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 4 3 10 9 10" />
              </svg>
              Reset filters
            </button>
            <button
              onClick={async () => {
                const url = window.location.href;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Share link copied", {
                    description: "URL with current filters is on your clipboard.",
                  });
                } catch {
                  toast.error("Couldn't copy link", {
                    description: "Your browser blocked clipboard access.",
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm font-ui text-xs tracking-wide transition-colors border bg-transparent text-cream/75 border-cream/25 hover:border-cream/55 hover:text-cream"
              aria-label="Copy share link with current filters"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy share link
            </button>
          </div>
          <FilterRow<Level>
            label="Level"
            helper="Whose maturity are you measuring?"
            options={LEVELS}
            value={level}
            onChange={setLevel}
          />
          <FilterRow<FunctionSlice>
            label="Function"
            helper="Sales runs hotter than Legal. Always has."
            options={FUNCTIONS}
            value={fn}
            onChange={setFn}
          />
          <FilterRow<SizeBand>
            label="Org size"
            helper="Headcount band of the organisation."
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <FilterRow<Sector>
            label="Sector"
            options={SECTORS}
            value={sector}
            onChange={setSector}
          />
          <FilterRow<Region>
            label="Region"
            helper="Where the respondent's organisation is based."
            options={REGIONS}
            value={region}
            onChange={setRegion}
          />
        </div>
      </section>

      {/* Big number + radar */}
      <section className="py-10 sm:py-16 border-t border-cream/10">
        <div className="container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/40">
              Median AIOI score
            </span>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display font-light text-[clamp(3rem,16vw,8rem)] leading-none tracking-[-0.04em] text-brass-bright tabular-nums">
                {loading ? "—" : empty ? "—" : view!.median}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cream/40">
                / 100
              </span>
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
              Scale · 0 Dormant → 100 AI-Native
            </div>

            <div className="mt-6 sm:mt-8 space-y-3 font-display text-cream/75 text-pretty">
              {loading && <p className="text-cream/50">Loading aggregates…</p>}
              {empty && (
                <p className="text-base sm:text-lg leading-[1.5]">
                  No benchmark data yet for this slice.{" "}
                  <span className="italic text-cream/55">
                    Aggregates publish once enough respondents in this cohort opt in.
                  </span>
                </p>
              )}
              {view && (
                <>
                  <p className="text-base sm:text-lg leading-[1.5]">
                    Drawn from{" "}
                    <span className="text-cream font-normal">
                      {view.sample.toLocaleString()}
                    </span>{" "}
                    respondents at the{" "}
                    <span className="italic">
                      {LEVELS.find((l) => l.value === level)?.label.toLowerCase()}
                    </span>{" "}
                    level
                    {fn !== "All" && <> · {fn}</>}
                    {size !== "All" && <> · {size}</>}
                    {sector !== "All" && <> · {sector}</>}
                    {region !== "All" && <> · {region}</>}.
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35 flex items-center gap-2 flex-wrap">
                    <span>Refreshed {new Date(view.refreshedAt).toLocaleDateString()}</span>
                    <span className="text-cream/20">·</span>
                    <span
                      title="Seeded synthetic medians shown until live respondents accumulate."
                      className="inline-flex items-center gap-1.5 rounded-sm border border-brass/30 bg-brass/10 px-1.5 py-0.5 text-brass-bright"
                    >
                      <span className="h-1 w-1 rounded-full bg-brass-bright" />
                      Synthetic data
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 w-full">
            {view && (
              <div className="mb-3 flex justify-end">
                <PillarChartVariantToggle value={chartVariant} onChange={setChartVariant} />
              </div>
            )}
            {view ? (
              <div className="w-full max-w-[640px] mx-auto">
                <PillarBarChart
                  values={view.pillars}
                  cohort={cohort?.pillars}
                  labels={PILLAR_LABELS}
                  variant={chartVariant}
                />
              </div>
            ) : (
              <div className="aspect-[4/3] border border-dashed border-cream/15 flex items-center justify-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/30">
                  no data for current slice
                </p>
              </div>
            )}
            {cohort && view && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/40">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-2 w-3 rounded-sm bg-brass-bright" />
                  Selected slice
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-3 w-px bg-cream/70" />
                  Level cohort
                </span>
              </div>
            )}
            {view && (
              <p className="mt-2 text-center font-mono text-[10px] normal-case tracking-[0.12em] text-cream/35">
                Bars show the 0–5 maturity scale (Dormant → AI-Native).
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Compare functions strip */}
      <section className="py-16 border-t border-cream/10">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="eyebrow text-cream/55 mb-2">Compare functions</p>
              <h2 className="font-display font-light text-3xl sm:text-4xl tracking-tight">
                Set them next to each other.
              </h2>
            </div>
            <button
              onClick={() => setCompareOpen((v) => !v)}
              className={`px-4 py-2 rounded-sm font-ui text-xs tracking-wide transition-colors border ${
                compareOpen
                  ? "bg-brass text-walnut border-brass"
                  : "bg-transparent text-cream/75 border-cream/25 hover:border-cream/55 hover:text-cream"
              }`}
              aria-expanded={compareOpen}
            >
              {compareOpen ? "Hide comparison" : "Compare functions"}
            </button>
          </div>

          {compareOpen && (
            <>
              <div className="mb-6 flex flex-wrap gap-1.5">
                {allFunctions.map((f) => {
                  const active = compareSelection.includes(f);
                  const atLimit = compareSelection.length >= 4 && !active;
                  return (
                    <button
                      key={f}
                      disabled={atLimit}
                      onClick={() =>
                        setCompareSelection((prev) =>
                          prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                        )
                      }
                      className={`px-3 py-1.5 rounded-sm font-ui text-xs tracking-wide transition-colors border ${
                        active
                          ? "bg-brass text-walnut border-brass"
                          : "bg-transparent text-cream/65 border-cream/15 hover:border-cream/35 hover:text-cream"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {f}
                    </button>
                  );
                })}
                <span className="ml-2 self-center font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
                  pick up to 4
                </span>
              </div>

              {compareSelection.length === 0 ? (
                <p className="font-display italic text-cream/50">
                  Pick at least one function to compare.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {compareViews.map(({ name, view }) => (
                    <RadarTile key={name} title={name} view={view} cohort={cohort} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Pillar breakdown */}
      <section className="py-10 sm:py-16 border-t border-cream/10">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6 sm:mb-8">
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl tracking-tight">
              Pillar breakdown
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5 font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/45">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-brass/55" aria-hidden /> Median
              </span>
              {youStatus === "ready" ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-[2px] rounded-full bg-brass-bright" aria-hidden /> You
                </span>
              ) : youStatus !== "loading" ? (
                <span className="inline-flex items-center gap-1.5 text-cream/30">
                  <span className="h-2.5 w-[2px] rounded-full bg-cream/20" aria-hidden /> You · n/a
                </span>
              ) : null}
              <span title="0 Dormant · 1 Reactive · 2 Exploratory · 3 Operational · 4 Integrated · 5 AI-Native">
                Tier · 0 → 5
              </span>
            </div>
          </div>

          {/* "You" overlay status banner — explains why the personal marker
              is missing so users don't wonder if it's broken. */}
          {youStatus === "no-scan" && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-sm border border-brass/25 bg-brass/5 px-4 py-3">
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85">
                  Your marker · not available
                </p>
                <p className="mt-1 font-display text-sm text-cream/75 leading-relaxed">
                  Take the 2-minute Quickscan to overlay your tier on each pillar against the cohort median.
                </p>
              </div>
              <a
                href="/assess"
                className="self-start sm:self-auto inline-flex items-center justify-center rounded-sm bg-brass px-4 py-2 font-ui text-xs uppercase tracking-[0.18em] text-walnut hover:bg-brass-bright transition-colors"
              >
                Start Quickscan
              </a>
            </div>
          )}
          {youStatus === "no-report" && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-sm border border-cream/15 bg-surface-1/40 px-4 py-3">
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                  Your marker · not available
                </p>
                <p className="mt-1 font-display text-sm text-cream/75 leading-relaxed">
                  We found a scan on this device but couldn't load its results. Resume your Quickscan to
                  unlock the "You" overlay.
                </p>
              </div>
              <a
                href="/assess"
                className="self-start sm:self-auto inline-flex items-center justify-center rounded-sm border border-cream/25 px-4 py-2 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:border-cream/55 transition-colors"
              >
                Resume scan
              </a>
            </div>
          )}

          <ol className="border-t border-cream/10">
            {PILLARS.map((p) => {
              const v = view?.pillars[p.id] ?? 0;
              const yours = userPillars?.[p.id];
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-12 gap-x-3 sm:gap-4 items-center py-5 sm:py-6 border-b border-cream/10"
                >
                  {/* Mobile: pillar name (with inline P-prefix) + score share
                      one row, full-width bar below. Desktop: 12-col grid with
                      a dedicated P-index column. */}
                  <span className="hidden sm:block sm:col-span-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
                    P{p.id}
                  </span>
                  <span className="col-span-9 sm:col-span-4 font-display text-base sm:text-lg text-cream/90 leading-tight">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 mr-2 sm:hidden">
                      P{p.id}
                    </span>
                    {p.name}
                  </span>
                  <span className="col-span-3 sm:col-span-2 sm:order-last text-right font-display text-lg sm:text-2xl tracking-tight text-brass-bright tabular-nums">
                    {view ? v.toFixed(1) : "—"}
                  </span>
                  <div className="col-span-12 sm:col-span-5 flex justify-start sm:justify-center mt-2 sm:mt-0">
                    {view ? (
                      <PillarComparisonBar median={v} user={yours} pillarName={p.name} />
                    ) : (
                      <span className="font-mono text-[10px] text-cream/30 uppercase tracking-[0.2em] sm:tracking-[0.22em]">
                        no data
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
