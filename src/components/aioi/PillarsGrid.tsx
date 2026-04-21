import { PillarChip, type PillarIndex } from "./PillarChip";

const PILLARS: { i: PillarIndex; name: string; blurb: string }[] = [
  { i: 1, name: "Strategy & Mandate",       blurb: "Whether anyone has actually been told to own this." },
  { i: 2, name: "Data Foundations",         blurb: "What a model would find if it tried to read your work." },
  { i: 3, name: "Tooling & Infrastructure", blurb: "What's in use, not what's been bought." },
  { i: 4, name: "Workflow Integration",     blurb: "Where AI sits in the day, beyond the demo." },
  { i: 5, name: "Skills & Fluency",         blurb: "How fluent the average person is, not the keenest." },
  { i: 6, name: "Governance & Risk",        blurb: "What stops something silly happening in your name." },
  { i: 7, name: "Measurement & ROI",        blurb: "Whether you can put a number next to the work." },
  { i: 8, name: "Culture & Adoption",       blurb: "How people talk about it when no one is watching." },
];

export function PillarsGrid() {
  return (
    <section id="pillars" className="relative section-y border-t border-cream/10">
      <div className="container">
        <div className="max-w-3xl mb-10 sm:mb-16">
          <p className="eyebrow mb-5">Eight Pillars</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            Eight things that decide<br />
            <span className="italic text-brass-bright">where AI works for you.</span>
          </h2>
          <p className="mt-6 font-display text-lg sm:text-xl text-cream/65 max-w-xl">
            Most surveys measure tools. This one looks at how you operate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-cream/10 border border-cream/10 rounded-lg overflow-hidden">
          {PILLARS.map((p) => (
            <article key={p.i} className="bg-walnut p-5 sm:p-7 hover:bg-surface-1 transition-colors group">
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <PillarChip index={p.i} label="" number />
                <span className="font-mono text-xs text-cream/30">0{p.i}</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl text-cream leading-snug mb-3">{p.name}</h3>
              <p className="text-sm text-cream/75 leading-relaxed">{p.blurb}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
