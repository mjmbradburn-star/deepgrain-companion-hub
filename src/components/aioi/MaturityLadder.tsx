import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TierBadge, type Tier } from "./TierBadge";

const TIERS: { tier: Tier; tag: string; body: string }[] = [
  { tier: "Dormant",     tag: "AI is a rumour.",            body: "No mandate, no tools in the workflow, no measurement. Curiosity exists in pockets but nothing is operationalised." },
  { tier: "Reactive",    tag: "Used when forced.",          body: "Individuals reach for ChatGPT when stuck. No shared playbook, no governance. Risk is invisible." },
  { tier: "Exploratory", tag: "Pilots and pet projects.",   body: "A function or two is experimenting. Some early wins, no infrastructure, no path to scale beyond the believer." },
  { tier: "Operational", tag: "AI is in the workflow.",     body: "Specific use cases are running on production data with policy and measurement. Adoption is uneven." },
  { tier: "Integrated",  tag: "Default for most work.",     body: "Cross-functional, governed, measured. AI is the assumed first draft. Skills are widespread." },
  { tier: "AI-Native",   tag: "Operating system, not tool.", body: "Workflow, hiring and economics are designed around model capability. Compounding leverage. Most companies will never be here." },
];

export function MaturityLadder() {
  return (
    <section id="ladder" className="relative py-28 sm:py-36 border-t border-cream/10 bg-surface-0">
      <div className="container max-w-5xl">
        <div className="mb-14">
          <p className="eyebrow mb-5">The Maturity Ladder</p>
          <h2 className="font-display text-5xl sm:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            Six tiers.<br />
            <span className="italic text-brass-bright">No participation prizes.</span>
          </h2>
          <p className="mt-6 font-display text-xl text-cream/65 max-w-2xl">
            Every pillar is scored on the same ladder. Your AIOI is the weighted aggregate — and the gap between your weakest and strongest pillar is usually the more interesting number.
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
