import { ArrowUpRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_URL } from "@/lib/booking";

interface Service {
  name: string;
  brand: "Deepgrain" | "People X AI";
  blurb: string;
  duration: string;
}

const SERVICES: Service[] = [
  {
    name: "AI Enablement Sprint",
    brand: "Deepgrain",
    blurb:
      "Get the first real workflow into production. Pick the function with the most operating debt and rebuild it around the model.",
    duration: "4–6 weeks",
  },
  {
    name: "AI Build Sprint",
    brand: "Deepgrain",
    blurb:
      "Ship a production-grade AI workflow with evals, observability and a clear handover. For teams who already know what to build.",
    duration: "6–10 weeks",
  },
  {
    name: "Fractional AI Partner",
    brand: "Deepgrain",
    blurb:
      "Embedded senior partner across governance, evals and org redesign. For Integrated and Leveraged orgs scaling AI across functions.",
    duration: "2 days / month, 6+ months",
  },
  {
    name: "AI Workforce Programme",
    brand: "People X AI",
    blurb:
      "Build fluency across the whole organisation. Cohort-based, function-specific, with measurable outputs not just attendance.",
    duration: "8–12 weeks",
  },
];

interface Engagement {
  industry: string;
  size: string;
  pillars: string;
  result: string;
}

const ENGAGEMENTS: Engagement[] = [
  {
    industry: "Series B fintech",
    size: "80 people",
    pillars: "Workflow Integration · Tooling",
    result:
      "Rebuilt the underwriting workflow around a Claude agent and a continuous evals harness.",
  },
  {
    industry: "Climate platform",
    size: "180 people",
    pillars: "Data Foundations · Skills & Fluency",
    result:
      "Stood up an internal RAG layer over scientific data and trained four research squads to use it.",
  },
  {
    industry: "Vertical SaaS",
    size: "300 people",
    pillars: "Strategy & Mandate · Governance",
    result:
      "Wrote the AI mandate, named an owner per function, shipped an evals framework before any new spend.",
  },
];

export function StudioSection() {
  return (
    <section
      id="studio"
      className="relative section-y border-t border-cream/10"
    >
      <div className="container">
        {/* Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <p className="eyebrow mb-5">The Studio</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            We rebuild operating systems<br />
            <span className="italic text-brass-bright">around the model.</span>
          </h2>
          <p className="mt-6 font-display text-lg sm:text-xl text-cream/65 max-w-xl">
            Deepgrain is a small studio for companies that have decided AI is
            not a feature. AIOI is the diagnostic we use on day one of every
            engagement.
          </p>
        </div>

        {/* What we do */}
        <div className="mb-16 sm:mb-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 mb-6">
            What we do
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-cream/10 border border-cream/10 rounded-lg overflow-hidden">
            {SERVICES.map((s) => (
              <article
                key={s.name}
                className="bg-walnut p-6 sm:p-8 hover:bg-surface-1 transition-colors group flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cream/35">
                    {s.brand}
                  </span>
                </div>
                <h3 className="font-display text-2xl text-cream leading-snug mb-3 group-hover:text-brass-bright transition-colors">
                  {s.name}
                </h3>
                <p className="text-sm text-cream/70 leading-relaxed flex-1">
                  {s.blurb}
                </p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
                  {s.duration}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              asChild
              size="lg"
              className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] h-12 px-7"
            >
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4 mr-1" />
                Book a 30-min AIOI teardown
              </a>
            </Button>
            <a
              href="https://deepgrain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-cream/65 hover:text-brass-bright transition-colors group"
            >
              About the studio
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Who we do it for */}
        <div className="mb-16 sm:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">
              Who we do it for
            </p>
          </div>
          <div className="lg:col-span-7">
            <p className="font-display text-2xl sm:text-3xl text-cream/85 leading-snug text-balance">
              Organisations of <span className="text-cream">50 to 600 people</span>,
              at scaling stage, with active operating debt in at least one
              function. Most often: SaaS, fintech, climate, and platform
              businesses.
            </p>
          </div>
        </div>

        {/* Recent engagements */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 mb-6">
            Recent engagements
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cream/10 border border-cream/10 rounded-lg overflow-hidden">
            {ENGAGEMENTS.map((e, i) => (
              <article
                key={i}
                className="bg-walnut p-6 sm:p-8 hover:bg-surface-1 transition-colors"
              >
                <div className="flex items-baseline justify-between mb-4">
                  <p className="font-display text-lg text-cream leading-tight">
                    {e.industry}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream/45">
                    {e.size}
                  </span>
                </div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-brass-bright/85 mb-4">
                  {e.pillars}
                </p>
                <p className="text-sm text-cream/70 leading-relaxed">
                  {e.result}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
            Anonymised at client request · named case studies on request
          </p>
        </div>
      </div>
    </section>
  );
}
