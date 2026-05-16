import { Hero } from "@/components/aioi/Hero";
import { Seo } from "@/components/aioi/Seo";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { SiteNav } from "@/components/aioi/SiteNav";
import { ARCHETYPES } from "@/lib/assessment";
import { trackEvent } from "@/lib/analytics";
import { applicationJsonLd, faqJsonLd, seoRoutes } from "@/lib/seo";
import { useEffect } from "react";

function ArchetypeCard({ archetype }: { archetype: (typeof ARCHETYPES)[number] }) {
  return (
    <div className="rounded-sm border border-cream/10 bg-surface-1/40 p-6 hover:border-cream/20 transition-colors">
      <p className={`font-display text-2xl ${archetype.colour}`}>{archetype.name}</p>
      <p className="mt-1 font-display italic text-base text-cream/60">{archetype.tagline}</p>
      <p className="mt-4 font-display text-sm text-cream/75 leading-relaxed">{archetype.definition}</p>
    </div>
  );
}

export default function Index() {
  useEffect(() => {
    trackEvent("landing_viewed", { source: document.referrer || "direct" });
  }, []);

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
          <p className="eyebrow mb-4">The five archetypes</p>
          <h2 className="font-display text-3xl sm:text-4xl text-cream max-w-2xl mb-12">
            Every team falls into one of these profiles. <span className="italic text-brass-bright">Which are you?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ARCHETYPES.map((a) => (
              <ArchetypeCard key={a.index} archetype={a} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 bg-surface-0">
        <div className="container px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="font-display text-3xl sm:text-4xl text-cream max-w-2xl mb-12">
            Three questions. Sixty seconds. One clear read.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Work pattern",
                body: "How does your team handle repetitive work right now? Manual, fragmented, experimental, integrated, or architected?",
              },
              {
                num: "02",
                title: "Bottleneck",
                body: "What is the single biggest drag on your operations? People, tools, silos, fragility, or scale?",
              },
              {
                num: "03",
                title: "The wand",
                body: "If you could change one thing about how your team uses technology, what would it be?",
              },
            ].map((s) => (
              <div key={s.num} className="border-l-2 border-brass/30 pl-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright">{s.num}</span>
                <h3 className="mt-2 font-display text-xl text-cream">{s.title}</h3>
                <p className="mt-2 font-display text-sm text-cream/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <a
              href="/assess"
              onClick={() => trackEvent("primary_cta_clicked", { location: "home_how_it_works", label: "Start the scan" })}
              className="inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-7 py-3.5 font-ui text-sm uppercase tracking-wider"
            >
              Start the scan
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-cream/10 bg-walnut">
        <div className="container px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <p className="eyebrow mb-4">FAQ</p>
          <h2 className="font-display text-3xl sm:text-4xl text-cream mb-12">Common questions</h2>
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
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-display text-lg text-cream">{q}</h3>
                <p className="mt-2 font-display text-sm text-cream/60 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
