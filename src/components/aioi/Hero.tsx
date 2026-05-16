import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function Hero() {
  return (
    <section className="relative min-h-[88svh] sm:min-h-[100svh] flex flex-col overflow-hidden grain bg-walnut">
      {/* Soft tonal washes — static, no parallax */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 w-[60vw] h-[60vw] rounded-full opacity-50 blur-3xl motion-safe:animate-fade-in-slow"
        style={{ background: "radial-gradient(circle, hsl(var(--surface-2)) 0%, transparent 60%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 w-[50vw] h-[50vw] rounded-full opacity-40 blur-3xl motion-safe:animate-fade-in-slow [animation-delay:120ms]"
        style={{ background: "radial-gradient(circle, hsl(var(--green) / 0.08) 0%, transparent 60%)" }}
      />

      {/* Top hairline meta — masthead */}
      <div className="relative z-10 border-b border-cream/15 motion-safe:animate-fade-in">
        <div className="container px-6 sm:px-8 lg:px-12 flex items-center justify-between py-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cream/55">
          <span>The AI Operating Index</span>
          <span className="hidden sm:inline">Volume I · MMXXVI</span>
          <span>Deepgrain</span>
        </div>
      </div>

      {/* Headline block */}
      <div className="container px-6 sm:px-8 lg:px-12 relative z-10 pt-8 sm:pt-12 lg:pt-14">
        <p className="eyebrow mb-6 sm:mb-5 motion-safe:animate-fade-up-soft">Issue 01 · Archetype scan</p>
        <h1
          className="font-display font-light text-cream max-w-[14ch] sm:max-w-[12ch] text-[clamp(3.5rem,18vw,5.75rem)] sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] xl:text-[9.5rem] leading-[0.95] sm:leading-[0.9] tracking-[-0.02em]"
          style={{ perspective: "1000px" }}
        >
          <span className="block overflow-hidden">
            <span className="block motion-safe:animate-slide-up-mask [animation-delay:120ms]">
              Find your
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="block motion-safe:animate-slide-up-mask [animation-delay:220ms]">
              AI
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="block italic font-normal text-brass motion-safe:animate-slide-up-mask [animation-delay:340ms] text-left">
              Archetype
            </span>
          </span>
        </h1>
        <div className="mt-5 sm:mt-6 h-px w-20 sm:w-24 bg-brass/70 origin-left motion-safe:animate-underline-draw [animation-delay:580ms]" />
      </div>

      {/* Standfirst + CTA */}
      <div className="container px-6 sm:px-8 lg:px-12 relative z-10 pt-8 sm:pt-12 lg:pt-14 pb-10 sm:pb-20 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 text-left">
        <p className="md:col-span-6 md:col-start-7 font-display sm:text-2xl text-cream/80 leading-[1.45] sm:leading-[1.35] text-pretty motion-safe:animate-fade-up-soft [animation-delay:680ms]">
          <span className="block">For companies, functions and individuals.</span>
          <span className="block">Sixty seconds.</span>
          <span className="block">Three questions, five options each, from <span className="italic">The Operator</span> to <span className="italic">The Architect</span>.</span>
        </p>

        <div className="md:col-span-6 md:col-start-7 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-x-6 sm:gap-y-3 motion-safe:animate-fade-up-soft [animation-delay:820ms]">
          <Button
            asChild
            size="lg"
            className="h-14 sm:h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase w-full sm:w-auto inline-flex items-center justify-center gap-2 leading-none shrink-0 motion-tap"
          >
            <a href="/assess" onClick={() => trackEvent("primary_cta_clicked", { location: "home_hero", label: "60-second archetype scan" }, { optional: true })}>
              <span>60-second archetype scan</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 text-center sm:text-left leading-none w-full sm:w-auto sm:basis-full">
            ~60 sec · 3 questions · no email
          </span>
        </div>
      </div>
    </section>
  );
}
