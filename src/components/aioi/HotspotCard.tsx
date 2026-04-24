import { cn } from "@/lib/utils";
import { PillarChip, type PillarIndex } from "./PillarChip";
import { TierBadge, type Tier } from "./TierBadge";
import { EffortDots, ImpactDots } from "./MoveCard";

interface HotspotCardProps {
  pillar: PillarIndex;
  pillarLabel: string;
  tier: Tier;
  diagnosis: string;
  intervention?: string;
  /** Top selected Move on this pillar — adds the personalised "why" snippet. */
  moveTitle?: string;
  moveWhy?: string;
  moveEffort?: number | null;
  moveImpact?: number | null;
  className?: string;
}

export function HotspotCard({
  pillar,
  pillarLabel,
  tier,
  diagnosis,
  intervention,
  moveTitle,
  moveWhy,
  moveEffort,
  moveImpact,
  className,
}: HotspotCardProps) {
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

      {(moveTitle || moveWhy || intervention) && (
        <>
          <div className="my-4 hairline h-px" />
          <div className="space-y-2">
            <p className="eyebrow text-brass-bright/85">Move</p>
            {moveTitle && (
              <p className="font-display text-base text-cream leading-snug">{moveTitle}</p>
            )}
            <p className="text-sm text-cream/65 leading-relaxed">
              {moveWhy ?? intervention}
            </p>
            {(typeof moveEffort === "number" || typeof moveImpact === "number") && (
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em]">
                {typeof moveEffort === "number" && <EffortDots value={moveEffort} />}
                {typeof moveImpact === "number" && <ImpactDots value={moveImpact} />}
              </div>
            )}
          </div>
        </>
      )}
    </article>
  );
}
