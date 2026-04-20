import { ArrowRight } from "lucide-react";

const LEVELS = [
  {
    tag: "Company",
    title: "The whole organisation.",
    body: "For founders, COOs and chief-of-staff. A board-ready read on AI debt across every function — and where to spend the next quarter.",
    time: "~22 min",
    audience: "Exec / Board",
  },
  {
    tag: "Function",
    title: "One team, deeply.",
    body: "For function leads — product, marketing, ops, finance, legal. Diagnoses the workflow you actually run, with interventions sized for your headcount.",
    time: "~18 min",
    audience: "Function lead",
  },
  {
    tag: "Individual",
    title: "Your personal stack.",
    body: "For senior operators who want a private mirror. How you work versus how the AI-native version of you would. No login, no record.",
    time: "~12 min",
    audience: "IC / Operator",
  },
];

export function ThreeLevels() {
  return (
    <section id="levels" className="relative py-28 sm:py-36 border-t border-cream/10">
      <div className="container">
        <div className="max-w-3xl mb-14">
          <p className="eyebrow mb-5">Three Levels</p>
          <h2 className="font-display text-5xl sm:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            Pick the lens<br />
            <span className="italic text-brass-bright">that matters.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {LEVELS.map((l, i) => (
            <a
              key={l.tag}
              href="/assess"
              className="group relative rounded-lg border border-cream/10 bg-surface-1/60 p-7 hover:border-brass/60 hover:bg-surface-1 transition-all duration-200 flex flex-col min-h-[340px]"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/80">
                  Level 0{i + 1}
                </span>
                <span className="font-mono text-xs text-cream/40">{l.time}</span>
              </div>
              <h3 className="font-display text-3xl text-cream leading-tight mb-3">{l.tag}</h3>
              <p className="font-display italic text-xl text-cream/60 mb-4">{l.title}</p>
              <p className="text-sm text-cream/60 leading-relaxed">{l.body}</p>
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-cream/10">
                <span className="font-ui text-xs text-cream/40">{l.audience}</span>
                <span className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-brass-bright group-hover:gap-3 transition-all">
                  Begin <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
