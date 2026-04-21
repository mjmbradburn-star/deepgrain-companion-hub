// Hand-rolled 8-axis radar. Built in raw SVG so the typography, stroke
// weights and brass tinting line up with the rest of the editorial system.
//
// Tier scale: 0 (centre) to 5 (outer ring).

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
  /** Renders pillar labels (mono, uppercase) around the rim. */
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
  // leave room for labels — labels render at 5.55 × radius then nudge ±6px,
  // so the inner radius needs ~92px of padding to keep the "P{n}" caption
  // and pillar name from clipping at any edge of the SVG bounding box.
  const padding = showLabels ? 92 : 24;
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

      {/* Tier ring labels.
          The radial scale matches the 0–5 maturity ladder used in the pillar
          breakdown (0 = Dormant at centre, 5 = AI-Native at the rim). We label
          rings 1, 3 and 5 with both the numeric tier and the named maturity
          stage so the legend on this chart reads the same as the comparison
          bars elsewhere.
          Placed on a quiet diagonal spoke (between P8 at 315° and P1 at 0°/top)
          so they never collide with the P1 "Strategy" label at 12 o'clock. */}
      {([
        [1, "Reactive"],
        [3, "Operational"],
        [5, "AI-Native"],
      ] as const).map(([tier, name]) => {
        // -45° from horizontal, in canvas coords that's upper-left of centre.
        const a = -Math.PI / 2 - Math.PI / 4; // 315° equivalent
        const r = (tier / RINGS) * radius;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return (
          <text
            key={`ring-${tier}`}
            x={x - 4}
            y={y - 4}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            letterSpacing={1.4}
            textAnchor="end"
            fill="hsl(var(--cream) / 0.32)"
          >
            <tspan fill="hsl(var(--brass-bright) / 0.75)">T{tier}</tspan>
            <tspan dx={4}>{name.toUpperCase()}</tspan>
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

      {/* Pillar labels */}
      {showLabels && PILLAR_INDICES.map((i) => {
        const [x, y] = pointFor(i, 5.55);
        const angle = (-90) + ((i - 1) * 45);
        const anchor = labelAnchor(angle);
        return (
          <g key={`label-${i}`}>
            <text
              x={x}
              y={y - 6}
              fontSize={9.5}
              fontFamily="ui-monospace, monospace"
              letterSpacing={1.6}
              textAnchor={anchor}
              fill="hsl(var(--brass-bright) / 0.7)"
            >
              P{i}
            </text>
            <text
              x={x}
              y={y + 7}
              fontSize={11}
              fontFamily="'Cormorant Garamond', Georgia, serif"
              textAnchor={anchor}
              fill="hsl(var(--cream) / 0.85)"
            >
              {labels[i] ?? ""}
            </text>
          </g>
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
