import { Link } from "react-router-dom";
import { ArrowRight, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Deep-dive unlock card.
 *
 * Two visual styles:
 *  - "card"    → standalone block placed at the end of the Overview tab.
 *  - "overlay" → blurred-content cover for the locked Plan tab.
 *
 * Both share the same payoff list so the user sees *exactly* what changes
 * after answering 8 more questions: more confident score, full 90-day plan,
 * pillar-level diagnoses, peer benchmarking precision.
 */

interface Unlock {
  title: string;
  detail: string;
  confidence?: { from: number; to: number };
}

const UNLOCKS: Unlock[] = [
  {
    title: "Sharper score",
    detail: "8 questions per pillar instead of 1. Confidence band tightens from ±9 to ±3.",
    confidence: { from: 32, to: 92 },
  },
  {
    title: "Full 90-day plan",
    detail: "Three sequenced months with named outcomes, effort/impact, and time-to-value.",
  },
  {
    title: "Per-pillar diagnoses",
    detail: "A written read on each of the eight pillars — not just the top three hotspots.",
  },
  {
    title: "Tighter benchmark match",
    detail: "Cohort delta refines down to your sector and size band, not just your level.",
  },
];

interface Props {
  slug: string;
  variant?: "card" | "overlay";
}

export function DeepDiveUnlock({ slug, variant = "card" }: Props) {
  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 bg-walnut/85 backdrop-blur-md" aria-hidden />
        <div className="relative w-full max-w-2xl">
          <UnlockBody slug={slug} compact />
        </div>
      </div>
    );
  }

  return (
    <section className="container max-w-6xl pb-20">
      <div className="rounded-lg border border-brass/30 bg-gradient-to-br from-surface-1/80 via-surface-1/40 to-surface-0/80 p-8 sm:p-12">
        <UnlockBody slug={slug} />
      </div>
    </section>
  );
}

function UnlockBody({ slug, compact = false }: { slug: string; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-brass/40 bg-brass/10 text-brass-bright">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85">
          Answer 8 more · ~3 minutes
        </p>
      </div>

      <h2
        className={`font-display text-cream leading-[1.05] tracking-tight text-balance ${
          compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
        }`}
      >
        Unlock the parts of the report that are still <span className="italic text-brass-bright">blurred out.</span>
      </h2>

      <p className={`mt-5 font-display text-cream/65 max-w-2xl ${compact ? "text-base" : "text-lg"}`}>
        You answered one question per pillar. Eight more — one per pillar — sharpens the score, opens the
        full 90-day plan, and writes a diagnosis for each pillar instead of just the three hotspots.
      </p>

      <ul className={`mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 ${compact ? "" : "lg:grid-cols-2"}`}>
        {UNLOCKS.map((u) => (
          <li key={u.title} className="flex gap-3 items-start">
            <span
              className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brass-bright shrink-0"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-display text-base text-cream leading-snug">{u.title}</p>
              <p className="mt-1 text-sm text-cream/60 leading-snug">{u.detail}</p>
              {u.confidence && <ConfidenceBar from={u.confidence.from} to={u.confidence.to} />}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button
          asChild
          size="lg"
          className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] h-12 px-7"
        >
          <Link to={`/assess/deep/${slug}`}>
            Answer the 8 more <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 inline-flex items-center gap-2">
          <Lock className="h-3 w-3" /> No new login · resumes this same report
        </p>
      </div>
    </div>
  );
}

/**
 * Tiny before/after bar showing how the confidence band tightens. Pure
 * presentation — driven by the from/to props, no live calculation.
 */
function ConfidenceBar({ from, to }: { from: number; to: number }) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cream/40 w-9 shrink-0">Now</span>
        <div className="relative h-1 flex-1 rounded-full bg-cream/8 overflow-hidden">
          <span className="absolute inset-y-0 left-0 bg-cream/40" style={{ width: `${from}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-brass-bright/85 w-9 shrink-0">After</span>
        <div className="relative h-1 flex-1 rounded-full bg-cream/8 overflow-hidden">
          <span className="absolute inset-y-0 left-0 bg-brass-bright" style={{ width: `${to}%` }} />
        </div>
      </div>
    </div>
  );
}
