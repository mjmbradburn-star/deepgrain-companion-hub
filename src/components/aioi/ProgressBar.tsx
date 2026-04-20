import { cn } from "@/lib/utils";
import type { PillarIndex } from "./PillarChip";

interface Segment {
  pillar: PillarIndex;
  filled: boolean;
}

const pillarFill: Record<PillarIndex, string> = {
  1: "bg-pillar-1", 2: "bg-pillar-2", 3: "bg-pillar-3", 4: "bg-pillar-4",
  5: "bg-pillar-5", 6: "bg-pillar-6", 7: "bg-pillar-7", 8: "bg-pillar-8",
};

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
            className={cn(
              "flex-1 h-full rounded-[1px] transition-all duration-500 ease-out",
              s.filled ? pillarFill[s.pillar] : "bg-cream/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}
