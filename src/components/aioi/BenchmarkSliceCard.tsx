// "Your score vs this slice" card. Mounted on the Assess Report Overview tab.
//
// Shows the user's score against the most specific cohort we can find
// (function + region → function → region → level), with per-pillar deltas
// sorted by widest gap so the strongest and weakest comparisons surface first.

import { useMemo } from "react";

import { PILLAR_NAMES } from "@/lib/assessment";
import { pillarsFromRow, type MatchedSlice } from "@/lib/benchmarks";

interface Props {
  /** User's pillar tiers (1..8 → 0..5). */
  values: Record<number, number>;
  /** User's overall AIOI score (0..100). */
  userScore: number;
  /** Result from `fetchBestSlice`. */
  slice: MatchedSlice | null;
}

interface PillarDelta {
  pillar: number;
  name: string;
  user: number;
  cohort: number;
  delta: number; // positive = ahead of cohort
}

const PILLARS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** One-line description of how tight the cohort match is, derived from
 *  fetchBestSlice's `specificity`:
 *    3 → function + region
 *    2 → function-only OR region-only
 *    1 → level-wide fallback
 *    0 → last-resort first row at this level */
function specificityHint(spec: number): string {
  switch (spec) {
    case 3: return "Most-specific match · function + region";
    case 2: return "Partial match · function or region only";
    case 1: return "Broad match · level-wide fallback";
    default: return "Approximate match · best available";
  }
}

export function BenchmarkSliceCard({ values, userScore, slice }: Props) {
  const cohortPillars = slice ? pillarsFromRow(slice.row) : {};

  const deltas: PillarDelta[] = useMemo(() => {
    if (!slice) return [];
    return PILLARS.map((p) => {
      const user = values[p] ?? 0;
      const cohort = cohortPillars[p] ?? 0;
      return {
        pillar: p,
        name: PILLAR_NAMES[p as 1|2|3|4|5|6|7|8],
        user,
        cohort,
        delta: Math.round((user - cohort) * 10) / 10,
      };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    // cohortPillars is derived from `slice` — the slice ref is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, slice]);

  if (!slice) {
    return (
      <div className="border border-cream/10 rounded-md p-6 bg-surface-1/40">
        <p className="eyebrow text-cream/45 mb-2">Versus the field</p>
        <p className="font-display text-cream/70 text-pretty">
          No matching cohort yet — your slice publishes once enough peers opt in.
        </p>
      </div>
    );
  }

  const cohortScore = slice.row.median_score != null
    ? Math.round(Number(slice.row.median_score))
    : null;
  const sample = slice.row.sample_size;

  const overallDelta = cohortScore != null ? userScore - cohortScore : null;

  return (
    <section className="border border-cream/10 rounded-md bg-surface-1/40 overflow-hidden">
      <header className="px-6 sm:px-8 pt-6 pb-5 border-b border-cream/10 flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow text-cream/45 mb-2">Your score vs this slice</p>
          <p className="font-display text-2xl text-cream tracking-tight">
            {slice.label}
          </p>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">
            {specificityHint(slice.specificity)}
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
          n = {sample.toLocaleString()}
        </p>
      </header>

      {/* Headline numbers */}
      <div className="px-6 sm:px-8 py-6 grid grid-cols-3 gap-6 border-b border-cream/10">
        <Stat label="You" value={userScore} accent />
        <Stat label="Cohort median" value={cohortScore ?? "—"} />
        <Stat
          label="Gap"
          value={overallDelta == null ? "—" : `${overallDelta > 0 ? "+" : ""}${overallDelta}`}
          tone={overallDelta == null ? "neutral" : overallDelta >= 0 ? "ahead" : "behind"}
        />
      </div>

      {/* Per-pillar deltas */}
      <ol className="divide-y divide-cream/10">
        {deltas.map((d) => (
          <li
            key={d.pillar}
            className="grid grid-cols-12 gap-3 items-center px-6 sm:px-8 py-3.5"
          >
            <span className="col-span-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              P{d.pillar}
            </span>
            <span className="col-span-5 font-display text-base text-cream/85 truncate" title={d.name}>
              {d.name}
            </span>
            <div className="col-span-4">
              <DeltaBar user={d.user} cohort={d.cohort} />
            </div>
            <span
              className={`col-span-2 text-right font-mono text-xs tracking-wide tabular-nums ${
                d.delta > 0
                  ? "text-brass-bright"
                  : d.delta < 0
                  ? "text-pillar-7"
                  : "text-cream/45"
              }`}
            >
              {d.delta > 0 ? "+" : ""}
              {d.delta.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tone?: "neutral" | "ahead" | "behind";
}) {
  const colour =
    tone === "ahead"
      ? "text-brass-bright"
      : tone === "behind"
      ? "text-pillar-7"
      : accent
      ? "text-brass-bright"
      : "text-cream";
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40 mb-2">
        {label}
      </p>
      <p className={`font-display font-light text-4xl sm:text-5xl tracking-tight tabular-nums ${colour}`}>
        {value}
      </p>
    </div>
  );
}

/** Mini double bar: cohort baseline + user overlay, capped to tier 5. */
function DeltaBar({ user, cohort }: { user: number; cohort: number }) {
  const max = 5;
  const userPct = Math.max(0, Math.min(1, user / max)) * 100;
  const cohortPct = Math.max(0, Math.min(1, cohort / max)) * 100;
  return (
    <div className="relative h-1.5 w-full bg-cream/8 rounded-full overflow-hidden">
      {/* Cohort = thin neutral line */}
      <span
        className="absolute top-0 left-0 h-full bg-cream/30"
        style={{ width: `${cohortPct}%` }}
        aria-hidden
      />
      {/* User = bold brass overlay */}
      <span
        className="absolute top-0 left-0 h-full bg-brass-bright"
        style={{ width: `${userPct}%`, mixBlendMode: "screen" }}
        aria-hidden
      />
    </div>
  );
}
