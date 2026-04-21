import { ArrowUpRight } from "lucide-react";

export function WhyDeepgrain() {
  return (
    <section className="relative section-y border-t border-cream/10">
      <div className="container grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-5">Why Deepgrain</p>
          <h2 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
            We rebuild operating systems<br />
            <span className="italic text-brass-bright">around the model.</span>
          </h2>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 space-y-5 sm:space-y-6 font-display text-lg sm:text-xl text-cream/75 leading-snug">
          <p>
            Deepgrain is a small studio for companies that have decided AI is not a feature. We work with founders and exec teams to redesign how the work actually gets done. Function by function, workflow by workflow.
          </p>
          <p className="text-cream/60">
            AIOI is the front door. Score yourself, see where you sit against everyone else, and know exactly which two pillars to fix next quarter.
          </p>
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 font-ui text-sm uppercase tracking-[0.18em] text-brass-bright hover:text-cream transition-colors group"
          >
            About the studio
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
