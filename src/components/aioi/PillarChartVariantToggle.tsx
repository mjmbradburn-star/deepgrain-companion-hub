// Tiny segmented toggle to switch the pillar chart between bar and lollipop
// styles. Lifted into its own component so the report and benchmarks pages
// share the same control + persistence behaviour.
//
// The choice is stored in localStorage under "aioi.pillarChartVariant" so it
// persists across reloads and across both pages — if you pick lollipop on
// the report, the benchmarks page comes up in lollipop too.

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PillarChartVariant } from "./PillarBarChart";

const STORAGE_KEY = "aioi.pillarChartVariant";

export function usePillarChartVariant(initial: PillarChartVariant = "bar") {
  const [variant, setVariant] = useState<PillarChartVariant>(initial);

  // Hydrate from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "bar" || stored === "lollipop") setVariant(stored);
    } catch {
      // localStorage unavailable (private mode, SSR) — fall back to default.
    }
  }, []);

  const update = useCallback((next: PillarChartVariant) => {
    setVariant(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / disabled storage */
    }
  }, []);

  return [variant, update] as const;
}

interface PillarChartVariantToggleProps {
  value: PillarChartVariant;
  onChange: (next: PillarChartVariant) => void;
  className?: string;
}

export function PillarChartVariantToggle({
  value,
  onChange,
  className,
}: PillarChartVariantToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Chart style"
      className={cn(
        "inline-flex items-center rounded-full border border-cream/15 bg-surface-1/40 p-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
        className,
      )}
    >
      {(["bar", "lollipop"] as const).map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-bright/60",
              active
                ? "bg-brass-bright/20 text-brass-bright"
                : "text-cream/55 hover:text-cream/85",
            )}
          >
            {v === "bar" ? "Bars" : "Lollipop"}
          </button>
        );
      })}
    </div>
  );
}
