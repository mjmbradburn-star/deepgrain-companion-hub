// Hand-rolled 8-axis radar. Built in raw SVG so the typography, stroke
// weights and brass tinting line up with the rest of the editorial system.
//
// Tier scale: 0 (centre) to 5 (outer ring).
//
// Labelling philosophy (rewritten):
//  - One label per pillar (just the name, small caps). No P1/P2 eyebrow.
//  - Ring numerals appear ONLY on a single quiet axis (12 o'clock spoke,
//    nudged off-spoke) so each ring gets one tick, not three competing tags.
//  - Maturity-stage names (Reactive / Operational / AI-Native) move out of
//    the chart entirely and live in a discrete legend strip rendered by the
//    consumer below the SVG — keeps the chart itself uncluttered.

import { cn } from "@/lib/utils";

interface RadarChartProps {
  /** Pillar index (1..8) → tier 0..5 */
  values: Record<number, number>;
  /** Optional cohort-median overlay, same shape */
  cohort?: Record<number, number>;
  /** Pillar index → human label */
  labels: Record<number, string>;
  /** Side length in px. Internal padding is automatic. */
  size?: number;
  className?: string;
  /** Renders pillar labels around the rim. */
  showLabels?: boolean;
}

const RINGS = 5; // 0..5 → 5 segments
const PILLAR_INDICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function RadarChart({
  values,
  cohort,
  labels,
  size = 520,
  className,
  showLabels = true,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  // Tighter padding now that labels are single-line — chart can breathe more.
  const padding = showLabels ? 72 : 24;
  const radius = size / 2 - padding;

  // Convert (pillarIndex, tier) → (x, y) on the polar grid.
  // Pillar 1 sits at the top (12 o'clock); we step clockwise.
  const pointFor = (pillarIdx: number, tier: number) => {
    const angle = (-Math.PI / 2) + ((pillarIdx - 1) * (2 * Math.PI)) / 8;
    const r = (Math.max(0, Math.min(5, tier)) / RINGS) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };

  const valuePoints = PILLAR_INDICES.map((i) => pointFor(i, values[i] ?? 0));
  const cohortPoints = cohort
    ? PILLAR_INDICES.map((i) => pointFor(i, cohort[i] ?? 0))
    : null;

  const valuePath = pointsToPath(valuePoints);
  const cohortPath = cohortPoints ? pointsToPath(cohortPoints) : null;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("w-full h-auto select-none", className)}
      role="img"
      aria-label="AIOI pillar radar"
    >
      {/* Concentric rings */}
      {Array.from({ length: RINGS }).map((_, i) => {
        const r = ((i + 1) / RINGS) * radius;
        const isOuter = i === RINGS - 1;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(var(--cream) / 0.08)"
            strokeWidth={isOuter ? 1 : 0.6}
            strokeDasharray={isOuter ? undefined : "1 4"}
          />
        );
      })}

      {/* Spokes */}
      {PILLAR_INDICES.map((i) => {
        const [x, y] = pointFor(i, 5);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="hsl(var(--cream) / 0.08)"
            strokeWidth={0.6}
          />
        );
      })}

      {/* Single-axis ring numerals.
          Each ring gets one tiny numeral (1..5) on a quiet diagonal between
          P8 and P1, nudged just off the spoke so it never touches geometry
          or the P1 label. No stage names, no T-prefix — those live in a
          legend strip outside the SVG. */}
      {[1, 2, 3, 4, 5].map((tier) => {
        const a = -Math.PI / 2 - Math.PI / 4; // 315° quiet diagonal
        const r = (tier / RINGS) * radius;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return (
          <text
            key={`ring-${tier}`}
            x={x - 3}
            y={y - 3}
            fontSize={8.5}
            fontFamily="ui-monospace, monospace"
            textAnchor="end"
            fill="hsl(var(--cream) / 0.28)"
          >
            {tier}
          </text>
        );
      })}

      {/* Cohort polygon (under the user's) */}
      {cohortPath && (
        <>
          <path
            d={cohortPath}
            fill="hsl(var(--cream) / 0.06)"
            stroke="hsl(var(--cream) / 0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          {cohortPoints!.map(([x, y], idx) => (
            <circle
              key={`c-${idx}`}
              cx={x}
              cy={y}
              r={2.2}
              fill="hsl(var(--cream) / 0.45)"
            />
          ))}
        </>
      )}

      {/* User polygon */}
      <path
        d={valuePath}
        fill="hsl(var(--brass) / 0.18)"
        stroke="hsl(var(--brass-bright))"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {valuePoints.map(([x, y], idx) => (
        <circle
          key={`v-${idx}`}
          cx={x}
          cy={y}
          r={3.2}
          fill="hsl(var(--brass-bright))"
          stroke="hsl(var(--walnut))"
          strokeWidth={1.4}
        />
      ))}

      {/* Pillar labels — single line, small caps, no P-prefix.
          Sits just outside the rim; vertical offset baked into y so the text
          is optically centred against its spoke. */}
      {showLabels && PILLAR_INDICES.map((i) => {
        const [x, y] = pointFor(i, 5.32);
        const angle = (-90) + ((i - 1) * 45);
        const anchor = labelAnchor(angle);
        // Nudge top/bottom labels vertically so they don't sit on the rim.
        const a = ((angle % 360) + 360) % 360;
        const dy = a < 22 || a > 338 ? -2 : (a > 158 && a < 202) ? 10 : 4;
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y + dy}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
            letterSpacing={1.4}
            textAnchor={anchor}
            fill="hsl(var(--cream) / 0.78)"
          >
            {(labels[i] ?? "").toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

function pointsToPath(points: ReadonlyArray<readonly [number, number]>) {
  return points
    .map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`))
    .join(" ") + " Z";
}

function labelAnchor(angleDeg: number): "start" | "middle" | "end" {
  // Top / bottom => middle; right side => start; left => end.
  const a = ((angleDeg % 360) + 360) % 360;
  if (a < 22 || a > 338 || (a > 158 && a < 202)) return "middle";
  if (a >= 22 && a <= 158) return "start";
  return "end";
}
