import heroImg from "@/assets/forest-hero.jpg";
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
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden grain">
      <img
        src={heroImg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Veils — darker at the top to seat the headline, lifting through the middle */}
      <div className="absolute inset-0 bg-gradient-to-b from-walnut/85 via-walnut/35 to-walnut" />
      <div className="absolute inset-0 bg-gradient-to-r from-walnut/55 via-transparent to-transparent" />

      {/* Top hairline meta — frames the headline like a masthead */}
      <div className="relative z-10 border-b border-cream/10">
        <div className="container flex items-center justify-between py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">
          <span>The AI Operating Index</span>
          <span className="hidden sm:inline">Volume I · MMXXVI</span>
          <span>Deepgrain</span>
        </div>
      </div>

      {/* Headline block — pinned to the top */}
      <div className="container relative z-10 pt-12 sm:pt-16">
        <p className="eyebrow mb-5 animate-fade-in text-cream/55">Issue 01 — A diagnostic</p>
        <h1 className="font-display font-light text-[clamp(3.5rem,11vw,9rem)] leading-[0.88] tracking-[-0.035em] text-cream max-w-[12ch] text-balance animate-fade-up">
          Measure your<br />
          <span className="italic font-normal text-brass-bright">AI debt.</span>
        </h1>
        <div className="mt-6 h-px w-24 bg-brass/60 animate-fade-in [animation-delay:160ms]" />
      </div>

      {/* Standfirst + CTA — anchored to the bottom edge, editorial column */}
      <div className="container relative z-10 mt-auto pb-24 sm:pb-28 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <p className="md:col-span-6 md:col-start-7 font-display text-xl sm:text-2xl text-cream/80 leading-[1.35] text-pretty animate-fade-up [animation-delay:200ms]">
          For companies, functions and individuals.
          Twenty minutes. One report. Eight pillars —
          from <span className="italic">Dormant</span> to <span className="italic">AI-Native</span>.
        </p>

        <div className="md:col-span-12 flex flex-wrap items-center gap-5 animate-fade-up [animation-delay:320ms]">
          <Button asChild size="lg" className="h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase bg-brass text-walnut hover:bg-brass-bright">
            <a href="/assess">
              Begin assessment
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <a href="/pillars" className="font-ui text-sm text-cream/60 hover:text-cream underline-offset-4 hover:underline transition-colors">
            See the eight pillars
          </a>
          <span className="ml-auto hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
            ~18 min · 8 questions
          </span>
        </div>
      </div>
    </section>
  );
}
