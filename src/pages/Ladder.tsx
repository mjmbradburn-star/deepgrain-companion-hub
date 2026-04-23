import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { TierBadge, type Tier } from "@/components/aioi/TierBadge";
import { Reveal } from "@/components/aioi/Reveal";
import { Seo } from "@/components/aioi/Seo";
import { breadcrumbJsonLd, seoRoutes } from "@/lib/seo";

interface TierEntry {
  tier: Tier;
  index: number;
  scoreBand: string;
  tag: string;
  thesis: string;
  here: string[]; // "you're probably here if…"
  watch: string; // the next thing to watch for
  next: string; // to climb a rung
  populationPct: number;
}

const TIERS: TierEntry[] = [
  {
    tier: "Dormant",
    index: 0,
    scoreBand: "0 to 14",
    tag: "It hasn't really come up.",
    thesis:
      "AI exists in headlines and competitor anecdotes, not in anything that touches how the work actually happens. There's no owner, no budget, no policy, mostly because there's nothing to govern yet. That's a fine starting point.",
    here: [
      "If asked who owns AI here, you'd struggle to name one person.",
      "Conversations stay at the slide level, rarely the workflow level.",
      "If asked which AI tools you use, the honest answer is none.",
    ],
    watch: "Confusing 'we're cautious' with 'we're behind'. The first is a posture you can hold; the second is a position you have to climb out of.",
    next: "Pick one workflow. Find one person. Give them six weeks. That's it.",
    populationPct: 18,
  },
  {
    tier: "Exploring",
    index: 1,
    scoreBand: "15 to 32",
    tag: "Pilots and pet projects.",
    thesis:
      "A team or two — often marketing, sales ops or engineering — is running real experiments. There are wins. The wins belong to the people who care most, and depend on those people staying. None of it has reached the production work that pays the bills.",
    here: [
      "Three slides at the leadership offsite, two of which are demos.",
      "A monthly working group that's more interesting than useful.",
      "Excitement that hasn't yet shown up in a job description.",
    ],
    watch: "Pilot purgatory. Enough success to feel ahead, not enough to actually be ahead. When the believers leave, the work goes with them.",
    next: "Pick the pilot with the strongest evidence. Make it the default for that workflow. Write the playbook. Ship it.",
    populationPct: 32,
  },
  {
    tier: "Deployed",
    index: 2,
    scoreBand: "33 to 54",
    tag: "Now part of the work.",
    thesis:
      "Two or three named workflows run through AI on production data, with playbooks and a measurement habit. Adoption is uneven. Some teams are racing, some are watching. The function has crossed the line from experimenting to operating.",
    here: [
      "New joiners get an AI tooling section in their onboarding.",
      "Quarterly reviews include hours-saved or cycle-time numbers.",
      "Leadership talks about 'our AI stack', not 'AI'.",
    ],
    watch: "Plateau. The tooling stays the same, the world doesn't. Deployed becomes legacy faster than anyone expects.",
    next: "Move from 'AI in workflows' to 'workflows redesigned around AI'. Different verb, different work.",
    populationPct: 22,
  },
  {
    tier: "Integrated",
    index: 3,
    scoreBand: "55 to 74",
    tag: "The default first draft.",
    thesis:
      "AI is the assumed first draft for most production work, with humans on review. Skills are widespread. The level you measure is the median person, not the keenest. Governance, measurement and tooling all keep up with what people are doing.",
    here: [
      "Meetings about whether to use AI for something have stopped happening.",
      "The function publishes a quarterly AI scorecard and means it.",
      "Hiring criteria include AI fluency by default, not as a nice-to-have.",
    ],
    watch: "Believing the work is finished. Integrated is a great place; Leveraged is a different sport.",
    next: "Redesign the operating model around what models can do. Hire and structure for it. Stop bolting AI onto an org chart written before it existed.",
    populationPct: 18,
  },
  {
    tier: "Leveraged",
    index: 4,
    scoreBand: "75 to 89",
    tag: "Compounding leverage.",
    thesis:
      "AI isn't a tool the organisation reaches for, it's the leverage the organisation runs on. Whole functions are designed around model output. Cost and cycle-time advantages are visible in the P&L. The gap to peers is widening, not closing.",
    here: [
      "Headcount per unit of output is materially below the sector benchmark.",
      "New functions are designed model-first, not retrofitted.",
      "AI-attributable margin shows up in board reporting.",
    ],
    watch: "Brittleness at the edges. The further you push, the further you have to fall when a foundation model changes underneath you.",
    next: "Operate as if you were AI-Native. Hire and structure as if the next model release lands tomorrow.",
    populationPct: 8,
  },
  {
    tier: "AI-Native",
    index: 5,
    scoreBand: "90 to 100",
    tag: "How the work is designed.",
    thesis:
      "The function, sometimes the company, is designed model-first. Workflows assume model output and people step in for the exceptions. Hiring, structure and unit economics reflect what models can do this year and what they'll do next. Most companies will never be here, and that's fine.",
    here: [
      "The org chart is unrecognisable from five years ago.",
      "AI-attributable revenue is in the P&L, not a footnote.",
      "Talent comes for the operating model, not the salary.",
    ],
    watch: "Model brittleness at the edges. The further you push, the further you have to fall when a foundation model changes underneath you.",
    next: "There's no next rung. The work becomes maintaining the lead while the rest of the index re-baselines around you.",
    populationPct: 2,
  },
];

export default function Ladder() {
  const totalPct = TIERS.reduce((s, t) => s + t.populationPct, 0);

  return (
    <div className="min-h-screen bg-walnut text-cream">
      <Seo {...seoRoutes.ladder} jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Maturity ladder", path: "/ladder" }])]} />
      <SiteNav />

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 sm:pt-40 sm:pb-24 lg:pt-48 lg:pb-32 border-b border-cream/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--brass)/0.08),_transparent_60%)]" aria-hidden />
        <div className="container relative max-w-5xl">
          <p className="eyebrow mb-6 motion-safe:animate-fade-up-soft">The Maturity Ladder</p>
          <h1 className="font-display font-light headline-xl text-cream max-w-[16ch] text-balance">
            <span className="block overflow-hidden">
              <span className="block motion-safe:animate-slide-up-mask [animation-delay:120ms]">Six rungs.</span>
            </span>
            <span className="block overflow-hidden">
              <span className="block italic font-normal text-brass-bright motion-safe:animate-slide-up-mask [animation-delay:240ms]">Climb the one in front of you.</span>
            </span>
          </h1>
          <div className="mt-5 h-px w-20 sm:w-24 bg-brass/70 origin-left motion-safe:animate-underline-draw [animation-delay:480ms]" />
          <p className="mt-6 sm:mt-8 max-w-2xl font-display text-lg sm:text-xl lg:text-2xl text-cream/70 leading-snug motion-safe:animate-fade-up-soft [animation-delay:580ms]">
            Every pillar is scored on the same ladder. Your AIOI is the weighted aggregate. The gap between your weakest and strongest pillar is usually a more interesting number than the average.
          </p>
          <p className="mt-5 max-w-2xl font-display text-base sm:text-lg text-cream/65 leading-relaxed motion-safe:animate-fade-up-soft [animation-delay:640ms]">
            The AI maturity ladder turns an AI readiness assessment into six clear operating states: Dormant, Exploring, Deployed, Integrated, Leveraged and AI-Native.
          </p>
        </div>
      </section>

      {/* ─── Visual ladder ───────────────────────────────────────── */}
      <section className="border-b border-cream/10 bg-surface-0">
        <div className="container max-w-6xl py-12 sm:py-20">
          <p className="eyebrow mb-6 sm:mb-8 text-cream/45">The cohort, distributed</p>
          <div className="space-y-2 sm:space-y-3">
            {TIERS.map((t, i) => (
              <a
                key={t.tier}
                href={`#${slug(t.tier)}`}
                style={{ ['--i' as string]: String(i) } as React.CSSProperties}
                className="reveal motion-tap group grid grid-cols-12 items-center gap-x-3 gap-y-2 sm:gap-y-1 sm:gap-4 border-b border-cream/10 py-6 sm:py-7 hover:bg-surface-1/40 -mx-2 sm:-mx-4 px-2 sm:px-4 rounded-sm transition-colors"
              >
                {/* Mobile: 2 rows. Desktop: single row 12-col grid. */}
                <span className="col-span-2 sm:col-span-1 font-mono text-xs text-cream/35 tabular-nums">
                  0{t.index}
                </span>
                <span className="col-span-7 sm:col-span-2 font-display text-2xl sm:text-3xl text-cream group-hover:text-brass-bright transition-colors">
                  {t.tier}
                </span>
                <span className="hidden sm:block sm:col-span-3 font-display italic text-cream/55">
                  {t.tag}
                </span>
                {/* Bar — full row width on mobile (after the label row), 5 cols on desktop */}
                <div className="col-span-9 col-start-3 sm:col-start-auto sm:col-span-5 order-last sm:order-none mt-1 sm:mt-0">
                  <div
                    className="relative h-3 rounded-full bg-cream/[0.07] ring-1 ring-inset ring-cream/15 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={t.populationPct}
                    aria-valuemin={0}
                    aria-valuemax={33}
                    aria-label={`${t.tier}: ${t.populationPct}% of cohort`}
                  >
                    {/* Faint quartile gridlines for scale reference */}
                    {[25, 50, 75].map((g) => (
                      <span
                        key={g}
                        aria-hidden
                        className="absolute top-0 bottom-0 w-px bg-cream/10"
                        style={{ left: `${g}%` }}
                      />
                    ))}
                    <div
                      className="absolute inset-y-0 left-0 bg-brass-bright/90 group-hover:bg-brass-bright shadow-[0_0_0_1px_hsl(var(--brass-bright)/0.35)] transition-colors"
                      style={{ width: `${t.populationPct * 3}%` }}
                    />
                  </div>
                </div>
                <span className="col-span-3 sm:col-span-1 text-right font-mono text-xs text-cream/55 tabular-nums">
                  {t.populationPct}%
                </span>
                {/* Tag line on a second row for mobile */}
                <span className="col-span-12 sm:hidden font-display italic text-sm text-cream/50">
                  {t.tag}
                </span>
              </a>
            ))}
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
            Notional cohort distribution · {totalPct}% · refreshed against the live benchmark
          </p>
        </div>
      </section>

      {/* ─── Tier deep-dives ─────────────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-28">
        <div className="container max-w-6xl space-y-16 sm:space-y-24">
          {TIERS.map((t, i) => (
            <Reveal key={t.tier} index={i % 3}>
              <article
                id={slug(t.tier)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 scroll-mt-24"
              >
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-24 space-y-5 sm:space-y-6">
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <span className="font-display text-5xl sm:text-7xl leading-none text-brass-bright/30 tabular-nums">
                      {String(t.index).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.22em] text-cream/35">
                      Rung {t.index + 1} of 6
                    </span>
                  </div>
                  <TierBadge tier={t.tier} showIndex={false} />
                  <div className="pt-4 border-t border-cream/10 space-y-3">
                    <Stat label="Score band" value={t.scoreBand} />
                    <Stat label="Cohort share" value={`${t.populationPct}%`} />
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-[1.05] tracking-tight">
                  {t.tier}
                </h2>
                <p className="font-display italic text-xl sm:text-2xl text-brass-bright/85 leading-snug">
                  {t.tag}
                </p>
                <p className="font-display text-lg sm:text-xl text-cream/75 leading-relaxed max-w-2xl">
                  {t.thesis}
                </p>

                <List title="You're probably here if" items={t.here} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-2xl">
                  <Callout kind="watch" title="The next thing to watch for" body={t.watch} />
                  <Callout kind="next" title="To climb a rung" body={t.next} />
                </div>
              </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-cream/10 bg-surface-0">
        <Reveal>
          <div className="container max-w-4xl py-16 sm:py-24 text-center">
            <p className="eyebrow mb-5">Find your rung</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-tight tracking-tight">
              Three minutes.<br />
              <span className="italic text-brass-bright">A score you can argue with.</span>
            </h2>
            <a
              href="/assess"
              className="mt-8 sm:mt-10 inline-flex items-center gap-2 h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase transition-colors motion-tap"
            >
              3-minute AI maturity scan <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
              Or read <a href="/pillars" className="story-link hover:text-cream">the eight pillars</a> first
            </p>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

function slug(t: Tier) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">{label}</span>
      <span className="font-display text-cream/85 tabular-nums">{value}</span>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-sm border border-cream/10 bg-surface-1/40 p-5 max-w-2xl">
      <p className="eyebrow mb-3 text-cream/45">{title}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="font-display text-lg text-cream/80 leading-snug flex gap-3">
            <span className="text-brass-bright/70 mt-2 h-px w-3 shrink-0 bg-brass-bright/70" aria-hidden />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Callout({ kind, title, body }: { kind: "watch" | "next"; title: string; body: string }) {
  const isWatch = kind === "watch";
  return (
    <div
      className={`rounded-sm border p-5 ${
        isWatch ? "border-pillar-7/30 bg-pillar-7/5" : "border-brass/30 bg-brass/5"
      }`}
    >
      <p className={`eyebrow mb-2 ${isWatch ? "text-pillar-7/80" : "text-brass-bright/80"}`}>
        {title}
      </p>
      <p className="font-display text-lg text-cream/85 leading-snug">{body}</p>
    </div>
  );
}
