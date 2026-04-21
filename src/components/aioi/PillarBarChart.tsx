// Horizontal bar chart for the 8 AIOI pillars.
//
// Replaces the radar chart in both the assessment report and benchmarks
// page. A horizontal bar list gives every pillar a full row, full-size
// labels, and an obvious "you vs cohort" comparison.
//
// Layout strategy:
//   • <sm (very narrow phones): pillar name on its own line, then a
//     full-width track row with a fixed value column. Names never
//     truncate; tier values line up in a perfect right-hand column.
//   • ≥sm: side-by-side grid (label · track · value).
//
// Visual grammar:
//   • Faint 0–5 track behind every bar.
//   • User tier renders as a brass bar OR brass dot (lollipop variant).
//   • Cohort median = vertical tick (bar) or outline dot (lollipop).
//   • Coloured gap segment between user mark and cohort tick — brass
//     when ahead, clay when behind — so the gap reads at a glance.

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
  /** "bar" (default) or "lollipop" — see file header. */
  variant?: PillarChartVariant;
  className?: string;
}

const PILLAR_INDICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const MAX_TIER = 5;

// Single source of truth for the value column width — used by axis ticks
// and by every row, in both the stacked (<sm) and side-by-side (≥sm)
// layouts. Change here = change everywhere; numbers stay aligned.
const VALUE_COL = "2.25rem";

export function PillarBarChart({
  values,
  cohort,
  labels,
  showLabels = true,
  showValues = true,
  variant = "bar",
  className,
}: PillarBarChartProps) {
  // Grid templates. Building them once keeps the markup readable.
  const trackRowGrid = showValues
    ? `grid-cols-[1fr_${VALUE_COL}] gap-x-3 items-center`
    : "grid-cols-[1fr] items-center";
  const sideBySideGrid = showLabels
    ? showValues
      ? `sm:grid-cols-[minmax(110px,22%)_1fr_${VALUE_COL}] sm:gap-x-3 sm:items-center`
      : "sm:grid-cols-[minmax(110px,22%)_1fr] sm:gap-x-3 sm:items-center"
    : "";

  return (
    <div className={cn("w-full", className)} role="img" aria-label="AIOI pillar comparison">
      {/* Top axis ticks — share the row grid so 0..5 marks line up with bars. */}
      <div
        className={cn(
          "mb-3 grid items-end font-mono text-[9px] uppercase tracking-[0.18em] text-cream/35",
          trackRowGrid,
          showLabels && showValues && `sm:grid-cols-[minmax(110px,22%)_1fr_${VALUE_COL}]`,
          showLabels && !showValues && "sm:grid-cols-[minmax(110px,22%)_1fr]",
        )}
      >
        {showLabels && <div className="hidden sm:block" />}
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

      <ul className="space-y-3 sm:space-y-2.5">
        {PILLAR_INDICES.map((i) => {
          const userTier = clamp(values[i] ?? 0);
          const cohortTier = cohort && cohort[i] != null ? clamp(cohort[i]) : null;
          const userPct = (userTier / MAX_TIER) * 100;
          const cohortPct = cohortTier != null ? (cohortTier / MAX_TIER) * 100 : null;
          const ahead = cohortTier != null && userTier >= cohortTier;

          // Track + value sub-grid — same widths as the axis above so the
          // tier numbers form a clean right-hand column at every breakpoint.
          const trackAndValue = (
            <div className={cn("grid", trackRowGrid)}>
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

                {/* Gap segment between user mark and cohort tick. */}
                {cohortPct != null && Math.abs(userPct - cohortPct) > 0.5 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full",
                      ahead ? "bg-brass-bright/35" : "bg-pillar-7/45",
                    )}
                    style={{
                      left: `${Math.min(userPct, cohortPct)}%`,
                      width: `${Math.abs(userPct - cohortPct)}%`,
                    }}
                  />
                )}

                {/* User mark */}
                {variant === "bar" ? (
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-sm",
                      ahead ? "bg-brass-bright" : "bg-brass-bright/85",
                    )}
                    style={{ width: `${Math.max(userPct, 1.5)}%` }}
                  />
                ) : (
                  <span
                    aria-label={`You: ${userTier.toFixed(1)}`}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brass-bright shadow-[0_0_0_2px_hsl(var(--walnut))]",
                      "h-2.5 w-2.5 sm:h-3 sm:w-3",
                    )}
                    style={{ left: `${userPct}%` }}
                  />
                )}

                {/* Cohort median */}
                {cohortPct != null && (
                  variant === "bar" ? (
                    <span
                      aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                      className="absolute -top-1.5 -bottom-1.5 w-[2px] bg-cream/80"
                      style={{ left: `${cohortPct}%`, transform: "translateX(-1px)" }}
                    >
                      <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cream/85" />
                      <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cream/85" />
                    </span>
                  ) : (
                    <span
                      aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-cream/75 bg-walnut",
                        "h-2.5 w-2.5 sm:h-3 sm:w-3",
                      )}
                      style={{ left: `${cohortPct}%` }}
                    />
                  )
                )}
              </div>

              {showValues && (
                <p className="text-right font-mono text-[10px] sm:text-[11px] tabular-nums text-cream/85">
                  {userTier.toFixed(1)}
                </p>
              )}
            </div>
          );

          // <sm: pillar name stacks above the track row.
          // ≥sm: name, track, value live in a single 3-column grid.
          // We swap layouts via Tailwind's display utilities; the
          // trackAndValue sub-grid is preserved on mobile and unwrapped
          // (display:contents) on ≥sm so the columns line up with the label.
          if (!showLabels) {
            return <li key={i}>{trackAndValue}</li>;
          }

          return (
            <li key={i} className={cn("block sm:grid", sideBySideGrid)}>
              <div className="min-w-0 mb-1 sm:mb-0">
                <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-cream/75 break-words">
                  {labels[i] ?? `Pillar ${i}`}
                </p>
              </div>
              {/* On ≥sm, dissolve the inner sub-grid so its two children
                  (track + value) become direct children of the outer
                  3-column grid, keeping the numeric column aligned with
                  the axis ticks above. */}
              <div className="contents sm:contents">{trackAndValue}</div>
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
