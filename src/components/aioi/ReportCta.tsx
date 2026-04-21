import { ArrowRight, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_URL, ctaForTier } from "@/lib/booking";
import type { Tier } from "./TierBadge";

interface Props {
  tier: Tier;
  /** Optional: when provided, shows "Email me the report" secondary action. */
  onEmailReport?: () => void;
}

/**
 * Tier-aware in-report sales CTA. Sits between the hotspots summary and the
 * 90-day roadmap. Routes to the single Google Calendar booking link.
 *
 * Build brief §5.1.2 + §4.
 */
export function ReportCta({ tier, onEmailReport }: Props) {
  const cta = ctaForTier(tier);

  return (
    <section className="container max-w-6xl py-12 sm:py-16">
      <div className="rounded-lg border border-brass/30 bg-gradient-to-br from-surface-1/80 via-surface-1/40 to-surface-0/80 p-8 sm:p-12">
        <div className="flex items-center gap-3 mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85">
            The pattern at {tier}
          </p>
          <span aria-hidden className="h-px flex-1 bg-brass/20 max-w-[120px]" />
        </div>

        {/* Tier-aware diagnosis — the prescriptive read on this tier band. */}
        <p className="font-display text-2xl sm:text-3xl text-cream leading-snug text-balance max-w-3xl">
          {cta.diagnosis}
        </p>

        {/* Typical first intervention — pairs with the diagnosis. */}
        <p className="mt-5 font-display text-lg sm:text-xl text-cream/70 leading-snug max-w-3xl">
          {cta.firstFix}
        </p>

        <div className="mt-10 pt-8 border-t border-cream/10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 mb-4">
            Recommended next step
          </p>
          <p className="font-display text-xl sm:text-2xl text-cream leading-snug max-w-2xl">
            {cta.recommendation.replace(/\.$/, "")}
            <span className="text-brass-bright">.</span>
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
            Engagement: <span className="text-cream/70">{cta.service}</span>
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              asChild
              size="lg"
              className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] h-12 px-7"
            >
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4 mr-1" />
                {cta.ctaLabel}
                <ArrowRight className="h-4 w-4 ml-1" />
              </a>
            </Button>

            {onEmailReport && (
              <button
                type="button"
                onClick={onEmailReport}
                className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-cream/65 hover:text-cream transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                Email me the report
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
