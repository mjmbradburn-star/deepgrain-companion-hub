// Horizontal bar chart for the 8 AIOI pillars.
//
// Replaces the radar chart in both the assessment report and benchmarks
// page. A horizontal bar list gives every pillar a full row, full-size
// labels, and an obvious "you vs cohort" comparison.
//
// Layout strategy:
//   • <sm (very narrow phones): pillar name on its own line, then a
//     full-width [track | value] sub-grid below it. Names never truncate;
//     the value column stays the same width across all 8 rows.
//   • ≥sm: pillar name floats to the left of the same [track | value]
//     sub-grid via flex. The sub-grid is the SAME node in both layouts,
//     so the right-hand value column is pixel-aligned with the axis.
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

export function PillarBarChart({
  values,
  cohort,
  labels,
  showLabels = true,
  showValues = true,
  variant = "bar",
  className,
}: PillarBarChartProps) {
  // The [track | value] sub-grid template is identical in both the axis
  // header and every row, so the numeric column always lines up.
  const trackValueGrid = showValues
    ? "grid grid-cols-[1fr_2.25rem] items-center gap-x-3"
    : "grid grid-cols-[1fr] items-center";

  return (
    <div className={cn("pillar-bar-chart w-full", className)} role="img" aria-label="AIOI pillar comparison">
      <PrintStyles />
      {/* Top axis ticks — full width on <sm, indented to match labels on ≥sm. */}
      <div className={cn(
        "mb-3 flex items-end gap-x-3",
        // ≥sm: reserve a label-column-width gutter on the left so the
        // axis ticks align horizontally with the rows' tracks.
        showLabels && "sm:[&>.axis-spacer]:basis-[max(110px,22%)] sm:[&>.axis-spacer]:shrink-0",
      )}>
        {showLabels && <div className="axis-spacer hidden sm:block" aria-hidden />}
        <div className={cn("flex-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cream/35", trackValueGrid)}>
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
      </div>

      <ul className="space-y-4 sm:space-y-2.5">
        {PILLAR_INDICES.map((i) => {
          const userTier = clamp(values[i] ?? 0);
          const cohortTier = cohort && cohort[i] != null ? clamp(cohort[i]) : null;
          const userPct = (userTier / MAX_TIER) * 100;
          const cohortPct = cohortTier != null ? (cohortTier / MAX_TIER) * 100 : null;
          const ahead = cohortTier != null && userTier >= cohortTier;

          const trackAndValue = (
            <div className={cn("flex-1 min-w-0", trackValueGrid)}>
              <div className="relative h-3.5 sm:h-3.5">
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

                {/* Gap segment between user mark and cohort tick */}
                {cohortPct != null && Math.abs(userPct - cohortPct) > 0.5 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-full",
                      variant === "lollipop" ? "h-[2px]" : "h-[3px]",
                      ahead
                        ? variant === "lollipop" ? "bg-brass-bright/70" : "bg-brass-bright/35"
                        : variant === "lollipop" ? "bg-pillar-7/80" : "bg-pillar-7/45",
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
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brass-bright shadow-[0_0_0_1.5px_hsl(var(--walnut))] sm:shadow-[0_0_0_2px_hsl(var(--walnut))]",
                      "h-2 w-2 sm:h-3 sm:w-3",
                    )}
                    style={{ left: `${userPct}%` }}
                  />
                )}

                {/* Cohort median */}
                {cohortPct != null && (
                  variant === "bar" ? (
                    <span
                      aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                      className="absolute -top-0.5 -bottom-0.5 w-px bg-cream/60"
                      style={{ left: `${cohortPct}%`, transform: "translateX(-0.5px)" }}
                    >
                      <span className="absolute -top-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/70" />
                      <span className="absolute -bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/70" />
                    </span>
                  ) : (
                    <span
                      aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border border-cream/75 sm:border-2 bg-walnut",
                        "h-2 w-2 sm:h-3 sm:w-3",
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

          if (!showLabels) {
            return <li key={i} className="flex items-center">{trackAndValue}</li>;
          }

          return (
            <li
              key={i}
              // <sm: stack (block flex-col). ≥sm: row (flex). The label
              // gets a fixed basis on ≥sm so columns line up across rows.
              className="flex flex-col gap-y-1 sm:flex-row sm:items-center sm:gap-x-3 sm:gap-y-0"
            >
              <div className="min-w-0 sm:basis-[max(110px,22%)] sm:shrink-0">
                <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-cream/75 break-words">
                  {labels[i] ?? `Pillar ${i}`}
                </p>
              </div>
              {trackAndValue}
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
