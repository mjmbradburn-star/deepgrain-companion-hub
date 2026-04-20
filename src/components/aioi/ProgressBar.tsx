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

export function ProgressBar({ segments, className }: { segments: Segment[]; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[2px] h-1.5 w-full", className)} role="progressbar">
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
  );
}
