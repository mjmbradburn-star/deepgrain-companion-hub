import { Hero } from "@/components/aioi/Hero";
import { Seo } from "@/components/aioi/Seo";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { SiteNav } from "@/components/aioi/SiteNav";
import { ScrollReveal } from "@/components/aioi/ScrollReveal";
import { ArchetypeGlyph } from "@/components/aioi/ArchetypeGlyph";
import { ARCHETYPES } from "@/lib/archetypes";
import { trackEvent } from "@/lib/analytics";
import { applicationJsonLd, faqJsonLd, seoRoutes } from "@/lib/seo";
import { useEffect } from "react";
import { ArrowRight, Layers, Target, Compass, Grid3X3 } from "lucide-react";

function ArchetypeCard({ archetype, index }: { archetype: (typeof ARCHETYPES)[number]; index: number }) {
  return (
    <ScrollReveal delay={index * 0.08}>
      <div className="group rounded-sm border border-cream/10 bg-surface-1/40 p-6 hover:border-cream/20 transition-all duration-300 motion-lift">
        <div className="flex items-start justify-between mb-5">
          <ArchetypeGlyph index={archetype.index} size={48} strokeWidth={1.5} colour={`hsl(var(--cream) / 0.5)`} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/25">0{archetype.index + 1}</span>
        </div>
        <p className={`font-display text-2xl ${archetype.colour}`}>{archetype.name}</p>
        <p className="mt-1 font-display italic text-base text-cream/60">{archetype.tagline}</p>
        <p className="mt-4 font-display text-sm text-cream/75 leading-relaxed">{archetype.definition}</p>
      </div>
    </ScrollReveal>
  );
}

export default function Index() {
  useEffect(() => {
    trackEvent("landing_viewed", { source: document.referrer || "direct" });
  }, []);

  const steps = [
    {
      num: "01",
      title: "Work pattern",
      body: "How does your team handle repetitive work right now? Manual, fragmented, experimental, integrated, or architected?",
      icon: Layers,
    },
    {
      num: "02",
      title: "Bottleneck",
      body: "What is the single biggest drag on your operations? People, tools, silos, fragility, or scale?",
      icon: Target,
    },
    {
      num: "03",
      title: "The wand",
      body: "If you could change one thing about how your team uses technology, what would it be?",
      icon: Compass,
    },
  ];

  return (
    <>
      <Seo
        {...seoRoutes.home}
        jsonLd={[applicationJsonLd(), faqJsonLd()]}
      />
      <SiteNav />
      <Hero />

      {/* Archetypes preview */}
      <section className="border-t border-cream/10 bg-walnut">
        <div className="container px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <ScrollReveal>
            <p className="eyebrow mb-4">The five archetypes</p>
            <h2 className="font-display text-3xl sm:text-4xl text-cream max-w-2xl mb-12">
              Every team falls into one of these profiles. <span className="italic text-brass-bright">Which are you?</span>
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ARCHETYPES.map((a, i) => (
              <ArchetypeCard key={a.index} archetype={a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 bg-surface-0">
        <div className="container px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <ScrollReveal>
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="font-display text-3xl sm:text-4xl text-cream max-w-2xl mb-12">
              Three questions. Sixty seconds. One clear read.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 0.1}>
                <div className="group relative border-l-2 border-brass/30 pl-6 hover:border-brass/60 transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <s.icon className="h-4 w-4 text-brass/70 group-hover:text-brass transition-colors" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright">{s.num}</span>
                  </div>
                  <h3 className="font-display text-xl text-cream">{s.title}</h3>
                  <p className="mt-2 font-display text-sm text-cream/60 leading-relaxed">{s.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={0.3}>
            <div className="mt-14">
              <a
                href="/assess"
                onClick={() => trackEvent("primary_cta_clicked", { location: "home_how_it_works", label: "Start the scan" })}
                className="inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-7 py-3.5 font-ui text-sm uppercase tracking-wider transition-colors"
              >
                Start the scan <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Marquee / social proof band */}
      <section className="border-t border-cream/10 bg-walnut overflow-hidden">
        <div className="py-10 sm:py-14">
          <ScrollReveal>
            <p className="eyebrow text-center mb-8">Built for teams at</p>
          </ScrollReveal>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-walnut to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-walnut to-transparent z-10" />
            <div className="flex gap-12 sm:gap-16 animate-scroll-x">
              {["Rimes", "Systemiq", "Masabi", "Skylo", "XYZ Reality", "Vertical Aerospace", "Orbital", "Carbon Clean", "Andus Labs"].map((name) => (
                <span key={name} className="font-display text-lg sm:text-xl text-cream/25 whitespace-nowrap shrink-0">
                  {name}
                </span>
              ))}
              {["Rimes", "Systemiq", "Masabi", "Skylo", "XYZ Reality", "Vertical Aerospace", "Orbital", "Carbon Clean", "Andus Labs"].map((name) => (
                <span key={`${name}-2`} className="font-display text-lg sm:text-xl text-cream/25 whitespace-nowrap shrink-0">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-cream/10 bg-walnut">
        <div className="container px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <ScrollReveal>
            <p className="eyebrow mb-4">FAQ</p>
            <h2 className="font-display text-3xl sm:text-4xl text-cream mb-12">Common questions</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-5xl">
            {[
              {
                q: "What is an AI Operating Archetype?",
                a: "It is a profile that describes how your team handles work, where the bottleneck is, and what to change first. There are five: Operator, Fragment, Explorer, Integrator, and Architect.",
              },
              {
                q: "How long does the scan take?",
                a: "About sixty seconds. Three questions, five options each. No email required to see your result.",
              },
              {
                q: "Do I need to enter an email?",
                a: "No. The archetype result is shown instantly. Email is only used if you want to save the result or book a follow-up.",
              },
              {
                q: "Who is Deepgrain?",
                a: "Deepgrain is the studio behind the AI Operating Index. We build diagnostic and operating tools for AI enablement and transformation.",
              },
            ].map(({ q, a }, i) => (
              <ScrollReveal key={q} delay={i * 0.06}>
                <div>
                  <h3 className="font-display text-lg text-cream">{q}</h3>
                  <p className="mt-2 font-display text-sm text-cream/60 leading-relaxed">{a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
