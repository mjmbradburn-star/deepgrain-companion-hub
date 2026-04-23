import { ArrowRight } from "lucide-react";
import { Seo } from "@/components/aioi/Seo";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { SiteNav } from "@/components/aioi/SiteNav";
import { breadcrumbJsonLd, seoRoutes } from "@/lib/seo";

const navigationLinks = [
  {
    href: "/assess",
    label: "Start the free AI maturity assessment",
    detail: "Choose company, function, or individual and complete the 3-minute AIOI quickscan.",
  },
  {
    href: "/pillars",
    label: "Read the eight AI operating model pillars",
    detail: "Understand the framework used to score strategy, data, tooling, workflow, skills, governance, measurement, and culture.",
  },
  {
    href: "/ladder",
    label: "Understand the AI maturity ladder",
    detail: "See how AIOI maps scores from Dormant through Exploring, Deployed, Integrated, Leveraged, and AI-Native.",
  },
  {
    href: "/benchmarks",
    label: "Compare AI adoption benchmark data",
    detail: "Review aggregated benchmark context by level, function, organisation size, sector, and region.",
  },
];

const pillarLinks = [
  "Strategy & Mandate",
  "Data Foundations",
  "Tooling & Infrastructure",
  "Workflow Integration",
  "Skills & Fluency",
  "Governance & Risk",
  "Measurement & ROI",
  "Culture & Adoption",
];

export default function AiOverview() {
  return (
    <div className="min-h-screen bg-walnut text-cream">
      <Seo
        {...seoRoutes.aiOverview}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "AI overview", path: "/ai/overview" },
          ]),
        ]}
      />
      <SiteNav />

      <main>
        <section className="border-b border-cream/10 pt-28 pb-14 sm:pt-40 sm:pb-20">
          <div className="container max-w-5xl">
            <p className="eyebrow mb-6">AI-readable overview</p>
            <h1 className="font-display headline-lg max-w-4xl text-cream text-balance">
              What the AI Operating Index does, and where to go next.
            </h1>
            <p className="mt-7 max-w-3xl font-display text-xl text-cream/70 leading-relaxed">
              The AI Operating Index is a free maturity scan from Deepgrain. It helps companies, functions, and individuals assess AI readiness across eight operating pillars, receive an AIOI score, understand their maturity tier, and compare results with benchmark context where available.
            </p>
            <a
              href="/assess"
              className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-brass px-7 font-ui text-sm uppercase tracking-wider text-walnut transition-colors hover:bg-brass-bright"
            >
              Take the AI maturity assessment <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

        <section className="border-b border-cream/10 bg-surface-0 py-12 sm:py-16">
          <div className="container">
            <p className="eyebrow mb-5 text-cream/45">From this page</p>
            <nav aria-label="From this page" className="grid gap-6 lg:grid-cols-4">
              {navigationLinks.map((item) => (
                <a key={item.href} href={item.href} className="group rounded-sm border border-cream/10 bg-surface-1/50 p-5 transition-colors hover:border-brass/60 hover:bg-surface-1">
                  <span className="font-display text-2xl text-cream group-hover:text-brass-bright">{item.label}</span>
                  <span className="mt-3 block font-ui text-sm leading-relaxed text-cream/60">{item.detail}</span>
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow mb-5">Eight-pillar framework</p>
              <h2 className="font-display text-4xl text-cream sm:text-5xl">Direct pillar section links.</h2>
              <p className="mt-5 font-display text-lg leading-relaxed text-cream/65">
                Each pillar has a dedicated anchor on the framework page, with plain-language signals, obstacles, and maturity bookends.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {pillarLinks.map((pillar, index) => (
                <li key={pillar}>
                  <a href={`/pillars#p${index + 1}`} className="group flex min-h-20 items-center gap-4 rounded-sm border border-cream/10 bg-surface-1/45 px-5 py-4 transition-colors hover:border-brass/60 hover:bg-surface-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/70">P{index + 1}</span>
                    <span className="font-display text-xl text-cream/80 group-hover:text-cream">{pillar}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}