/**
 * ArchetypeGlyph — abstract SVG motifs for each archetype.
 * Each shape is drawn with stroke-dasharray animation capability.
 */
import { useEffect, useRef, useState } from "react";

const GLYPHS: Record<
  number,
  { viewBox: string; paths: string[]; circles?: { cx: number; cy: number; r: number }[] }
> = {
  0: {
    viewBox: "0 0 120 120",
    paths: [
      "M60 20 A40 40 0 1 1 60 100 A40 40 0 1 1 60 20",
      "M60 35 A25 25 0 1 1 60 85 A25 25 0 1 1 60 35",
      "M60 50 A10 10 0 1 1 60 70 A10 10 0 1 1 60 50",
      "M60 20 L60 10 M60 110 L60 100 M20 60 L10 60 M110 60 L100 60",
    ],
  },
  1: {
    viewBox: "0 0 120 120",
    paths: [
      "M30 30 L50 50 M70 70 L90 90",
      "M90 30 L70 50 M50 70 L30 90",
      "M60 15 L60 35 M60 85 L60 105 M15 60 L35 60 M85 60 L105 60",
    ],
    circles: [
      { cx: 30, cy: 30, r: 6 },
      { cx: 90, cy: 30, r: 5 },
      { cx: 30, cy: 90, r: 4 },
      { cx: 90, cy: 90, r: 7 },
      { cx: 60, cy: 60, r: 3 },
    ],
  },
  2: {
    viewBox: "0 0 120 120",
    paths: [
      "M60 10 L60 35 M60 85 L60 110 M10 60 L35 60 M85 60 L110 60",
      "M28 28 L45 45 M75 75 L92 92 M92 28 L75 45 M45 75 L28 92",
      "M60 60 L60 60",
    ],
    circles: [
      { cx: 60, cy: 60, r: 4 },
      { cx: 60, cy: 22, r: 3 },
      { cx: 60, cy: 98, r: 3 },
      { cx: 22, cy: 60, r: 3 },
      { cx: 98, cy: 60, r: 3 },
    ],
  },
  3: {
    viewBox: "0 0 120 120",
    paths: [
      "M30 60 L90 60 M60 30 L60 90",
      "M30 30 L90 90 M90 30 L30 90",
      "M60 10 A50 50 0 1 1 60 110 A50 50 0 1 1 60 10",
    ],
    circles: [
      { cx: 30, cy: 60, r: 5 },
      { cx: 90, cy: 60, r: 5 },
      { cx: 60, cy: 30, r: 5 },
      { cx: 60, cy: 90, r: 5 },
      { cx: 60, cy: 60, r: 6 },
    ],
  },
  4: {
    viewBox: "0 0 120 120",
    paths: [
      "M20 20 L100 20 L100 100 L20 100 Z",
      "M20 20 L100 100 M100 20 L20 100",
      "M40 20 L40 100 M60 20 L60 100 M80 20 L80 100",
      "M20 40 L100 40 M20 60 L100 60 M20 80 L100 80",
    ],
  },
};

export function ArchetypeGlyph({
  index,
  size = 80,
  strokeWidth = 1.2,
  animate = false,
  className = "",
  colour = "hsl(var(--cream))",
}: {
  index: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
  colour?: string;
}) {
  const glyph = GLYPHS[index] ?? GLYPHS[0];
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const pathLen = 400;

  return (
    <svg
      ref={ref}
      viewBox={glyph.viewBox}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ overflow: "visible" }}
    >
      {glyph.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLen,
            strokeDashoffset: drawn ? 0 : pathLen,
            transition: `stroke-dashoffset ${900 + i * 180}ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 100}ms`,
          }}
        />
      ))}
      {glyph.circles?.map((c, i) => (
        <circle
          key={`c${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth * 0.8}
          style={{
            opacity: drawn ? 1 : 0,
            transition: `opacity 500ms ease ${600 + i * 80}ms`,
          }}
        />
      ))}
    </svg>
  );
}
