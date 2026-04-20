import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TierBadge, type Tier } from "./TierBadge";

const TIERS: { tier: Tier; tag: string; body: string }[] = [
  { tier: "Dormant",     tag: "It hasn't really come up.",  body: "No one has been asked to own it. Nothing is in any workflow. People talk about AI in the abstract, not about anything they did with it last week." },
  { tier: "Reactive",    tag: "Used quietly when stuck.",   body: "People reach for ChatGPT to draft an email or summarise a doc. It's on personal cards, not the function budget. There's no shared way of doing it." },
  { tier: "Exploratory", tag: "Pilots and pet projects.",   body: "A team or two is running real experiments. There are wins, owned by the people who care most. Nothing has yet reached the work that pays the bills." },
  { tier: "Operational", tag: "Now part of the work.",      body: "A few named workflows run through AI on real data, with playbooks and a measurement habit. Some teams are racing, some are watching." },
  { tier: "Integrated",  tag: "The default first draft.",   body: "AI is the assumed first pass for most production work, with humans on review. The average person uses it daily. Tooling, governance and measurement all keep up." },
  { tier: "AI-Native",   tag: "How the work is designed.",  body: "Workflows assume model output. People escalate the exceptions. Hiring and structure reflect what models can do this year and next. Most companies will never be here, and that's fine." },
];

export function MaturityLadder() {
  return (
    <section id="ladder" className="relative py-28 sm:py-36 border-t border-cream/10 bg-surface-0">
      <div className="container max-w-5xl">
        <div className="mb-14">
          <p className="eyebrow mb-5">The Maturity Ladder</p>
          <h2 className="font-display text-5xl sm:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            Six rungs.<br />
            <span className="italic text-brass-bright">Climb the one in front of you.</span>
          </h2>
          <p className="mt-6 font-display text-xl text-cream/65 max-w-2xl">
            Every pillar is scored on the same ladder. Your AIOI is the weighted aggregate. The gap between your weakest and strongest pillar is usually the more interesting number.
          </p>
        </div>

        <Accordion type="single" collapsible className="border-t border-cream/10">
          {TIERS.map((t, i) => (
            <AccordionItem key={t.tier} value={t.tier} className="border-b border-cream/10">
              <AccordionTrigger className="py-6 hover:no-underline group">
                <div className="flex items-center gap-6 w-full">
                  <span className="font-mono text-xs text-cream/30 w-6">0{i}</span>
                  <span className="font-display text-3xl text-cream group-hover:text-brass-bright transition-colors">{t.tier}</span>
                  <span className="hidden md:inline font-display italic text-cream/50 ml-auto mr-6">{t.tag}</span>
                  <TierBadge tier={t.tier} showIndex={false} className="hidden lg:inline-flex" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8 pl-12 pr-4">
                <p className="font-display text-xl text-cream/75 max-w-2xl leading-snug">{t.body}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
