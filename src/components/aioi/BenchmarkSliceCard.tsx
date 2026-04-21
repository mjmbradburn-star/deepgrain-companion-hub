// "Your score vs this slice" card. Mounted on the Assess Report Overview tab.
//
// Shows the user's score against the most specific cohort we can find
// (function + region → function → region → level), with per-pillar deltas
// sorted by widest gap so the strongest and weakest comparisons surface first.

import { useMemo } from "react";

import { PILLAR_NAMES } from "@/lib/assessment";
import { pillarsFromRow, type MatchedSlice } from "@/lib/benchmarks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

/** Compact relative time: "just now", "5 min ago", "2 days ago", "3 weeks ago". */
function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffWk = Math.round(diffDay / 7);
  if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? "" : "s"} ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo} mo ago`;
  const diffYr = Math.round(diffDay / 365);
  return `${diffYr} yr ago`;
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
    <TooltipProvider delayDuration={150}>
    <section className="border border-cream/10 rounded-md bg-surface-1/40 overflow-hidden">
      <header className="px-6 sm:px-8 pt-6 pb-5 border-b border-cream/10 flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow text-cream/45 mb-2">Your score vs this slice</p>
          <p className="font-display text-2xl text-cream tracking-tight">
            {slice.label}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 hover:text-cream/70 focus:text-cream/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-bright/60 rounded transition-colors cursor-help"
              >
                <span>{specificityHint(slice.specificity)}</span>
                <span aria-hidden className="text-cream/35">(?)</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="max-w-xs p-0">
              <SpecificityLegend active={slice.specificity} />
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="text-right space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
            n = {sample.toLocaleString()}
          </p>
          {relativeTime(slice.row.refreshed_at) && (
            <p
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40"
              title={slice.row.refreshed_at ?? undefined}
            >
              Refreshed {relativeTime(slice.row.refreshed_at)}
            </p>
          )}
        </div>
      </header>

      {/* Headline numbers */}
      <div className="px-6 sm:px-8 py-6 grid grid-cols-3 gap-6 border-b border-cream/10">
        <Stat
          label="You"
          value={userScore}
          accent
          hint="Your weighted AIOI score (0–100 score points, rounded to the nearest whole point)."
        />
        <Stat
          label="Cohort median"
          value={cohortScore ?? "—"}
          hint={
            cohortScore == null
              ? "Cohort median is unavailable: this slice does not yet publish a median score (the underlying benchmark row has no median_score, usually because the cohort is still below the minimum sample threshold)."
              : "Median weighted AIOI score for this cohort (0–100 score points, rounded to the nearest whole point)."
          }
        />
        <Stat
          label="Gap"
          value={overallDelta == null ? "—" : `${overallDelta > 0 ? "+" : ""}${overallDelta}`}
          tone={overallDelta == null ? "neutral" : overallDelta >= 0 ? "ahead" : "behind"}
          hint={
            overallDelta == null
              ? "Gap can't be calculated: it needs both your score and a cohort median, and the cohort median for this slice is unavailable. Once the slice publishes a median, the gap will appear here."
              : "You vs cohort median, in AIOI score points (0–100 scale). Positive = ahead of the cohort. Per-pillar deltas below are in tier points (0–5)."
          }
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`col-span-2 text-right font-mono text-xs tracking-wide tabular-nums focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-bright/60 rounded cursor-help ${
                    d.delta > 0
                      ? "text-brass-bright"
                      : d.delta < 0
                      ? "text-pillar-7"
                      : "text-cream/45"
                  }`}
                >
                  {d.delta > 0 ? "+" : ""}
                  {d.delta.toFixed(1)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" className="max-w-xs text-xs leading-snug">
                You vs cohort median for {d.name}, in tier points (0–5 scale, rounded to 1 decimal).
                You: {d.user.toFixed(1)} · Cohort: {d.cohort.toFixed(1)}.
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ol>
    </section>
    </TooltipProvider>
  );
}

function SpecificityLegend({ active }: { active: number }) {
  const rows: { id: number; label: string; detail: string }[] = [
    { id: 3, label: "Function + region", detail: "Tightest match — both fields shared" },
    { id: 2, label: "Function or region", detail: "One field shared with the cohort" },
    { id: 1, label: "Level fallback", detail: "Everyone at your assessment level" },
    { id: 0, label: "Approximate", detail: "Best available row at this level" },
  ];
  return (
    <div className="p-3 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/60">
        How specific is this cohort?
      </p>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const isActive = r.id === active;
          return (
            <li key={r.id} className="flex items-start gap-2 text-xs leading-snug">
              <span
                aria-hidden
                className={isActive ? "text-brass-bright" : "text-cream/25"}
              >
                ●
              </span>
              <span>
                <span className={isActive ? "text-brass-bright font-medium" : "text-cream/85"}>
                  {r.label}
                </span>
                <span className="text-cream/50"> — {r.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tone?: "neutral" | "ahead" | "behind";
  hint?: string;
}) {
  const colour =
    tone === "ahead"
      ? "text-brass-bright"
      : tone === "behind"
      ? "text-pillar-7"
      : accent
      ? "text-brass-bright"
      : "text-cream";
  const labelEl = hint ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40 mb-2 inline-flex items-center gap-1 hover:text-cream/70 focus:text-cream/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-bright/60 rounded cursor-help"
        >
          <span>{label}</span>
          <span aria-hidden className="text-cream/30">(?)</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-snug">
        {hint}
      </TooltipContent>
    </Tooltip>
  ) : (
    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40 mb-2">
      {label}
    </p>
  );
  return (
    <div>
      {labelEl}
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
