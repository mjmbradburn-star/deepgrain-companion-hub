import { cn } from "@/lib/utils";

export type PillarIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface PillarChipProps {
  index: PillarIndex;
  label: string;
  number?: boolean;
  className?: string;
}

const pillarBg: Record<PillarIndex, string> = {
  1: "bg-pillar-1/15 text-pillar-1 ring-pillar-1/30",
  2: "bg-pillar-2/15 text-pillar-2 ring-pillar-2/30",
  3: "bg-pillar-3/20 text-pillar-3 ring-pillar-3/40",
  4: "bg-pillar-4/15 text-pillar-4 ring-pillar-4/30",
  5: "bg-pillar-5/15 text-pillar-5 ring-pillar-5/30",
  6: "bg-pillar-6/15 text-pillar-6 ring-pillar-6/30",
  7: "bg-pillar-7/15 text-pillar-7 ring-pillar-7/30",
  8: "bg-pillar-8/20 text-pillar-8 ring-pillar-8/40",
};

export function PillarChip({ index, label, number = true, className }: PillarChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ring-inset font-ui",
        pillarBg[index],
        className,
      )}
    >
      {number && <span className="font-mono opacity-80">P{index}</span>}
      <span>{label}</span>
    </span>
  );
}
