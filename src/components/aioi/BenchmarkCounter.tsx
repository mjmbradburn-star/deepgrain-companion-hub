import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyBenchmark {
  median_score: number | null;
  pillar_medians: Record<string, { name: string; tier: number }> | null;
}

const PILLAR_NAMES: Record<string, string> = {
  "1": "Strategy & Mandate",
  "2": "Data Foundations",
  "3": "Tooling & Infrastructure",
  "4": "Workflow Integration",
  "5": "Skills & Fluency",
  "6": "Governance & Risk",
  "7": "Measurement & ROI",
  "8": "Culture & Adoption",
};

const tierLabel = (t: number): string => {
  const labels = ["Dormant", "Exploring", "Deployed", "Integrated", "Leveraged", "AI-Native"];
  return labels[Math.max(0, Math.min(5, Math.round(t)))];
};

export function BenchmarkCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [bench, setBench] = useState<CompanyBenchmark | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: countData }, { data: benchData }] = await Promise.all([
        supabase.rpc("get_assessment_count"),
        supabase
          .from("benchmarks_materialised")
          .select("median_score, pillar_medians, sample_size")
          .eq("level", "company")
          .is("size_band", null)
          .is("sector", null)
          .is("function", null)
          .is("region", null)
          .order("sample_size", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (typeof countData === "number") setCount(countData);
      if (benchData) {
        const row = benchData as unknown as { median_score: number | null; pillar_medians: CompanyBenchmark["pillar_medians"] };
        setBench({
          median_score: row.median_score ?? null,
          pillar_medians: row.pillar_medians,
        });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Find the lowest-tier pillar (the most painful one).
  let weakestPillar: { key: string; tier: number; name: string } | null = null;
  if (bench?.pillar_medians) {
    for (const [key, val] of Object.entries(bench.pillar_medians)) {
      if (!val || typeof val.tier !== "number") continue;
      if (!weakestPillar || val.tier < weakestPillar.tier) {
        weakestPillar = { key, tier: val.tier, name: val.name ?? PILLAR_NAMES[key] ?? `Pillar ${key}` };
      }
    }
  }

  const haveCount = count !== null && count > 0;
  const haveScore = bench?.median_score !== null && bench?.median_score !== undefined;
  const isEarlySignal = (count ?? 0) < 500;

  return (
    <section
      className="relative section-y border-t border-b border-brass/20"
      style={{ backgroundColor: "hsl(150 55% 8%)" }}
    >
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-4">
        {/* Real assessment count */}
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">
            {isEarlySignal ? "Early signal" : "Live benchmark"}
          </p>
          <p className="font-display text-5xl sm:text-6xl text-brass-bright tabular-nums">
            {haveCount ? count!.toLocaleString() : "—"}
          </p>
          <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">
            {haveCount
              ? isEarlySignal
                ? `assessment${count === 1 ? "" : "s"} so far`
                : "assessments completed"
              : "be the first to take it"}
          </p>
        </div>

        {/* Median AIOI — only render when the materialised view has a company-level row */}
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">
            Median AIOI
          </p>
          {haveScore ? (
            <>
              <p className="font-display text-5xl sm:text-6xl text-brass-bright tabular-nums">
                {Math.round(bench!.median_score!)}
                <span className="text-brass/50 text-2xl sm:text-3xl ml-1">/100</span>
              </p>
              <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">
                Most companies are{" "}
                <span className="text-brass-bright">
                  {tierLabel((bench!.median_score! / 100) * 5)}
                </span>
                .
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-5xl sm:text-6xl text-brass/40 tabular-nums">—</p>
              <p className="mt-2 font-display italic text-base sm:text-lg text-brass/60">
                Cohort median publishes once we cross five completed company-level assessments.
              </p>
            </>
          )}
        </div>

        {/* Most painful pillar — only render when we have a real cohort */}
        <div>
          <p className="font-ui uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[11px] sm:text-xs text-brass-bright mb-3">
            Most painful pillar
          </p>
          {weakestPillar ? (
            <>
              <p className="font-display text-5xl sm:text-6xl text-brass-bright">
                P{weakestPillar.key}
              </p>
              <p className="mt-2 font-display italic text-base sm:text-lg text-brass/80">
                {weakestPillar.name}. By a long way.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-5xl sm:text-6xl text-brass/40">—</p>
              <p className="mt-2 font-display italic text-base sm:text-lg text-brass/60">
                Pillar-level cohort medians publish once the sample is large enough.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
