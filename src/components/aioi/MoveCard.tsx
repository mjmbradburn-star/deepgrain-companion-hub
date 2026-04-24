import { cn } from "@/lib/utils";
import { ArrowUpRight, Pin } from "lucide-react";
import { PillarChip, type PillarIndex } from "./PillarChip";
import { Button } from "@/components/ui/button";
import { PILLAR_NAMES } from "@/lib/assessment";

/**
 * Snapshot stored on `reports.recommendations.moves[*].snapshot` by the
 * `recommend-report` voice wrapper. Renders the canonical Move copy.
 */
export interface MoveSnapshot {
  title: string;
  pillar: number;
  tier_band: string;
  lens: string;
  function: string | null;
  why_matters: string | null;
  what_to_do: string | null;
  how_to_know: string | null;
  effort: number | null;
  impact: number | null;
  tags: string[] | null;
  cta_type: string | null;
  cta_url: string | null;
}

export interface RecommendationMove {
  move_id: string;
  personalised_why_matters: string;
  personalised_what_to_do_intro?: string;
  role?: "forced_rank";
  snapshot: MoveSnapshot;
}

interface MoveCardProps {
  move: RecommendationMove;
  index: number;
  className?: string;
}

const TIER_BAND_LABEL: Record<string, string> = {
  low: "Foundation",
  mid: "Build",
  high: "Sharpen",
};

export function MoveCard({ move, index, className }: MoveCardProps) {
  const { snapshot, personalised_why_matters, personalised_what_to_do_intro, role } = move;
  const pillarIndex = (snapshot.pillar as PillarIndex);
  const pillarLabel = PILLAR_NAMES[pillarIndex] ?? `Pillar ${snapshot.pillar}`;
  const isForcedRank = role === "forced_rank";

  return (
    <article
      id={`move-${move.move_id}`}
      data-move-id={move.move_id}
      className={cn(
        "group relative scroll-mt-32 rounded-lg border border-cream/10 bg-surface-1/55 backdrop-blur-sm",
        "p-6 sm:p-8 motion-lift hover:border-brass/40 transition-colors",
        "target:ring-2 target:ring-brass/60 target:border-brass/60",
        isForcedRank && "border-brass/45 bg-surface-1/75 ring-1 ring-brass/20",
        className,
      )}
    >
      {/* Number + forced-rank badge */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-brass-bright/40 tabular-nums leading-none">
            {String(index + 1).padStart(2, "0")}
          </span>
          <PillarChip index={pillarIndex} label={pillarLabel} />
        </div>
        {isForcedRank && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-brass/45 bg-brass/15 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-brass-bright">
            <Pin className="h-3 w-3" /> Pinned move
          </span>
        )}
      </div>

      <h3 className="font-display text-2xl sm:text-[26px] text-cream leading-snug tracking-tight text-balance">
        {snapshot.title}
      </h3>

      {/* Why this matters for you (personalised) */}
      <section className="mt-5">
        <p className="eyebrow text-brass-bright/85 mb-2">Why this matters for you</p>
        <p className="text-sm sm:text-[15px] text-cream/80 leading-relaxed">
          {personalised_why_matters || snapshot.why_matters}
        </p>
      </section>

      {/* What to do */}
      {snapshot.what_to_do && (
        <section className="mt-5">
          <p className="eyebrow text-cream/45 mb-2">What to do</p>
          {personalised_what_to_do_intro && (
            <p className="text-sm text-cream/75 leading-relaxed mb-2 italic">
              {personalised_what_to_do_intro}
            </p>
          )}
          <p className="text-sm text-cream/70 leading-relaxed whitespace-pre-line">
            {snapshot.what_to_do}
          </p>
        </section>
      )}

      {/* How you'll know */}
      {snapshot.how_to_know && (
        <section className="mt-5">
          <p className="eyebrow text-cream/45 mb-2">How you'll know it worked</p>
          <p className="text-sm text-cream/70 leading-relaxed">{snapshot.how_to_know}</p>
        </section>
      )}

      {/* Footer meta */}
      <footer className="mt-6 pt-5 border-t border-cream/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
          {typeof snapshot.effort === "number" && (
            <EffortDots value={snapshot.effort} />
          )}
          {typeof snapshot.impact === "number" && (
            <ImpactDots value={snapshot.impact} />
          )}
          {snapshot.tier_band && (
            <span>{TIER_BAND_LABEL[snapshot.tier_band] ?? snapshot.tier_band}</span>
          )}
          {snapshot.tags && snapshot.tags.length > 0 && (
            <span className="text-cream/35">{snapshot.tags.slice(0, 2).join(" · ")}</span>
          )}
        </div>

        {snapshot.cta_url && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-brass/40 bg-transparent text-brass-bright hover:bg-brass/10 font-ui text-[11px] uppercase tracking-[0.16em] h-8"
          >
            <a href={snapshot.cta_url} target="_blank" rel="noreferrer">
              {ctaLabel(snapshot.cta_type)} <ArrowUpRight className="h-3 w-3 ml-1.5" />
            </a>
          </Button>
        )}
      </footer>
    </article>
  );
}

function ctaLabel(type: string | null): string {
  switch (type) {
    case "book": return "Book a call";
    case "doc": return "Open guide";
    case "tool": return "Open tool";
    case "external": return "Read more";
    default: return "Open";
  }
}

export function EffortDots({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(4, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-2" title={`Effort ${safe}/4`}>
      <span className="text-cream/40">Effort</span>
      <span className="inline-flex items-center gap-1" aria-label={`Effort ${safe} of 4`}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              i <= safe ? "bg-brass-bright" : "bg-cream/20",
            )}
          />
        ))}
      </span>
    </span>
  );
}

export function ImpactDots({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(4, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-2" title={`Impact ${safe}/4`}>
      <span className="text-cream/40">Impact</span>
      <span className="inline-flex items-center gap-1" aria-label={`Impact ${safe} of 4`}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-sm",
              i <= safe ? "bg-brass-bright" : "bg-cream/20",
            )}
          />
        ))}
      </span>
    </span>
  );
}
