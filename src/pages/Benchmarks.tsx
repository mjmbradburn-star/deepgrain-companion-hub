import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { RadarChart } from "@/components/aioi/RadarChart";
import { FilterRow } from "@/components/aioi/BenchmarkFilters";
import { supabase } from "@/integrations/supabase/client";
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

function PillarSparkline({ value }: { value: number }) {
  const w = 120;
  const h = 28;
  const max = 5;
  const clamped = Math.max(0, Math.min(max, value));
  const fillW = (clamped / max) * w;
  const points: string[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = i / steps;
    const wave = Math.sin(t * Math.PI * 2) * 2;
    const baseline = h - 6 - (clamped / max) * (h - 12);
    points.push(`${x.toFixed(1)},${(baseline + wave).toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} className="block" aria-hidden="true">
      <line x1={0} y1={h - 4} x2={w} y2={h - 4} stroke="hsl(var(--cream) / 0.1)" strokeWidth={1} />
      <line x1={0} y1={h - 4} x2={fillW} y2={h - 4} stroke="hsl(var(--brass) / 0.55)" strokeWidth={1} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="hsl(var(--brass-bright))"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      <RadarChart
        values={view.pillars}
        cohort={cohort?.pillars}
        labels={PILLAR_LABELS}
        size={300}
        showLabels={false}
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

      <section className="pt-32 pb-12 border-b border-cream/10">
        <div className="container">
          <p className="eyebrow text-cream/55 mb-5">Volume I — Benchmarks</p>
          <h1 className="font-display font-light text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-[-0.025em] text-balance max-w-[18ch]">
            Where the field <span className="italic text-brass-bright">actually stands.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-display text-lg text-cream/70 leading-[1.5] text-pretty">
            Live medians from every assessment that opted in. Slice by level, function,
            organisation size, sector, and region — then compare functions side by side.
          </p>
        </div>
      </section>

      {/* Four filter rows */}
      <section className="py-6">
        <div className="container">
          <FilterRow<Level>
            label="Level"
            helper="Whose maturity are you measuring?"
            options={LEVELS}
            value={level}
            onChange={setLevel}
          />
          <FilterRow<FunctionSlice>
            label="Function"
            helper="Sales runs hotter than Legal — always has."
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
      <section className="py-16 border-t border-cream/10">
        <div className="container grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              Median AIOI score
            </span>
            <div className="mt-3 font-display font-light text-[clamp(4rem,12vw,8rem)] leading-none tracking-[-0.04em] text-brass-bright">
              {loading ? "—" : empty ? "—" : view!.median}
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/45">
              0 — 100
            </div>

            <div className="mt-8 space-y-3 font-display text-cream/75 text-pretty">
              {loading && <p className="text-cream/50">Loading aggregates…</p>}
              {empty && (
                <p className="text-lg leading-[1.5]">
                  No benchmark data yet for this slice.{" "}
                  <span className="italic text-cream/55">
                    Aggregates publish once enough respondents in this cohort opt in.
                  </span>
                </p>
              )}
              {view && (
                <>
                  <p className="text-lg leading-[1.5]">
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
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35 flex items-center gap-2 flex-wrap">
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

          <div className="lg:col-span-7">
            {view ? (
              <RadarChart
                values={view.pillars}
                cohort={cohort?.pillars}
                labels={PILLAR_LABELS}
                size={520}
              />
            ) : (
              <div className="aspect-square border border-dashed border-cream/15 flex items-center justify-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/30">
                  no data for current slice
                </p>
              </div>
            )}
            {cohort && view && (
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
                <span className="inline-block h-px w-4 bg-brass-bright align-middle mr-1.5" />
                Selected slice
                <span className="mx-3 text-cream/20">·</span>
                <span className="inline-block h-px w-4 border-t border-dashed border-cream/45 align-middle mr-1.5" />
                Level cohort
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
      <section className="py-16 border-t border-cream/10">
        <div className="container">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
              Pillar breakdown
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              Median tier · 0–5
            </span>
          </div>

          <ol className="border-t border-cream/10">
            {PILLARS.map((p) => {
              const v = view?.pillars[p.id] ?? 0;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-12 gap-4 items-center py-5 border-b border-cream/10"
                >
                  <span className="col-span-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
                    P{p.id}
                  </span>
                  <span className="col-span-5 sm:col-span-4 font-display text-lg text-cream/90">
                    {p.name}
                  </span>
                  <div className="col-span-4 sm:col-span-5 flex justify-start sm:justify-center">
                    {view ? (
                      <PillarSparkline value={v} />
                    ) : (
                      <span className="font-mono text-[10px] text-cream/30 uppercase tracking-[0.22em]">
                        no data
                      </span>
                    )}
                  </div>
                  <span className="col-span-2 text-right font-display text-2xl tracking-tight text-brass-bright tabular-nums">
                    {view ? v.toFixed(1) : "—"}
                  </span>
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
