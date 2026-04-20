import { cn } from "@/lib/utils";
import type { PillarIndex } from "./PillarChip";

interface Segment {
  pillar: PillarIndex;
  filled: boolean;
}

// Use HSL var() so segment fill can crossfade between pillar colours
// via inline `backgroundColor` (Tailwind class swaps cannot animate colour).
const pillarColorVar: Record<PillarIndex, string> = {
  1: "hsl(var(--pillar-1))", 2: "hsl(var(--pillar-2))",
  3: "hsl(var(--pillar-3))", 4: "hsl(var(--pillar-4))",
  5: "hsl(var(--pillar-5))", 6: "hsl(var(--pillar-6))",
  7: "hsl(var(--pillar-7))", 8: "hsl(var(--pillar-8))",
};

const EMPTY_FILL = "hsl(var(--cream) / 0.10)";

const pillarText: Record<PillarIndex, string> = {
  1: "text-pillar-1", 2: "text-pillar-2", 3: "text-pillar-3", 4: "text-pillar-4",
  5: "text-pillar-5", 6: "text-pillar-6", 7: "text-pillar-7", 8: "text-pillar-8",
};

interface ProgressBarProps {
  segments: Segment[];
  className?: string;
  currentPillar?: PillarIndex;
  currentPillarLabel?: string;
}

export function ProgressBar({ segments, className, currentPillar, currentPillarLabel }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      {currentPillar && currentPillarLabel && (
        <div className="mb-2 flex items-center justify-between h-3.5 overflow-hidden">
          <div
            key={currentPillar}
            className={cn(
              "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] animate-fade-in",
              pillarText[currentPillar],
            )}
          >
            <span className="opacity-60">P{currentPillar}</span>
            <span>{currentPillarLabel}</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-[2px] h-1.5 w-full" role="progressbar">
        {segments.map((s, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-[1px] transition-[background-color] duration-200 ease-out"
            style={{ backgroundColor: s.filled ? pillarColorVar[s.pillar] : EMPTY_FILL }}
          />
        ))}
      </div>
    </div>
  );
}
