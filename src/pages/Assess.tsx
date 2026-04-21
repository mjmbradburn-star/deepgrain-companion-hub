import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { LEVELS, type Level, loadDraft, saveDraft } from "@/lib/assessment";
import { loadScan, saveScan } from "@/lib/quickscan";

const ORDER: Level[] = ["company", "function", "individual"];

// Updated time copy — the default flow is now the 3-minute scan.
const SCAN_TIME = "~3 min";

export default function Assess() {
  const navigate = useNavigate();

  const choose = (level: Level) => {
    // Keep both stores in sync so legacy resume + new scan work side-by-side.
    const draft = loadDraft();
    saveDraft({ ...draft, level, startedAt: draft.startedAt ?? new Date().toISOString() });
    const scan = loadScan();
    saveScan({ ...scan, level, startedAt: scan.startedAt ?? new Date().toISOString() });
    navigate("/assess/scan");
  };

  return (
    <AssessChrome back={{ to: "/", label: "Home" }} ariaLabel="Choose assessment level">
      <main className="container py-16 sm:py-24 w-full">
        <div className="max-w-3xl mb-14 animate-fade-up">
          <p className="eyebrow mb-5">Step 01 — Choose your level · 3-minute scan</p>
          <h1 className="font-display text-5xl sm:text-6xl text-cream leading-[1.05] tracking-tight text-balance">
            What are we<br />
            <span className="italic text-brass-bright">measuring?</span>
          </h1>
          <p className="mt-6 font-display text-xl text-cream/65 max-w-xl">
            Pick the lens. Eight questions, one per pillar — score on screen in three minutes. The deeper write-up unlocks after.
          </p>
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
                    Begin <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </AssessChrome>
  );
}
