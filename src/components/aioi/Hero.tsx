import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function Hero() {
  const [scrolled, setScrolled] = useState(false);
  const washTopRef = useRef<HTMLDivElement>(null);
  const washBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Subtle parallax on the radial washes — pure transform, GPU only.
  // Disabled under prefers-reduced-motion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const top = washTopRef.current;
        const bot = washBottomRef.current;
        if (top) top.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
        if (bot) bot.style.transform = `translate3d(0, ${y * -0.08}px, 0)`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative min-h-[88svh] sm:min-h-[100svh] flex flex-col overflow-hidden grain bg-walnut">
      {/* Soft tonal washes — gentle parallax, GPU-only */}
      <div
        ref={washTopRef}
        aria-hidden="true"
        className="absolute -top-40 -right-40 w-[60vw] h-[60vw] rounded-full opacity-50 blur-3xl motion-safe:animate-fade-in-slow will-change-transform"
        style={{ background: "radial-gradient(circle, hsl(var(--surface-2)) 0%, transparent 60%)" }}
      />
      <div
        ref={washBottomRef}
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 w-[50vw] h-[50vw] rounded-full opacity-40 blur-3xl motion-safe:animate-fade-in-slow [animation-delay:120ms] will-change-transform"
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
      <div className="container px-6 sm:px-8 lg:px-12 relative z-10 pt-8 sm:pt-16">
        <p className="eyebrow mb-6 sm:mb-5 motion-safe:animate-fade-up-soft">Issue 01 · A diagnostic</p>
        <h1
          className="font-display font-light text-cream max-w-[14ch] sm:max-w-[12ch] text-[clamp(3.5rem,18vw,5.75rem)] sm:text-[6rem] md:text-[7.5rem] lg:text-[10rem] leading-[0.95] sm:leading-[0.88] tracking-[-0.02em]"
          style={{ perspective: "1000px" }}
        >
          <span
            className="block overflow-hidden"
          >
            <span className="block motion-safe:animate-slide-up-mask [animation-delay:120ms]">
              Measure
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="block motion-safe:animate-slide-up-mask [animation-delay:220ms]">
              your
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="block italic font-normal text-brass motion-safe:animate-slide-up-mask [animation-delay:340ms] text-left mb-0 pb-[30px]">
              AI Capability
            </span>
          </span>
        </h1>
        <div className="mt-4 sm:mt-6 h-px w-20 sm:w-24 bg-brass/70 origin-left motion-safe:animate-underline-draw [animation-delay:580ms]" />
      </div>

      {/* Standfirst + CTA */}
      <div className="container sm:px-8 lg:px-12 relative z-10 mt-auto pt-10 sm:pt-0 pb-10 sm:pb-28 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-end px-[45px] text-left">
        <p className="md:col-span-6 md:col-start-7 font-display sm:text-2xl text-cream/80 leading-[1.45] sm:leading-[1.35] text-pretty motion-safe:animate-fade-up-soft [animation-delay:680ms] text-2xl">
          For companies, functions and individuals.
          <br />
          <br />
          Three minutes.
          <br />
          <br />
          Eight pillars, one question each, from <span className="italic">Dormant</span> to <span className="italic">AI-Native</span>.
        </p>

        <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 motion-safe:animate-fade-up-soft [animation-delay:820ms]">
          <Button
            asChild
            size="lg"
            className="h-14 sm:h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase w-full sm:w-auto inline-flex items-center justify-center gap-2 leading-none shrink-0 motion-tap"
          >
            <a href="/assess" onClick={() => trackEvent("primary_cta_clicked", { location: "home_hero", label: "3-minute AI maturity scan" }, { optional: true })}>
              <span>3-minute AI maturity scan</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </Button>
          <a
            href="/pillars"
            className="story-link font-ui text-sm text-cream/70 hover:text-cream transition-colors text-center sm:text-left leading-none py-1"
          >
            See the eight pillars
          </a>
          <span className="sm:ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 text-center sm:text-right leading-none">
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
