import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function Hero() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden grain bg-walnut">
      {/* Soft tonal washes — give the cream page a gentle gravitational centre */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 w-[60vw] h-[60vw] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--surface-2)) 0%, transparent 60%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 w-[50vw] h-[50vw] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--green) / 0.08) 0%, transparent 60%)" }}
      />

      {/* Top hairline meta — masthead */}
      <div className="relative z-10 border-b border-cream/15">
        <div className="container flex items-center justify-between py-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cream/55">
          <span>The AI Operating Index</span>
          <span className="hidden sm:inline">Volume I · MMXXVI</span>
          <span>Deepgrain</span>
        </div>
      </div>

      {/* Headline block */}
      <div className="container relative z-10 pt-10 sm:pt-16">
        <p className="eyebrow mb-4 sm:mb-5 animate-fade-in">Issue 01 · A diagnostic</p>
        <h1 className="font-display font-light hero-headline text-cream max-w-[10ch] sm:max-w-[12ch] text-balance animate-fade-up">
          Measure your<br />
          <span className="italic font-normal text-brass">AI debt.</span>
        </h1>
        <div className="mt-5 sm:mt-6 h-px w-24 bg-brass/70 animate-fade-in [animation-delay:160ms]" />
      </div>

      {/* Standfirst + CTA */}
      <div className="container relative z-10 mt-8 sm:mt-auto pb-12 sm:pb-28 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-end">
        <p className="md:col-span-6 md:col-start-7 font-display text-lg sm:text-2xl text-cream/80 leading-[1.4] sm:leading-[1.35] text-pretty animate-fade-up [animation-delay:200ms]">
          For companies, functions and individuals.
          Three minutes. Eight pillars, one question each,
          from <span className="italic">Dormant</span> to <span className="italic">AI-Native</span>.
        </p>

        <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 animate-fade-up [animation-delay:320ms]">
          <Button asChild size="lg" className="h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase w-full sm:w-auto">
            <a href="/assess">
              3-minute AI maturity scan
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <a
            href="/pillars"
            className="font-ui text-sm text-cream/65 hover:text-cream underline-offset-4 hover:underline transition-colors text-center sm:text-left"
          >
            See the eight pillars
          </a>
          <span className="sm:ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 text-center sm:text-right">
            ~3 min · 8 questions · no email
          </span>
        </div>
      </div>

      {/* Scroll cue — desktop only; mobile already shows everything in-flow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-5 z-10 hidden sm:flex flex-col items-center gap-2 transition-opacity duration-500 ${
          scrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="h-8 w-px bg-cream/30 origin-top motion-safe:animate-scroll-bob" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-cream/50">
          Scroll · Eight pillars
        </span>
      </div>
    </section>
  );
}
