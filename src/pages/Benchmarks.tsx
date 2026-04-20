import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Level = Database["public"]["Enums"]["assessment_level"];
type Row = Database["public"]["Tables"]["benchmarks_materialised"]["Row"];

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

const LEVELS: { value: Level; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "function", label: "Function" },
  { value: "individual", label: "Individual" },
];

const SIZES = ["All", "1–50", "51–250", "251–1k", "1k+"] as const;
const SECTORS = ["All", "Tech", "Finance", "Healthcare", "Retail", "Industry", "Public"] as const;

type SizeBand = (typeof SIZES)[number];
type Sector = (typeof SECTORS)[number];

interface PillarMedians {
  [key: string]: number;
}

function FilterPill<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string } | T>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const normalised = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {normalised.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`px-3 py-1.5 rounded-sm font-ui text-xs tracking-wide transition-colors border ${
                active
                  ? "bg-brass text-walnut border-brass"
                  : "bg-transparent text-cream/65 border-cream/15 hover:border-cream/35 hover:text-cream"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Hand-rolled SVG sparkline showing pillar median against the 0–5 tier range. */
function PillarSparkline({ value }: { value: number }) {
  const w = 120;
  const h = 28;
  const max = 5;
  const clamped = Math.max(0, Math.min(max, value));
  const fillW = (clamped / max) * w;

  // Subtle wave to suggest a distribution rather than a flat bar.
  const points: string[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = i / steps;
    const wave = Math.sin(t * Math.PI * 2) * 2;
    const baseline = h - 6 - (clamped / max) * (h - 12);
    const y = baseline + wave;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg width={w} height={h} className="block" aria-hidden="true">
      <line x1={0} y1={h - 4} x2={w} y2={h - 4} stroke="hsl(var(--cream) / 0.1)" strokeWidth={1} />
      <line
        x1={0}
        y1={h - 4}
        x2={fillW}
        y2={h - 4}
        stroke="hsl(var(--brass) / 0.55)"
        strokeWidth={1}
      />
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

/** Aggregate matching rows into a single weighted view. */
function aggregate(rows: Row[]) {
  if (!rows.length) return null;
  let sample = 0;
  let weightedScore = 0;
  const pillarSums: Record<number, { sum: number; n: number }> = {};
  for (const r of rows) {
    sample += r.sample_size;
    if (r.median_score != null) weightedScore += r.median_score * r.sample_size;
    const pm = (r.pillar_medians as PillarMedians | null) ?? {};
    for (const p of PILLARS) {
      const v = pm[String(p.id)];
      if (typeof v === "number") {
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
  return { sample, median: Math.round(median), pillars, refreshedAt: rows[0].refreshed_at };
}

export default function Benchmarks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [level, setLevel] = useState<Level>("function");
  const [size, setSize] = useState<SizeBand>("All");
  const [sector, setSector] = useState<Sector>("All");

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
        setRows(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.level !== level) return false;
      if (size !== "All" && r.size_band !== size) return false;
      if (sector !== "All" && r.sector !== sector) return false;
      return true;
    });
  }, [rows, level, size, sector]);

  const view = useMemo(() => aggregate(filtered), [filtered]);
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
            Live medians from every assessment that opted in. Filter by level, organisation
            size, and sector to see how your cohort is operating today.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-10 border-b border-cream/10">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-8">
          <FilterPill<Level> label="Level" options={LEVELS} value={level} onChange={setLevel} />
          <FilterPill<SizeBand> label="Org size" options={SIZES} value={size} onChange={setSize} />
          <FilterPill<Sector> label="Sector" options={SECTORS} value={sector} onChange={setSector} />
        </div>
      </section>

      {/* Aggregate */}
      <section className="py-16 border-b border-cream/10">
        <div className="container grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              Median AIOI score
            </span>
            <div className="mt-3 font-display font-light text-[clamp(4rem,12vw,8rem)] leading-none tracking-[-0.04em] text-brass-bright">
              {loading ? "—" : empty ? "—" : view!.median}
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/45">
              0 — 100
            </div>
          </div>
          <div className="md:col-span-7 space-y-3 font-display text-cream/75 text-pretty">
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
                  {size !== "All" && <> · {size} headcount</>}
                  {sector !== "All" && <> · {sector}</>}.
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
      </section>

      {/* Pillar breakdown */}
      <section className="py-16">
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
