import { ArrowRight, ArrowUpRight, Calendar, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_URL } from "@/lib/booking";

interface Props {
  /** Compact variant: tighter padding, no border container — for inline use. */
  variant?: "section" | "compact";
}

/**
 * Founder bio block. Appears above lead-capture surfaces (foot of the Studio
 * section, foot of the report) to lend gravitas before the ask.
 *
 * Build brief §5.1.4. Matches Deepgrain design language: walnut surface,
 * brass accents, display serif headline, mono eyebrow.
 *
 * Photo: portrait at /matt-bradburn.jpg with graceful initials fallback.
 */
export function FounderBio({ variant = "section" }: Props) {
  if (variant === "compact") {
    return (
      <div className="container max-w-6xl py-12 sm:py-16 border-t border-cream/10">
        <BioBody />
      </div>
    );
  }

  return (
    <section className="relative section-y border-t border-cream/10">
      <div className="container">
        <BioBody />
      </div>
    </section>
  );
}

function BioBody() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
      {/* Portrait */}
      <div className="lg:col-span-4">
        <p className="eyebrow mb-5">The Author</p>
        <div className="relative aspect-[4/5] max-w-[280px] overflow-hidden rounded-sm border border-cream/10 bg-surface-1">
          <img
            src="/matt-bradburn.jpg"
            alt="Matt Bradburn, founder of Deepgrain and People X AI"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              // Hide broken image; initials fallback below shows through.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Initials fallback — sits behind the img, visible if onError fires. */}
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-display text-[96px] text-brass/40 leading-none"
          >
            MB
          </div>
        </div>
        <div className="mt-5 space-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
          <p>Matt Bradburn</p>
          <p>Founder · Deepgrain &amp; People X AI</p>
        </div>
      </div>

      {/* Bio copy */}
      <div className="lg:col-span-7 lg:col-start-6">
        <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-[1.05] tracking-tight text-balance">
          Built by an operator,<br />
          <span className="italic text-brass-bright">not a slide deck.</span>
        </h3>

        <div className="mt-6 sm:mt-8 space-y-5 font-display text-lg sm:text-xl text-cream/75 leading-snug">
          <p>
            Matt Bradburn runs Deepgrain and People X AI. He builds AI operating
            systems for companies between 50 and 600 people.
          </p>
          <p className="text-cream/60">
            He previously founded and exited People Collective, and has shipped
            AI enablement and build work across SaaS, fintech, climate, and
            platform businesses. AIOI is the diagnostic he uses on day one of
            every engagement.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="https://www.linkedin.com/in/mattbradburn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-cream/70 hover:text-brass-bright transition-colors group"
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <a
            href="mailto:matt@deepgrain.ai"
            className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-cream/70 hover:text-brass-bright transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            matt@deepgrain.ai
          </a>
          <a
            href="https://deepgrain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.18em] text-cream/45 hover:text-cream transition-colors group ml-auto"
          >
            deepgrain.ai
            <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Bio → CTA rail. Sits flush under the bio so the credibility frame
          flows directly into the ask. One eyebrow, one line, one button. */}
      <div className="lg:col-span-12 mt-10 sm:mt-14 pt-8 sm:pt-10 border-t border-cream/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <div className="lg:col-span-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/85 mb-3">
              Talk to Matt directly
            </p>
            <p className="font-display text-xl sm:text-2xl text-cream/90 leading-snug text-balance">
              Thirty minutes, no pitch deck. Bring your AIOI score and we'll
              walk through the two pillars worth fixing first
              <span className="text-brass-bright">.</span>
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Button
              asChild
              size="lg"
              className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] h-12 px-7 w-full sm:w-auto"
            >
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4 mr-1" />
                Book a 30-min teardown
                <ArrowRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cream/40 text-right">
              Google Calendar · responds within 24h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
