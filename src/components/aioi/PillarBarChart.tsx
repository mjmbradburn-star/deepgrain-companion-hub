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

import { useEffect, useRef, useState } from "react";
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

  // Bump a generation counter whenever the underlying tier values change,
  // but skip the very first render so the animation does not play on mount.
  // The counter is appended to the gap-segment key, forcing a remount —
  // and therefore a fresh `animate-gap-draw` play — only on real updates.
  const valuesSig = JSON.stringify({ v: values, c: cohort ?? null });
  const [gen, setGen] = useState(0);
  const mountedRef = useRef(false);
  const lastSigRef = useRef(valuesSig);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastSigRef.current = valuesSig;
      return;
    }
    if (lastSigRef.current !== valuesSig) {
      lastSigRef.current = valuesSig;
      setGen((g) => g + 1);
    }
  }, [valuesSig]);

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

                {/* Gap segment between user mark and cohort tick.
                    In lollipop mode we replay a center-out draw whenever the
                    underlying values change, so a filter switch makes the
                    delta visually obvious. The `key` forces a remount only
                    when user/cohort tiers actually change (not on every
                    render), and the animation is skipped on first mount via
                    a per-row mount flag below. */}
                {cohortPct != null && Math.abs(userPct - cohortPct) > 0.5 && (
                  <span
                    key={variant === "lollipop" ? `${userTier}-${cohortTier}` : undefined}
                    aria-hidden
                    data-gap-segment
                    data-direction={ahead ? "ahead" : "behind"}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-full origin-center",
                      variant === "lollipop" ? "h-[2px] animate-gap-draw motion-reduce:animate-none" : "h-[3px]",
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
                      data-cohort-tick
                      aria-label={`Cohort median: ${cohortTier!.toFixed(1)}`}
                      className="absolute -top-0.5 -bottom-0.5 w-px bg-cream/60"
                      style={{ left: `${cohortPct}%`, transform: "translateX(-0.5px)" }}
                    >
                      <span className="absolute -top-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/70" />
                      <span className="absolute -bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cream/70" />
                    </span>
                  ) : (
                    <span
                      data-cohort-tick
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

// Print-optimized overrides. Triggered automatically by @media print.
//
// Goals for paper:
//   • Thicker, high-contrast cohort ticks that survive monochrome printing.
//   • Gap segments use a stripe pattern (not just colour) so direction
//     reads even on B&W printers.
//   • Force background graphics to print (browsers strip them by default).
function PrintStyles() {
  return (
    <style>{`
      @media print {
        .pillar-bar-chart,
        .pillar-bar-chart * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pillar-bar-chart ul { gap: 0.65rem; }
        .pillar-bar-chart [data-cohort-tick] {
          background: #000 !important;
          width: 2px !important;
          top: -3px !important;
          bottom: -3px !important;
        }
        .pillar-bar-chart [data-cohort-tick] > span {
          background: #000 !important;
          width: 6px !important;
          height: 6px !important;
        }
        /* Lollipop cohort tick is the dot itself (no children). */
        .pillar-bar-chart [data-cohort-tick]:not(:has(> span)) {
          width: 12px !important;
          height: 12px !important;
          background: #fff !important;
          border: 2px solid #000 !important;
          top: 50% !important;
          bottom: auto !important;
        }
        /* Pattern-based gap indicator: diagonal stripes for "ahead",
           anti-diagonal for "behind". No colour required. */
        .pillar-bar-chart [data-gap-segment] {
          height: 6px !important;
          background: transparent !important;
          border: 1px solid #000 !important;
          border-radius: 0 !important;
        }
        .pillar-bar-chart [data-gap-segment][data-direction="ahead"] {
          background-image: repeating-linear-gradient(
            45deg, #000 0 1.5px, transparent 1.5px 4px
          ) !important;
        }
        .pillar-bar-chart [data-gap-segment][data-direction="behind"] {
          background-image: repeating-linear-gradient(
            -45deg, #000 0 1.5px, transparent 1.5px 4px
          ) !important;
        }
      }
    `}</style>
  );
}
