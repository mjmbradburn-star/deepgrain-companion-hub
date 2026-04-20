import heroImg from "@/assets/forest-hero.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden grain">
      <img
        src={heroImg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient veil */}
      <div className="absolute inset-0 bg-gradient-to-b from-walnut/40 via-walnut/55 to-walnut" />
      <div className="absolute inset-0 bg-gradient-to-r from-walnut/70 via-transparent to-transparent" />

      <div className="container relative z-10 pb-20 pt-32">
        <p className="eyebrow mb-6 animate-fade-in">The AI Operating Index · v1</p>
        <h1 className="font-display text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.02em] text-cream max-w-[14ch] text-balance animate-fade-up">
          Measure your<br />
          <span className="italic text-brass-bright">AI debt.</span>
        </h1>
        <p className="mt-8 max-w-xl font-display text-2xl text-cream/80 leading-snug text-pretty animate-fade-up [animation-delay:120ms]">
          A diagnostic for companies, functions and individuals.
          Twenty minutes. One report. Eight pillars of operational truth —
          from <span className="italic">Dormant</span> to <span className="italic">AI-Native</span>.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up [animation-delay:240ms]">
          <Button asChild size="lg" className="h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase bg-brass text-walnut hover:bg-brass-bright">
            <a href="/assess">
              Begin assessment
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <a href="/pillars" className="font-ui text-sm text-cream/60 hover:text-cream underline-offset-4 hover:underline transition-colors">
            See the eight pillars
          </a>
        </div>
      </div>

      {/* Bottom hairline meta strip */}
      <div className="absolute bottom-0 inset-x-0 border-t border-cream/10 bg-walnut/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">
          <span>Built by Deepgrain</span>
          <span className="hidden sm:inline">Est. completion · 18 min</span>
          <span>50° 04′ N · 14° 26′ E</span>
        </div>
      </div>
    </section>
  );
}
