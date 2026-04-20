import { cn } from "@/lib/utils";

export function ScoreBadge({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="font-display text-[96px] leading-none text-brass-bright tracking-tight tabular-nums">
        {value}
      </span>
      <span className="font-mono text-sm text-cream/50">/ {max}</span>
    </div>
  );
}
