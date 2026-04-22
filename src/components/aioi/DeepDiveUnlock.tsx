import { Link } from "react-router-dom";
import { ArrowRight, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeepDiveEmailGate } from "@/components/aioi/DeepDiveEmailGate";

/**
 * Deep-dive unlock card.
 *
 * Two visual styles:
 *  - "card"    → standalone block placed at the end of the Overview tab.
 *  - "overlay" → blurred-content cover for the locked Plan tab.
 *
 * Both share the same payoff list so the user sees *exactly* what changes
 * after completing the remaining Deep Dive questions: more confident score,
 * full 90-day plan, pillar-level diagnoses, peer benchmarking precision.
 */

interface Unlock {
  title: string;
  detail: string;
  confidence?: { from: number; to: number };
}

const UNLOCKS: Unlock[] = [
  {
    title: "Sharper score",
    detail: "The Deep Dive extends the scan without repeating what you already answered.",
    confidence: { from: 32, to: 92 },
  },
  {
    title: "Full 90-day plan",
    detail: "Three sequenced months with named outcomes, effort/impact, and time-to-value.",
  },
  {
    title: "Per-pillar diagnoses",
    detail: "A written read on each of the eight pillars, not just the top three hotspots.",
  },
  {
    title: "Tighter benchmark match",
    detail: "Cohort delta refines down to your sector and size band, not just your level.",
  },
];

const UNLOCKS_BY_LEVEL: Record<string, Unlock[]> = {
  individual: [
    { title: "Personal operating profile", detail: "A sharper read on the habits, tools, and routines that compound your AI output.", confidence: { from: 32, to: 92 } },
    { title: "Next-Monday habit", detail: "One concrete change to test in your actual weekly workflow." },
    { title: "Priority skills", detail: "The fluency gap most likely to unlock better results without adding more tools." },
    { title: "Peer context", detail: "How your personal stack compares with other operators at the same assessment level." },
  ],
  function: [
    { title: "Team operating roadmap", detail: "A practical sequence for moving AI from pockets of usage into repeatable team workflows.", confidence: { from: 32, to: 92 } },
    { title: "Workflow redesign targets", detail: "Which handoffs, routines, or data gaps should be rebuilt first." },
    { title: "Per-pillar diagnoses", detail: "A written read on each of the eight pillars, not just the top three hotspots." },
    { title: "Tighter benchmark match", detail: "Cohort delta refines down to your function, sector, region, and size when enough data exists." },
  ],
  company: [
    { title: "Board-ready operating plan", detail: "A concise executive read on where AI debt is accumulating and what to do next.", confidence: { from: 32, to: 92 } },
    { title: "Full 90-day roadmap", detail: "Three sequenced months with named outcomes, effort/impact, and time-to-value." },
    { title: "Cross-pillar diagnosis", detail: "Where mandate, data, workflow, governance, and measurement are limiting each other." },
    { title: "Benchmark confidence", detail: "Clear cohort quality labels so the comparison is useful without overclaiming precision." },
  ],
};

interface Props {
  slug: string;
  level?: "company" | "function" | "individual" | string;
  variant?: "card" | "overlay";
  isAnonymous?: boolean;
}

const PAYOFF_BY_LEVEL: Record<string, { eyebrow: string; headline: string; detail: string }> = {
  company: {
    eyebrow: "Deep Dive · completes this report",
    headline: "Unlock your full company report — board-ready roadmap, no repeated questions.",
    detail: "You'll see your company heatmap, a sequenced 90-day roadmap, and a board-ready one-pager.",
  },
  function: {
    eyebrow: "Deep Dive · completes this report",
    headline: "Unlock your full function report — team operating roadmap, no repeated questions.",
    detail: "You'll see your function heatmap, team operating roadmap, and a board-ready one-pager.",
  },
  individual: {
    eyebrow: "Deep Dive · completes this report",
    headline: "Unlock your full personal profile — improvement plan, no repeated questions.",
    detail: "You'll see your personal operating profile, priority habits, and a focused improvement plan.",
  },
};

const DEPTH_COPY: Record<string, string> = {
  company: "Complete the full company Deep Dive.",
  function: "Answer the remaining function Deep Dive questions.",
  individual: "Answer 1 additional question to refine your personal report.",
};

export function DeepDiveUnlock({ slug, level = "function", variant = "card", isAnonymous = false }: Props) {
  const copy = PAYOFF_BY_LEVEL[level] ?? PAYOFF_BY_LEVEL.function;
  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 bg-walnut/85 backdrop-blur-md" aria-hidden />
        <div className="relative w-full max-w-2xl">
          <UnlockBody slug={slug} level={level} copy={copy} compact isAnonymous={isAnonymous} />
        </div>
      </div>
    );
  }

  return (
    <section className="container max-w-6xl pb-20">
      <div className="rounded-lg border border-brass/30 bg-gradient-to-br from-surface-1/80 via-surface-1/40 to-surface-0/80 p-8 sm:p-12">
        <UnlockBody slug={slug} level={level} copy={copy} isAnonymous={isAnonymous} />
      </div>
    </section>
  );
}

function UnlockBody({ slug, level, copy, compact = false, isAnonymous = false }: { slug: string; level: string; copy: { eyebrow: string; headline: string; detail: string }; compact?: boolean; isAnonymous?: boolean }) {
  const unlocks = UNLOCKS_BY_LEVEL[level] ?? UNLOCKS;
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-brass/40 bg-brass/10 text-brass-bright">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85">
          {copy.eyebrow}
        </p>
      </div>

      <h2
        className={`font-display text-cream leading-[1.05] tracking-tight text-balance ${
          compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
        }`}
      >
        {copy.headline}
      </h2>

      <p className={`mt-5 font-display text-cream/65 max-w-2xl ${compact ? "text-base" : "text-lg"}`}>
        {copy.detail}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright/75">
        {DEPTH_COPY[level] ?? DEPTH_COPY.function}
      </p>

      <ul className={`mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 ${compact ? "" : "lg:grid-cols-2"}`}>
        {unlocks.map((u) => (
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

      {isAnonymous ? (
        <DeepDiveEmailGate slug={slug} level={level} compact={compact} />
      ) : (
        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button
            asChild
            size="lg"
            className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] h-12 px-7"
          >
            <Link to={`/assess/deep/${slug}`}>
              Continue Deep Dive <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40 inline-flex items-center gap-2">
            <Lock className="h-3 w-3" /> No new login · resumes this same report
          </p>
        </div>
      )}
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
