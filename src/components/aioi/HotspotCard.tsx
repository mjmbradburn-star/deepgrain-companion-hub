import { cn } from "@/lib/utils";
import { PillarChip, type PillarIndex } from "./PillarChip";
import { TierBadge, type Tier } from "./TierBadge";

interface HotspotCardProps {
  pillar: PillarIndex;
  pillarLabel: string;
  tier: Tier;
  diagnosis: string;
  intervention?: string;
  className?: string;
}

export function HotspotCard({ pillar, pillarLabel, tier, diagnosis, intervention, className }: HotspotCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-cream/10 bg-surface-1/70 backdrop-blur-sm p-6",
        "motion-lift motion-tap hover:border-brass/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <PillarChip index={pillar} label={pillarLabel} />
        <TierBadge tier={tier} />
      </div>
      <p className="font-display text-2xl text-cream leading-snug text-balance">{diagnosis}</p>
      {intervention && (
        <>
          <div className="my-4 hairline h-px" />
          <p className="text-sm text-cream/60 leading-relaxed">
            <span className="eyebrow text-brass-bright/80 mr-2">Move</span>
            {intervention}
          </p>
        </>
      )}
    </article>
  );
}
