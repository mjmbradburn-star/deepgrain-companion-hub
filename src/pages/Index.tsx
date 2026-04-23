import { SiteNav } from "@/components/aioi/SiteNav";
import { Hero } from "@/components/aioi/Hero";
import { PillarsGrid } from "@/components/aioi/PillarsGrid";
import { MaturityLadder } from "@/components/aioi/MaturityLadder";
import { ThreeLevels } from "@/components/aioi/ThreeLevels";
import { BenchmarkCounter } from "@/components/aioi/BenchmarkCounter";
import { StudioSection } from "@/components/aioi/StudioSection";
import { FounderBio } from "@/components/aioi/FounderBio";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { Reveal } from "@/components/aioi/Reveal";
import { Seo } from "@/components/aioi/Seo";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { applicationJsonLd, faqItems, faqJsonLd, organizationJsonLd, seoRoutes, websiteJsonLd } from "@/lib/seo";

const Index = () => {
  useEffect(() => {
    trackEvent("seo_landing_viewed", { route: "/" }, { optional: true });
  }, []);

  return (
    <main className="min-h-screen bg-walnut text-cream">
      <Seo {...seoRoutes.home} jsonLd={[organizationJsonLd(), websiteJsonLd(), applicationJsonLd(), faqJsonLd()]} />
      <SiteNav />
      <Hero />
      <Reveal index={1}><SearchIntentSection /></Reveal>
      <Reveal index={0}><PillarsGrid /></Reveal>
      <Reveal index={1}><MaturityLadder /></Reveal>
      <Reveal index={0}><ThreeLevels /></Reveal>
      <Reveal index={1}><BenchmarkCounter /></Reveal>
      <Reveal index={0}><FaqSection /></Reveal>
      <Reveal index={0}><StudioSection /></Reveal>
      <Reveal index={1}><FounderBio /></Reveal>
      <SiteFooter />
    </main>
  );
};

function SearchIntentSection() {
  return (
    <section className="border-b border-cream/10 bg-surface-0">
      <div className="container max-w-6xl py-14 sm:py-20 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-5">AI maturity assessment</p>
          <h2 className="font-display headline-md text-cream text-balance">
            A three-minute read on your AI operating model.
          </h2>
        </div>
        <div className="lg:col-span-7 grid gap-5 sm:grid-cols-2">
          {[
            ["What it measures", "AIOI scores AI readiness across eight operating pillars: strategy, data, tooling, workflow, skills, governance, measurement and culture."],
            ["What you get", "A score out of 100, a maturity tier, weakest-pillar hotspots, recommendations and peer benchmark context."],
            ["Who it is for", "Companies, functions and individuals who need an AI adoption benchmark without a long consulting survey."],
            ["Email policy", "No email is required for the first score. Email is only used to save a report or unlock the Deep Dive."],
          ].map(([title, body]) => (
            <article key={title} className="border-t border-cream/10 pt-5">
              <h3 className="font-ui text-sm uppercase tracking-[0.16em] text-brass">{title}</h3>
              <p className="mt-3 font-display text-lg leading-relaxed text-cream/75">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="border-y border-cream/10 bg-surface-0">
      <div className="container max-w-5xl py-14 sm:py-20">
        <p className="eyebrow mb-5">Questions people ask</p>
        <h2 className="font-display headline-md text-cream text-balance">How the AI Operating Index works.</h2>
        <p className="mt-5 max-w-3xl font-display text-lg leading-relaxed text-cream/70">
          The AI Operating Index is a free AI maturity scan that measures readiness across eight operating pillars and returns a practical score, tier and benchmark context.
        </p>
        <div className="mt-10 divide-y divide-cream/10 border-y border-cream/10">
          {faqItems.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer list-none font-display text-xl text-cream marker:hidden group-open:text-brass-bright">
                {item.question}
              </summary>
              <p className="mt-3 max-w-3xl font-display text-lg leading-relaxed text-cream/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Index;
