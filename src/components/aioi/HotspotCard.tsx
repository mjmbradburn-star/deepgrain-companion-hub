import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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
  /**
   * The selection-engine Move ID for this pillar. When set, the card becomes
   * a navigable Link to the corresponding Move on the Plan tab
   * (`?tab=plan#move-<moveId>`). Sourced from `move_ids` / `recommendations.moves`.
   */
  moveId?: string | null;
  /** Required when `moveId` is set: the report slug used to build the URL. */
  reportSlug?: string;
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
  moveId,
  reportSlug,
  className,
}: HotspotCardProps) {
  const linkable = !!moveId && !!reportSlug;
  // Anchor format: stable contract — MoveCard renders <article id="move-<id>"/>.
  const href = linkable
    ? `/assess/r/${reportSlug}?tab=plan#move-${moveId}`
    : undefined;

  const body = (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <PillarChip index={pillar} label={pillarLabel} />
        <TierBadge tier={tier} />
      </div>
      <p className="font-display text-2xl text-cream leading-snug text-balance">{diagnosis}</p>

      {(moveTitle || moveWhy || intervention) && (
        <>
          <div className="my-4 hairline h-px" />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow text-brass-bright/85">Move</p>
              {linkable && (
                <span
                  aria-hidden
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45 transition-colors group-hover:text-brass-bright"
                >
                  View move <ArrowUpRight className="h-3 w-3" />
                </span>
              )}
            </div>
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
    </>
  );

  const baseClasses = cn(
    "group block rounded-lg border border-cream/10 bg-surface-1/70 backdrop-blur-sm p-6",
    "motion-lift motion-tap hover:border-brass/40",
    linkable && "focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/60",
    className,
  );

  if (linkable && href) {
    return (
      <Link
        to={href}
        data-testid="hotspot-card"
        data-move-id={moveId}
        aria-label={`View move for ${pillarLabel}: ${moveTitle ?? "details"}`}
        className={baseClasses}
      >
        {body}
      </Link>
    );
  }

  return (
    <article data-testid="hotspot-card" className={baseClasses}>
      {body}
    </article>
  );
}
