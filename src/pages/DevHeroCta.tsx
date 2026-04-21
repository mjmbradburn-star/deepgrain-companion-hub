/**
 * Dev-only QA harness for the hero CTA row.
 *
 * Renders the same CTA markup at iPhone widths (375 / 390 / 430) inside fixed-
 * width frames with a baseline overlay, so a designer can eyeball that the
 * button height, label baseline, and supporting links sit on the same vertical
 * positions across viewports.
 *
 * Mounted at /dev/hero-cta only when import.meta.env.DEV is true (404 in
 * production builds).
 */
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const WIDTHS = [375, 390, 430] as const;

function CtaRow() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <Button
        asChild
        size="lg"
        className="h-14 sm:h-12 px-7 rounded-sm font-ui text-sm tracking-wider uppercase w-full sm:w-auto inline-flex items-center justify-center gap-2 leading-none shrink-0"
      >
        <a href="/assess">
          <span>3-minute AI maturity scan</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
      </Button>
      <a
        href="/pillars"
        className="font-ui text-sm text-cream/70 hover:text-cream underline-offset-4 hover:underline transition-colors text-center sm:text-left leading-none py-1"
      >
        See the eight pillars
      </a>
      <span className="sm:ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45 text-center sm:text-right leading-none">
        ~3 min · 8 questions · no email
      </span>
    </div>
  );
}

function Frame({ width }: { width: number }) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
        iPhone · {width}px
      </figcaption>
      <div
        className="relative bg-walnut border border-cream/15 shadow-sm overflow-hidden"
        style={{ width: `${width}px` }}
      >
        {/* Baseline guides — every 8px so vertical drift is visible at a glance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, hsl(var(--brass) / 0.25) 0 1px, transparent 1px 8px)",
          }}
        />
        <div className="relative px-6 py-8" data-testid={`cta-frame-${width}`}>
          <CtaRow />
        </div>
      </div>
    </figure>
  );
}

export default function DevHeroCta() {
  if (!import.meta.env.DEV) {
    return (
      <main className="min-h-screen grid place-items-center bg-walnut text-cream">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cream/55">
          404 · Dev-only route
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-walnut text-cream py-12 px-6 sm:px-12">
      <header className="max-w-3xl mb-10">
        <p className="eyebrow mb-3">Dev · QA harness</p>
        <h1 className="font-display text-3xl sm:text-5xl leading-tight">
          Hero CTA · cross-iPhone alignment
        </h1>
        <p className="mt-4 font-ui text-sm text-cream/70 max-w-prose">
          Three frames render the live CTA markup at common iPhone widths. The
          horizontal brass guides are an 8&nbsp;px baseline grid — the button
          top edge, label baseline, and supporting links should sit on the same
          guides across all three frames. Resize the browser to verify desktop.
        </p>
      </header>

      <section className="flex flex-wrap gap-10 items-start">
        {WIDTHS.map((w) => (
          <Frame key={w} width={w} />
        ))}
      </section>

      <footer className="mt-16 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">
        Visible only in development · {new Date().toISOString().slice(0, 10)}
      </footer>
    </main>
  );
}
