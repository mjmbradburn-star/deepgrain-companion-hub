import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { OptionCard } from "@/components/aioi/OptionCard";
import { PillarChip } from "@/components/aioi/PillarChip";
import { ProgressBar } from "@/components/aioi/ProgressBar";
import { Button } from "@/components/ui/button";
import {
  PILLAR_NAMES,
  FUNCTIONS,
  REGIONS,
  loadDraft,
  type BusinessFunction,
  type Level,
  type Region,
} from "@/lib/assessment";
import {
  getQuickscanQuestions,
  loadScan,
  saveScan,
  clearScan,
} from "@/lib/quickscan";
import { supabase } from "@/integrations/supabase/client";

const VALID_LEVELS: Level[] = ["company", "function", "individual"];

export default function AssessScan() {
  const navigate = useNavigate();

  // Resolve level from the previous picker (or fall back to function-level).
  const initialScan = loadScan();
  const draftLevel = initialScan.level ?? loadDraft().level;
  const level: Level = draftLevel && VALID_LEVELS.includes(draftLevel) ? draftLevel : "function";

  const [fn, setFn] = useState<BusinessFunction | undefined>(initialScan.function);
  const [region, setRegion] = useState<Region | undefined>(initialScan.region as Region | undefined);
  const [answers, setAnswers] = useState<Record<string, number>>(initialScan.answers ?? {});
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<Record<string, number> | null>(null);

  // Persist + recompute prompts whenever function changes (level-=function only).
  const questions = useMemo(
    () => getQuickscanQuestions(level, level === "function" ? fn : undefined),
    [level, fn],
  );

  // Persist on every meaningful change
  useEffect(() => {
    saveScan({ level, function: fn, region, answers, startedAt: initialScan.startedAt ?? new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, fn, region, answers]);

  // Telemetry: scan started
  useEffect(() => {
    void supabase.from("events").insert({ name: "quickscan_started", payload: { level } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = step - 1;
  const question = questions[idx];
  const selected = question ? answers[question.id] : undefined;

  const segments = useMemo(
    () =>
      questions.map((q, i) => ({
        pillar: q.pillar,
        filled: i <= idx && answers[q.id] !== undefined,
      })),
    [idx, answers, questions],
  );

  const submit = useCallback(
    async (finalAnswers: Record<string, number>) => {
      setSubmitting(true);
      try {
        const payload = {
          level,
          function: level === "function" ? fn ?? null : null,
          region: region ?? null,
          answers: questions.map((q) => ({
            question_id: q.id,
            tier: finalAnswers[q.id],
          })).filter((a) => typeof a.tier === "number"),
        };
        const { data, error } = await supabase.functions.invoke("submit-quickscan", {
          body: payload,
        });
        if (error || !data?.slug) {
          console.error("[scan] submit failed", error, data);
          setSubmitting(false);
          return;
        }
        saveScan({ ...loadScan(), slug: data.slug });
        clearScan();
        navigate(`/assess/r/${data.slug}`);
      } catch (err) {
        console.error("[scan] submit threw", err);
        setSubmitting(false);
      }
    },
    [level, fn, region, questions, navigate],
  );

  const select = useCallback(
    (tier: number) => {
      if (!question) return;
      const next = { ...answers, [question.id]: tier };
      setAnswers(next);
      window.setTimeout(() => {
        if (step < questions.length) {
          setDirection("forward");
          setStep(step + 1);
        } else {
          void submit(next);
        }
      }, 220);
    },
    [answers, question, step, questions.length, submit],
  );

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection("back");
      setStep(step - 1);
    } else {
      navigate("/assess");
    }
  }, [step, navigate]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!question) return;
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const tier = parseInt(e.key, 10) - 1;
        if (tier >= 0 && tier < question.options.length) select(question.options[tier].tier);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if ((e.key === "ArrowRight" || e.key === "Enter") && selected !== undefined) {
        e.preventDefault();
        if (step < questions.length) {
          setDirection("forward");
          setStep(step + 1);
        } else {
          void submit(answers);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [question, selected, step, questions.length, select, goBack, submit, answers]);

  if (submitting) {
    return (
      <AssessChrome ariaLabel="Building your report">
        <main className="container flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brass mx-auto" />
            <p className="mt-6 font-display text-2xl text-cream/85">Scoring your scan…</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              A few seconds.
            </p>
          </div>
        </main>
      </AssessChrome>
    );
  }

  if (!question) return null;

  return (
    <AssessChrome
      step={step}
      total={questions.length}
      back={{ to: "/assess", label: "Level" }}
      ariaLabel={`Quickscan question ${step} of ${questions.length}`}
    >
      <main className="w-full flex flex-col">
        <div className="container pt-6">
          <ProgressBar
            segments={segments}
            currentPillar={question.pillar}
            currentPillarLabel={PILLAR_NAMES[question.pillar]}
          />
        </div>

        <div
          key={question.id}
          className={`container max-w-3xl flex-1 py-10 sm:py-14 ${
            direction === "forward"
              ? "animate-[fade-up_320ms_cubic-bezier(0.22,1,0.36,1)_both]"
              : "animate-fade-in"
          }`}
        >
          {/* Inline picker on Q1 — function (function-level only) + region.
              Skippable; both default to "—". */}
          {step === 1 && (
            <div className="mb-10 rounded-md border border-cream/10 bg-surface-1/50 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {level === "function" && (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
                    Function (optional)
                  </span>
                  <select
                    value={fn ?? ""}
                    onChange={(e) => setFn((e.target.value || undefined) as BusinessFunction | undefined)}
                    className="mt-2 w-full rounded-sm bg-surface-0 border border-cream/15 text-cream font-ui text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                  >
                    <option value="">— Skip</option>
                    {FUNCTIONS.map((f) => (
                      <option key={f.id} value={f.id}>{f.title}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className={`block ${level !== "function" ? "sm:col-span-2" : ""}`}>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
                  Region (optional — sharpens the benchmark)
                </span>
                <select
                  value={region ?? ""}
                  onChange={(e) => setRegion((e.target.value || undefined) as Region | undefined)}
                  className="mt-2 w-full rounded-sm bg-surface-0 border border-cream/15 text-cream font-ui text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                >
                  <option value="">— Skip</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-7">
            <PillarChip index={question.pillar} label={PILLAR_NAMES[question.pillar]} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40">
              Question {step} of {questions.length}
            </span>
          </div>

          <h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.08] text-cream tracking-tight text-balance">
            {question.prompt}
          </h1>

          <div className="mt-9 space-y-3">
            {question.options.map((opt, i) => (
              <OptionCard
                key={opt.label}
                index={i + 1}
                title={opt.label}
                selected={selected === opt.tier}
                onClick={() => select(opt.tier)}
              />
            ))}
          </div>

          <div className="mt-12 flex items-center justify-between">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.16em] text-cream/50 hover:text-cream transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {step === 1 ? "Choose level" : "Previous"}
            </button>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/30 hidden sm:inline">
                Press 1–6 · ← back · → next
              </span>
              {selected !== undefined && step < questions.length && (
                <Button
                  size="sm"
                  onClick={() => { setDirection("forward"); setStep(step + 1); }}
                  className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {selected !== undefined && step === questions.length && (
                <Button
                  size="sm"
                  onClick={() => void submit(answers)}
                  className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                >
                  See my score <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </AssessChrome>
  );
}
