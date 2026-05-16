import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { LEVELS, type Level, loadDraft, saveDraft } from "@/lib/assessment";
import { trackEvent } from "@/lib/analytics";
import { loadScan, saveScan } from "@/lib/quickscan";
import { applicationJsonLd, breadcrumbJsonLd, seoRoutes } from "@/lib/seo";
import { useEffect } from "react";

const ORDER: Level[] = ["company", "function", "individual"];

// Updated time copy — the default flow is now the 60-second archetype scan.
const SCAN_TIME = "~60 sec";

export default function Assess() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("assess_page_viewed");
  }, []);

  const choose = (level: Level) => {
    trackEvent("assessment_level_selected", { level }, { optional: true });
    // Keep both stores in sync so legacy resume + new scan work side-by-side.
    const draft = loadDraft();
    saveDraft({ ...draft, level, startedAt: draft.startedAt ?? new Date().toISOString() });
    const scan = loadScan();
    saveScan({ ...scan, level, startedAt: scan.startedAt ?? new Date().toISOString() });
    navigate("/assess/scan");
  };

  return (
    <AssessChrome back={{ to: "/", label: "Home" }} ariaLabel="Choose assessment level">
      <Seo {...seoRoutes.assess} jsonLd={[applicationJsonLd(), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Assessment", path: "/assess" }])]} />
      <main className="container py-16 sm:py-24 w-full">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-end mb-12 sm:mb-16 animate-fade-up">
          <div className="max-w-3xl">
          <p className="eyebrow mb-5">Step 01 · Choose your level · 60-second scan</p>
          <h1 className="font-display text-5xl sm:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            Find your<br />
            <span className="italic text-brass-bright">AI Operating Archetype.</span>
          </h1>
          <p className="mt-6 font-display text-xl text-cream/65 max-w-xl">
            A free 3-question archetype scan for companies, functions and individuals. One minute to discover how your team handles work, where the bottleneck is, and what to change first.
          </p>
          <p className="mt-4 font-display text-base text-cream/55 max-w-xl leading-relaxed">
            No email required. Get your result instantly.
          </p>
          </div>

          <section aria-label="What you get" className="rounded-sm border border-cream/10 bg-surface-1/55 p-5 sm:p-6">
            <p className="eyebrow mb-4 text-cream/45">What you get</p>
            <ul className="space-y-4">
              {[
                "Your AI Operating Archetype — one of five profiles.",
                "A clear read on how your team handles work, bottlenecks and technology.",
                "A leverage point: the one thing to change first for the biggest impact.",
              ].map((item) => (
                <li key={item} className="flex gap-3 font-display text-base leading-relaxed text-cream/75">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brass-bright" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3 border-t border-cream/10 pt-5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass-bright" aria-hidden />
              <p className="font-ui text-sm leading-relaxed text-cream/60">
                Your answers are used to generate your report. Benchmark contribution is aggregated and consent-led; personal report routes stay non-indexed.
              </p>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ORDER.map((key, i) => {
            const l = LEVELS[key];
            return (
              <button
                key={key}
                onClick={() => choose(key)}
                className="group relative text-left rounded-lg border border-cream/10 bg-surface-1/60 p-7 hover:border-brass hover:bg-surface-1 transition-all duration-200 flex flex-col min-h-[320px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-walnut animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright/80">
                    Level 0{i + 1}
                  </span>
                  <span className="font-mono text-xs text-cream/40">{SCAN_TIME}</span>
                </div>
                <h2 className="font-display text-3xl text-cream leading-tight mb-2">{l.title}</h2>
                <p className="font-display italic text-xl text-cream/60 mb-6">{l.tagline}</p>
                <div className="mt-auto pt-6 flex items-center justify-between border-t border-cream/10">
                  <span className="font-ui text-xs text-cream/40">{l.audience}</span>
                  <span className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-brass-bright group-hover:gap-3 transition-all">
                    Start scan <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base text-cream/65">
            Choose the closest lens. You can still compare your result against broader archetypes after the scan.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/40">
            3 answers · ~60 sec · no email required
          </p>
        </div>
      </main>
    </AssessChrome>
  );
}
