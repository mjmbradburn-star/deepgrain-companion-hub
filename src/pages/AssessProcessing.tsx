import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssessChrome } from "@/components/aioi/AssessChrome";

const LINES = [
  "Reading 8 pillar responses…",
  "Mapping answers to maturity tiers…",
  "Computing weighted AIOI…",
  "Identifying hotspots (bottom-quartile pillars)…",
  "Cross-referencing benchmark cohort (n = 2,847)…",
  "Drafting plan: Month 1 / 2 / 3…",
  "Selecting interventions from outcomes library…",
  "Generating report copy…",
  "Rendering A4 one-pager…",
  "Sealing report. Sending magic link…",
];

export default function AssessProcessing() {
  const [shown, setShown] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      setShown((s) => [...s, LINES[i]]);
      i++;
      if (i >= LINES.length) {
        window.clearInterval(id);
        // Phase 3 will redirect to /assess/r/[slug]; for now hold on the log.
      }
    }, 650);
    return () => window.clearInterval(id);
  }, [navigate]);

  return (
    <AssessChrome ariaLabel="Building your report">
      <main className="container max-w-2xl w-full py-20 flex flex-col">
        <p className="eyebrow mb-5">Building your report</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight">
          Hold a moment.<br />
          <span className="italic text-brass-bright">We're doing the work.</span>
        </h1>

        <div className="mt-12 rounded-lg border border-cream/10 bg-surface-1/60 p-6 font-mono text-[13px] leading-relaxed text-cream/70 min-h-[360px]">
          {shown.map((line, i) => (
            <p key={i} className="animate-fade-in">
              <span className="text-brass-bright/70 mr-2">›</span>
              {line}
            </p>
          ))}
          {shown.length < LINES.length && (
            <p className="mt-1 text-cream/30">
              <span className="text-brass-bright/70 mr-2">›</span>
              <span className="inline-block w-2 h-4 align-middle bg-brass-bright/70 animate-pulse" />
            </p>
          )}
          {shown.length >= LINES.length && (
            <p className="mt-4 text-cream/50">
              <span className="text-brass-bright mr-2">✓</span>
              Report ready. Check your inbox for the magic link to view it.
            </p>
          )}
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/30">
          Results page coming in Phase 3 · Don't close this tab.
        </p>
      </main>
    </AssessChrome>
  );
}
