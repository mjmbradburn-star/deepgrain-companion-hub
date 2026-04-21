import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { PillarChip, type PillarIndex } from "@/components/aioi/PillarChip";
import { TierBadge, type Tier } from "@/components/aioi/TierBadge";

interface PillarEntry {
  index: PillarIndex;
  name: string;
  oneLiner: string;
  question: string;
  body: string;
  weight: number;
  signal: string;
  obstacle: string;
  bookends: { dormant: string; native: string };
}

const PILLARS: PillarEntry[] = [
  {
    index: 1,
    name: "Strategy & Mandate",
    oneLiner: "Someone has been asked to own this.",
    question: "If a colleague asked who owns AI here, would three people give the same name?",
    body: "Strategy without a named owner tends to drift. This pillar looks at whether the function has a single accountable lead, a written remit, a budget line, and a habit of shipping something each quarter. Steering committees that meet monthly without a named owner usually count as no owner.",
    weight: 14,
    signal: "A named lead with a remit, a budget and a calendar.",
    obstacle: "Treating AI as everyone's job, which tends to make it no one's.",
    bookends: {
      dormant: "Nobody. It hasn't really come up.",
      native: "It's the function head's first agenda item, every week.",
    },
  },
  {
    index: 2,
    name: "Data Foundations",
    oneLiner: "What a model would find if it tried to read your work.",
    question: "Could a tool answer 'what are our top five accounts by revenue' tonight, without a person?",
    body: "Models inherit your data debt. Versioned, documented, queryable data is the difference between a tool that helps and one that confidently makes things up. Most functions are further from this than they think, and that's normal.",
    weight: 14,
    signal: "A documented schema engineering trusts and a tool could query.",
    obstacle: "Assuming the CRM is enough because it has fields in it.",
    bookends: {
      dormant: "PDFs, inboxes and Slack threads.",
      native: "Versioned, governed, queryable by a tool today.",
    },
  },
  {
    index: 3,
    name: "Tooling & Infrastructure",
    oneLiner: "What's actually in use, not what's been bought.",
    question: "Where is the line between 'we have a Copilot licence' and 'we use Copilot'?",
    body: "Procurement is not adoption. This pillar separates shelfware from the things people open every day: an approved stack with sensible data controls, internal copilots wired to real work, and where it makes sense, a few bespoke tools with monitoring and a fallback.",
    weight: 12,
    signal: "An approved stack plus internal copilots wired to live workflows.",
    obstacle: "A pile of trial accounts and one well-loved ChatGPT Team plan.",
    bookends: {
      dormant: "None.",
      native: "Bespoke tools in production, monitored, with fallbacks.",
    },
  },
  {
    index: 4,
    name: "Workflow Integration",
    oneLiner: "Where AI sits in the day, beyond the demo.",
    question: "Is AI a tab people open, or the surface they work on?",
    body: "The value tends to live in the workflow, not the tool. Functions that move forward go from 'AI on the side' to a few playbooked workflows, then to designing the work model-first, with people stepping in for the exceptions.",
    weight: 14,
    signal: "Two or three named workflows where AI is the default first pass.",
    obstacle: "Pilots that never become how the work actually gets done.",
    bookends: {
      dormant: "Nowhere. A separate tab, opened occasionally.",
      native: "Workflows are designed model-first; people handle exceptions.",
    },
  },
  {
    index: 5,
    name: "Skills & Fluency",
    oneLiner: "How fluent the average person is, not the keenest.",
    question: "If your top three users went on holiday next week, what would be left?",
    body: "Fluency is a population number, not a leaderboard. The interesting score is the median: can the average person iterate on a prompt, build something they reuse next week, ship a small tool to a colleague? That's where the compounding starts.",
    weight: 12,
    signal: "The median person uses AI daily and builds things they reuse.",
    obstacle: "Two enthusiasts doing all the work while the rest watch.",
    bookends: {
      dormant: "Hasn't really tried it.",
      native: "Builds small tools and shares them with colleagues.",
    },
  },
  {
    index: 6,
    name: "Governance & Risk",
    oneLiner: "What stops something silly happening in your name.",
    question: "If a customer's data ended up in a public model tomorrow, who finds out, and how?",
    body: "Governance tends to be the unloved pillar that decides whether you scale. It runs from 'we hope for the best' to a written policy nobody reads, to live monitoring, an audit trail, and a model risk register the board has actually seen.",
    weight: 12,
    signal: "Policy, tooling, audit trails and periodic reviews. Not a PDF.",
    obstacle: "An informal 'don't paste customer data' rule and crossed fingers.",
    bookends: {
      dormant: "None. We hope for the best.",
      native: "Live monitoring, model risk register, board-level oversight.",
    },
  },
  {
    index: 7,
    name: "Measurement & ROI",
    oneLiner: "Whether you can put a number next to the work.",
    question: "If finance asked what AI returned last quarter, what would you put on a slide?",
    body: "Anecdotes are the lowest tier of evidence. Higher tiers track hours saved, then quality and cycle time, then revenue or margin you can attribute. If you can't measure it, you can't defend the budget, and you can't grow it.",
    weight: 12,
    signal: "Hours, quality and cycle time, reported quarterly to the function head.",
    obstacle: "'It saves me about an hour a week' as the entire story.",
    bookends: {
      dormant: "We haven't tried to measure.",
      native: "AI-attributable revenue or margin in the P&L.",
    },
  },
  {
    index: 8,
    name: "Culture & Adoption",
    oneLiner: "How people talk about it when no one is watching.",
    question: "Is using AI for a task the thing that needs explaining, or not using it?",
    body: "Culture is the leading indicator. It runs from silence (people hide it like cheating) through curiosity, through teaching each other in the open, to a quiet default of 'have you tried it with the model?' where not using it is the choice that needs a reason.",
    weight: 10,
    signal: "Stronger users teaching the rest in the open, with leadership air cover.",
    obstacle: "Quiet usage because people worry it looks like shortcutting.",
    bookends: {
      dormant: "They don't.",
      native: "Not using it is the thing that needs explaining.",
    },
  },
];

const TIER_LABEL_BY_INDEX: Tier[] = ["Dormant", "Reactive", "Exploratory", "Operational", "Integrated", "AI-Native"];

export default function Pillars() {
  const totalWeight = PILLARS.reduce((s, p) => s + p.weight, 0);

  return (
    <div className="min-h-screen bg-walnut text-cream">
      <SiteNav />

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 sm:pt-40 sm:pb-24 lg:pt-48 lg:pb-32 border-b border-cream/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--brass)/0.08),_transparent_60%)]" aria-hidden />
        <div className="container relative max-w-5xl">
          <p className="eyebrow mb-6">The Eight Pillars</p>
          <h1 className="font-display font-light text-[clamp(2.25rem,8vw,6.5rem)] leading-[0.92] tracking-[-0.03em] text-cream max-w-[14ch] text-balance">
            Eight axes.<br />
            <span className="italic font-normal text-brass-bright">One operating picture.</span>
          </h1>
          <p className="mt-6 sm:mt-8 max-w-2xl font-display text-lg sm:text-xl lg:text-2xl text-cream/70 leading-snug">
            The AIOI doesn't ask whether you "use AI". It asks eight questions about how you operate, across strategy, data, tooling, workflow, skills, governance, measurement and culture, and scores each one on the same six-tier ladder.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/assess"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase transition-colors w-full sm:w-auto justify-center"
            >
              Begin assessment <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/ladder" className="font-ui text-sm text-cream/60 hover:text-cream underline-offset-4 hover:underline">
              See the maturity ladder
            </a>
          </div>
        </div>
      </section>

      {/* ─── Index strip ─────────────────────────────────────────── */}
      <section className="border-b border-cream/10 bg-surface-0">
        <div className="container py-8">
          <p className="eyebrow mb-4 text-cream/45">Index</p>
          <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-3">
            {PILLARS.map((p) => (
              <li key={p.index}>
                <a
                  href={`#p${p.index}`}
                  className="group flex items-baseline gap-2 font-display text-cream/70 hover:text-cream transition-colors"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright/70 group-hover:text-brass-bright">
                    P{p.index}
                  </span>
                  <span className="text-sm leading-tight">{p.name}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Pillar entries ──────────────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-24">
        <div className="container max-w-6xl space-y-16 sm:space-y-24">
          {PILLARS.map((p, i) => (
            <article
              key={p.index}
              id={`p${p.index}`}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 scroll-mt-24"
            >
              {/* Left rail — pillar number, chip, weight */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-24 space-y-5 sm:space-y-6">
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <span className="font-display text-5xl sm:text-7xl leading-none text-brass-bright/30 tabular-nums">
                      {String(p.index).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
                      Pillar {p.index} of 8
                    </span>
                  </div>
                  <PillarChip index={p.index} label={p.name} number={false} />
                  <div className="pt-4 border-t border-cream/10 space-y-3">
                    <Stat label="Weight in AIOI" value={`${p.weight}%`} />
                    <Stat label="Tiers" value="Dormant to AI-Native" />
                  </div>
                </div>
              </aside>

              {/* Right column — copy */}
              <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
                  {p.name}
                </h2>
                <p className="font-display italic text-xl sm:text-2xl text-brass-bright/85 leading-snug">
                  {p.oneLiner}
                </p>
                <p className="font-display text-lg sm:text-xl text-cream/75 leading-relaxed max-w-2xl">
                  {p.body}
                </p>

                <div className="rounded-md border border-cream/10 bg-surface-1/50 p-5 sm:p-6 max-w-2xl">
                  <p className="eyebrow mb-2 text-cream/45">A peer might ask</p>
                  <p className="font-display text-lg sm:text-xl text-cream leading-snug">"{p.question}"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl">
                  <SignalCard kind="signal" body={p.signal} />
                  <SignalCard kind="obstacle" body={p.obstacle} />
                </div>

                {/* Bookends */}
                <div className="pt-4 sm:pt-6">
                  <p className="eyebrow mb-4 text-cream/45">From / To</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <Bookend tier="Dormant" line={p.bookends.dormant} />
                    <Bookend tier="AI-Native" line={p.bookends.native} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Weight composition footnote ─────────────────────────── */}
      <section className="border-t border-cream/10 bg-surface-0">
        <div className="container max-w-4xl py-12 sm:py-16">
          <p className="eyebrow mb-5 text-cream/45">A note on weighting</p>
          <p className="font-display text-lg sm:text-xl text-cream/75 leading-relaxed">
            The pillars aren't weighted equally. Strategy, Data and Workflow each carry {PILLARS[0].weight}%, because they sit upstream of nearly everything else.
            Tooling, Skills, Governance and Measurement carry {PILLARS[2].weight}%. Culture sits at {PILLARS[7].weight}%, small in the score, decisive in practice.
            The total is {totalWeight}%. The exact weights move with the version of the index.
          </p>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-cream/10">
        <div className="container max-w-4xl py-16 sm:py-24 text-center">
          <p className="eyebrow mb-5">Now, the diagnostic</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-tight tracking-tight">
            Twelve questions.<br />
            <span className="italic text-brass-bright">A score you can argue with.</span>
          </h2>
          <a
            href="/assess"
            className="mt-8 sm:mt-10 inline-flex items-center gap-2 h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase transition-colors"
          >
            Begin assessment <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">{label}</span>
      <span className="font-display text-cream/85 tabular-nums">{value}</span>
    </div>
  );
}

function SignalCard({ kind, body }: { kind: "signal" | "obstacle"; body: string }) {
  const isSignal = kind === "signal";
  return (
    <div
      className={`rounded-sm border p-5 ${
        isSignal ? "border-brass/30 bg-brass/5" : "border-pillar-7/30 bg-pillar-7/5"
      }`}
    >
      <p
        className={`eyebrow mb-2 ${isSignal ? "text-brass-bright/80" : "text-pillar-7/80"}`}
      >
        {isSignal ? "What good looks like" : "What usually gets in the way"}
      </p>
      <p className="font-display text-lg text-cream/85 leading-snug">{body}</p>
    </div>
  );
}

function Bookend({ tier, line }: { tier: Tier; line: string }) {
  return (
    <div className="rounded-sm border border-cream/10 bg-surface-1/40 p-4">
      <TierBadge tier={tier} showIndex={false} className="mb-3" />
      <p className="font-display italic text-cream/75 leading-snug">"{line}"</p>
    </div>
  );
}
