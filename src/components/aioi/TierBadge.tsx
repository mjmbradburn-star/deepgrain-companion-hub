import { cn } from "@/lib/utils";

export type Tier = "Dormant" | "Exploring" | "Deployed" | "Integrated" | "Leveraged" | "AI-Native";

const tierStyles: Record<Tier, string> = {
  Dormant:      "bg-pillar-8/20 text-cream-dim ring-pillar-8/40",
  Exploring:    "bg-pillar-2/15 text-pillar-2 ring-pillar-2/30",
  Deployed:     "bg-pillar-5/15 text-pillar-5 ring-pillar-5/30",
  Integrated:   "bg-pillar-3/20 text-pillar-3 ring-pillar-3/40",
  Leveraged:    "bg-pillar-7/15 text-pillar-7 ring-pillar-7/30",
  "AI-Native":  "bg-brass/20 text-brass-bright ring-brass/40",
};

const tierIndex: Record<Tier, number> = {
  Dormant: 0, Exploring: 1, Deployed: 2, Integrated: 3, Leveraged: 4, "AI-Native": 5,
};

export function TierBadge({ tier, showIndex = true, className }: { tier: Tier; showIndex?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ring-1 ring-inset font-ui",
        tierStyles[tier],
        className,
      )}
    >
      {showIndex && <span className="font-mono opacity-70">{tierIndex[tier]}</span>}
      <span>{tier}</span>
    </span>
  );
}
