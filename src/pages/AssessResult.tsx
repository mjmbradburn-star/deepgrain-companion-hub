import { useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowRight, RotateCcw, Calendar, ArrowUpRight, Printer } from "lucide-react";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { ARCHETYPES, getArchetype, type ArchetypeIndex } from "@/lib/archetypes";
import { trackEvent } from "@/lib/analytics";
import { seoRoutes } from "@/lib/seo";

export default function AssessResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("a");
  const num = raw ? parseInt(raw, 10) : NaN;
  const idx: ArchetypeIndex | null = !isNaN(num) && num >= 0 && num <= 4 ? (num as ArchetypeIndex) : null;
  const archetype = idx !== null ? getArchetype(idx) : null;

  useEffect(() => {
    if (archetype) {
      trackEvent("archetype_result_viewed", { archetype: archetype.index });
    }
  }, [archetype]);

  if (!archetype) {
    return (
      <AssessChrome back={{ to: "/assess", label: "Assessment" }} ariaLabel="Result not found">
        <Seo {...seoRoutes.notFound} />
        <main className="container py-16 sm:py-24 w-full text-center">
          <h1 className="font-display text-3xl text-cream">Result not found.</h1>
          <p className="mt-4 font-display text-cream/60">Take the scan to discover your AI Operating Archetype.</p>
          <Link to="/assess" className="mt-8 inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-6 py-3 font-ui text-sm uppercase tracking-wider">
            Start the scan <ArrowRight className="h-4 w-4" />
          </Link>
        </main>
      </AssessChrome>
    );
  }

  return (
    <AssessChrome back={{ to: "/assess", label: "Assessment" }} ariaLabel={`Your archetype: ${archetype.name}`}>
      <Seo title={`${archetype.name} — AI Operating Archetype | AIOI`} description={archetype.definition} path="/assess/result" noindex />

      {/* ─── Screen result ─────────────────────────────────────────────── */}
      <main className="container py-12 sm:py-20 w-full print:hidden">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="eyebrow mb-0">Your AI Operating Archetype</p>
            <button
              onClick={() => {
                trackEvent("archetype_print_clicked");
                window.print();
              }}
              className="inline-flex items-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-4 py-2 font-ui text-xs uppercase tracking-wider transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </button>
          </div>

          <h1 className={`font-display text-5xl sm:text-6xl ${archetype.colour}`}>{archetype.name}</h1>
          <p className="mt-2 font-display italic text-2xl text-cream/70">{archetype.tagline}</p>

          <div className="mt-10 space-y-10">
            <section>
              <h2 className="font-display text-xl text-cream mb-3">What this means</h2>
              <p className="font-display text-base text-cream/80 leading-relaxed">{archetype.definition}</p>
            </section>

            <section>
              <h2 className="font-display text-xl text-cream mb-3">Why it matters</h2>
              <p className="font-display text-base text-cream/80 leading-relaxed">{archetype.whyItMatters}</p>
            </section>

            <section>
              <h2 className="font-display text-xl text-cream mb-3">Your leverage point</h2>
              <p className="font-display text-base text-cream/80 leading-relaxed">{archetype.leveragePoint}</p>
            </section>

            <section>
              <h2 className="font-display text-xl text-cream mb-3">What good looks like</h2>
              <p className="font-display text-base text-cream/80 leading-relaxed">{archetype.whatGoodLooksLike}</p>
            </section>
          </div>

          {/* CTA funnel */}
          <div className="mt-14 pt-10 border-t border-cream/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                trackEvent("archetype_retake_clicked");
                navigate("/assess/scan");
              }}
              className="flex items-center justify-center gap-2 rounded-sm border border-cream/15 text-cream hover:bg-cream/5 px-5 py-3 font-ui text-xs uppercase tracking-wider transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Retake scan
            </button>
            <a
              href="https://calendar.app.google/ausCRKN9p2jSXEk3A"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("archetype_book_call_clicked")}
              className="flex items-center justify-center gap-2 rounded-sm bg-brass text-walnut hover:bg-brass-bright px-5 py-3 font-ui text-xs uppercase tracking-wider transition-colors"
            >
              <Calendar className="h-4 w-4" /> Book a call
            </a>
            <a
              href="https://deepgrain.ai"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("archetype_deepgrain_clicked")}
              className="flex items-center justify-center gap-2 rounded-sm border border-cream/15 text-cream hover:bg-cream/5 px-5 py-3 font-ui text-xs uppercase tracking-wider transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" /> Deepgrain
            </a>
          </div>

          {/* Other archetypes teaser */}
          <div className="mt-14 pt-10 border-t border-cream/10">
            <p className="eyebrow mb-6">The other archetypes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ARCHETYPES.filter((a) => a.index !== archetype.index).map((a) => (
                <button
                  key={a.index}
                  onClick={() => {
                    trackEvent("archetype_other_profile_viewed", { archetype: a.index });
                    navigate(`/assess/result?a=${a.index}`);
                  }}
                  className="text-left rounded-sm border border-cream/10 bg-surface-1/30 p-5 hover:border-cream/20 transition-colors"
                >
                  <p className={`font-display text-lg ${a.colour}`}>{a.name}</p>
                  <p className="mt-1 font-display italic text-sm text-cream/55">{a.tagline}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ─── Print-only A4 one-pager ───────────────────────────────────── */}
      <section className="hidden print:block">
        <article
          className="bg-cream text-walnut p-12"
          style={{ aspectRatio: "1 / 1.414", minHeight: "100vh" }}
        >
          {/* Masthead */}
          <header className="flex items-baseline justify-between border-b border-walnut/15 pb-4 mb-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55">
                AI Operating Index
              </p>
              <h1 className="font-display text-3xl text-walnut leading-tight mt-1">
                AI Operating Archetype
              </h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55">
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </header>

          {/* Archetype header */}
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-walnut/55 mb-2">
              Your archetype
            </p>
            <h2 className="font-display text-4xl text-walnut leading-tight">{archetype.name}</h2>
            <p className="font-display italic text-xl text-walnut/70 mt-1">{archetype.tagline}</p>
          </div>

          {/* Body */}
          <div className="space-y-6">
            <section>
              <h3 className="font-display text-lg text-walnut mb-2">What this means</h3>
              <p className="font-display text-sm text-walnut/80 leading-relaxed">{archetype.definition}</p>
            </section>

            <section>
              <h3 className="font-display text-lg text-walnut mb-2">Why it matters</h3>
              <p className="font-display text-sm text-walnut/80 leading-relaxed">{archetype.whyItMatters}</p>
            </section>

            <section>
              <h3 className="font-display text-lg text-walnut mb-2">Your leverage point</h3>
              <p className="font-display text-sm text-walnut/80 leading-relaxed">{archetype.leveragePoint}</p>
            </section>

            <section>
              <h3 className="font-display text-lg text-walnut mb-2">What good looks like</h3>
              <p className="font-display text-sm text-walnut/80 leading-relaxed">{archetype.whatGoodLooksLike}</p>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-auto pt-8 border-t border-walnut/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm text-walnut">deepgrain.ai</p>
                <p className="font-mono text-[10px] text-walnut/50 mt-1">
                  AI-first People Operations consultancy
                </p>
              </div>
              <p className="font-mono text-[10px] text-walnut/50">
                Generated by the AI Operating Index
              </p>
            </div>
          </footer>
        </article>
      </section>
    </AssessChrome>
  );
}
