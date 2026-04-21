// Horizontal bar chart for the 8 AIOI pillars.
//
// Replaces the radar chart in both the assessment report and benchmarks
// page. Reasoning: a radar's polygon shape carries no analytic meaning at
// the sizes we render on mobile, and the rotated rim labels never had
// enough room to breathe. A horizontal bar list gives every pillar a full
// row, full-size labels, and an obvious "you vs cohort" comparison.
//
// Visual grammar:
//   • Each pillar is a row with the name on the left.
//   • A faint 0–5 track sits behind the bar.
//   • The user's tier renders as a brass-filled bar.
//   • The cohort median (if present) is a single vertical tick — the gap
//     between the bar end and the tick is the deficit/lead at a glance.
//   • Tier value (e.g. "3.4") is printed at the right edge of the row.

import { cn } from "@/lib/utils";

export type PillarChartVariant = "bar" | "lollipop";

interface PillarBarChartProps {
  /** Pillar index (1..8) → tier 0..5 */
  values: Record<number, number>;
  /** Optional cohort-median overlay, same shape */
  cohort?: Record<number, number>;
  /** Pillar index → human label */
  labels: Record<number, string>;
  /** Whether to render row labels. Set false for tiny preview cards. */
  showLabels?: boolean;
  /** Whether to render the numeric tier on the right edge. */
  showValues?: boolean;
  /** Visual style. "bar" = filled brass bar (default).
   *  "lollipop" = faint track with a single brass dot at the user's tier;
   *  cohort median still shown as a vertical tick. More editorial, less ink. */
  variant?: PillarChartVariant;
  className?: string;
}

const PILLAR_INDICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const MAX_TIER = 5;

export function PillarBarChart({
  values,
  cohort,
  labels,
  showLabels = true,
  showValues = true,
  variant = "bar",
  className,
}: PillarBarChartProps) {
  return (
    <div className={cn("w-full", className)} role="img" aria-label="AIOI pillar comparison">
      {/* Top axis ticks — quiet 0..5 scale shared by every row */}
      <div className={cn(
        "mb-3 grid items-end font-mono text-[9px] uppercase tracking-[0.18em] text-cream/35",
        showLabels ? "grid-cols-[minmax(80px,28%)_1fr_minmax(28px,auto)] sm:grid-cols-[minmax(110px,22%)_1fr_minmax(32px,auto)]" : "grid-cols-[1fr_minmax(28px,auto)]",
      )}>
        {showLabels && <div />}
        <div className="relative h-3">
          {[0, 1, 2, 3, 4, 5].map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 tabular-nums"
              style={{ left: `${(t / MAX_TIER) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        {showValues && <div />}
      </div>

      <ul className="space-y-2.5">
        {PILLAR_INDICES.map((i) => {
          const userTier = clamp(values[i] ?? 0);
          const cohortTier = cohort && cohort[i] != null ? clamp(cohort[i]) : null;
          const userPct = (userTier / MAX_TIER) * 100;
          const cohortPct = cohortTier != null ? (cohortTier / MAX_TIER) * 100 : null;
          const ahead = cohortTier != null && userTier >= cohortTier;

          return (
            <li
              key={i}
              className={cn(
                "grid items-center gap-x-3",
                showLabels
                  ? "grid-cols-[minmax(80px,28%)_1fr_minmax(28px,auto)] sm:grid-cols-[minmax(110px,22%)_1fr_minmax(32px,auto)]"
                  : "grid-cols-[1fr_minmax(28px,auto)]",
              )}
            >
              {showLabels && (
                <div className="min-w-0">
                  <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-cream/75 truncate">
                    {labels[i] ?? `Pillar ${i}`}
                  </p>
                </div>
              )}

              {/* Track + bar + cohort tick */}
              <div className="relative h-3 sm:h-3.5">
                {/* Track */}
                <div className="absolute inset-0 rounded-sm bg-cream/[0.06]" />
                {/* Subtle interior gridlines at each tier */}
                {[1, 2, 3, 4].map((t) => (
                  <span
                    key={t}
                    aria-hidden
                    className="absolute top-0 bottom-0 w-px bg-cream/[0.06]"
                    style={{ left: `${(t / MAX_TIER) * 100}%` }}
                  />
                ))}
                {/* User bar */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-sm",
                    ahead ? "bg-brass-bright" : "bg-brass-bright/85",
                  )}
                  style={{ width: `${Math.max(userPct, 1.5)}%` }}
                />
                {/* Cohort median tick */}
                {cohortPct != null && (
                  <span
                    aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                    className="absolute -top-1 -bottom-1 w-px bg-cream/70"
                    style={{ left: `${cohortPct}%` }}
                  >
                    <span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/80" />
                    <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/80" />
                  </span>
                )}
              </div>

              {showValues && (
                <p className="text-right font-mono text-[10px] sm:text-[11px] tabular-nums text-cream/85">
                  {userTier.toFixed(1)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function clamp(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(MAX_TIER, v));
}
