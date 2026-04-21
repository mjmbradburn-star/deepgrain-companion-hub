// Single canonical booking link — do not add Calendly/Cal.com.
// Per AIOI build brief §4.
export const BOOKING_URL = "https://calendar.app.google/4e84XvXBJAeE8dnM7";

import type { Tier } from "@/components/aioi/TierBadge";

export interface TierCta {
  /** Suggested next step — single sentence diagnosis-to-recommendation. */
  recommendation: string;
  /** Service name from the four canonical Deepgrain / People X AI services. */
  service: string;
  /** Primary CTA copy. */
  ctaLabel: string;
}

/**
 * Tier-band → service routing per build brief §4.
 * Same booking URL everywhere; copy varies by tier band.
 */
export function ctaForTier(tier: Tier): TierCta {
  switch (tier) {
    case "Dormant":
    case "Exploring":
      return {
        recommendation:
          "Start with an AI Enablement Sprint to get the first workflow into production.",
        service: "AI Enablement Sprint",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Deployed":
      return {
        recommendation:
          "Run an AI Build Sprint on your highest-debt function.",
        service: "AI Build Sprint",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Integrated":
    case "Leveraged":
      return {
        recommendation:
          "Bring in a Fractional AI Partner for governance, evals, and org redesign.",
        service: "Fractional AI Partner",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "AI-Native":
      return {
        recommendation:
          "Compare notes — peer conversation and benchmark partnership.",
        service: "Peer / benchmark partnership",
        ctaLabel: "Compare notes with Matt",
      };
  }
}
