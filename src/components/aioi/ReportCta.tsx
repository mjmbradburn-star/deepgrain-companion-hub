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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85 mb-5">
          What to do next
        </p>

        <h2 className="font-display text-3xl sm:text-4xl text-cream leading-[1.05] tracking-tight text-balance max-w-3xl">
          {cta.recommendation.split(".")[0]}
          <span className="text-brass-bright">.</span>
        </h2>

        <p className="mt-5 font-display text-lg text-cream/65 max-w-2xl">
          Recommended engagement at <span className="italic">{tier}</span>:{" "}
          <span className="text-cream">{cta.service}</span>. A 30-minute
          teardown with Matt walks through your hotspots and the smallest first
          intervention for your stage.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
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
    </section>
  );
}
