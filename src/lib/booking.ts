// Single canonical booking link — do not add Calendly/Cal.com.
// Per AIOI build brief §4.
export const BOOKING_URL = "https://calendar.app.google/4e84XvXBJAeE8dnM7";

import type { Tier } from "@/components/aioi/TierBadge";

export interface TierCta {
  /**
   * Tier-aware diagnosis — one sentence on the typical pattern at this tier.
   * Prescriptive, not neutral. Source: Manifesto + Maturity Ladder (Notion).
   */
  diagnosis: string;
  /**
   * Typical first intervention for this tier — one sentence.
   * Pairs with the diagnosis to form the §5.1.3 read.
   */
  firstFix: string;
  /** Suggested next step — single sentence diagnosis-to-recommendation. */
  recommendation: string;
  /** Service name from the four canonical Deepgrain / People X AI services. */
  service: string;
  /** Primary CTA copy. */
  ctaLabel: string;
}

/**
 * Tier-band → diagnosis + service routing per build brief §4 and §5.1.3.
 * Same booking URL everywhere; copy varies by tier band.
 */
export function ctaForTier(tier: Tier): TierCta {
  switch (tier) {
    case "Dormant":
      return {
        diagnosis:
          "AI is talked about but not owned. There is no mandate, no budget line, and no one whose job it is to make this real.",
        firstFix:
          "The first move is naming an owner and shipping one workflow end-to-end — not a strategy deck.",
        recommendation:
          "Start with an AI Enablement Sprint to get the first workflow into production.",
        service: "AI Enablement Sprint",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Exploring":
      return {
        diagnosis:
          "A handful of people are using ChatGPT in browser tabs, and a pilot or two has been demoed. Nothing is yet wired into how the work actually gets done.",
        firstFix:
          "Pick the function with the most operating debt and rebuild one workflow around the model — that's the unlock from pilots to production.",
        recommendation:
          "Start with an AI Enablement Sprint to get the first workflow into production.",
        service: "AI Enablement Sprint",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Deployed":
      return {
        diagnosis:
          "Tools are paid for and used day-to-day, but each function is on its own. There is no shared evals layer, no observability, and the gains are anecdotal.",
        firstFix:
          "Industrialise one workflow with proper evals and a handover, and it becomes the template for the next four.",
        recommendation:
          "Run an AI Build Sprint on your highest-debt function.",
        service: "AI Build Sprint",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Integrated":
      return {
        diagnosis:
          "AI is in the operating model and people would notice if it disappeared. The next ceiling is governance, evals at scale, and avoiding silent regressions.",
        firstFix:
          "Stand up an evals and governance spine before the next wave of agents — otherwise quality will drift in ways no dashboard catches.",
        recommendation:
          "Bring in a Fractional AI Partner for governance, evals, and org redesign.",
        service: "Fractional AI Partner",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "Leveraged":
      return {
        diagnosis:
          "AI is producing measurable leverage across functions and the org chart is starting to bend around it. The risk now is fragmentation: parallel stacks, duplicated evals, opinionated agents that can't talk to each other.",
        firstFix:
          "Consolidate the platform layer and re-cut a few functions around the model rather than alongside it.",
        recommendation:
          "Bring in a Fractional AI Partner for governance, evals, and org redesign.",
        service: "Fractional AI Partner",
        ctaLabel: "Book a 30-min AIOI teardown",
      };
    case "AI-Native":
      return {
        diagnosis:
          "The org is built around the model. The interesting questions now are about second-order effects, talent shape, and where the human edge actually sits.",
        firstFix:
          "Most useful next step is peer conversation and benchmark partnership rather than another engagement.",
        recommendation:
          "Compare notes — peer conversation and benchmark partnership.",
        service: "Peer / benchmark partnership",
        ctaLabel: "Compare notes with Matt",
      };
  }
}
