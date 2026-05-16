import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { OptionCard } from "@/components/aioi/OptionCard";
import { StepDots } from "@/components/aioi/StepDots";
import { Button } from "@/components/ui/button";
import {
  getQuickscanQuestions,
  loadScan,
  saveScan,
  clearScan,
  calculateArchetype,
} from "@/lib/quickscan";
import { trackEvent } from "@/lib/analytics";
import { seoRoutes } from "@/lib/seo";

export default function AssessScan() {
  const navigate = useNavigate();

  const initialScan = loadScan();
  const level = initialScan.level ?? "company";

  const [answers, setAnswers] = useState<Record<string, number>>(initialScan.answers ?? {});
  const questions = getQuickscanQuestions();
  const [step, setStep] = useState(() => {
    const restored = initialScan.answers ?? {};
    const firstUnanswered = questions.findIndex((q) => restored[q.id] === undefined);
    if (firstUnanswered === -1) return Math.max(1, questions.length);
    return firstUnanswered + 1;
  });
  const [resumed] = useState(() => Object.keys(initialScan.answers ?? {}).length > 0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);

  // Persist on every meaningful change
  useEffect(() => {
    saveScan({ level, answers, startedAt: initialScan.startedAt ?? new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, answers]);

  // Telemetry: scan started or resumed
  useEffect(() => {
    if (resumed) {
      trackEvent("quickscan_resumed", { level, answeredCount: Object.keys(answers).length });
    } else {
      trackEvent("quickscan_started", { level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Telemetry: abandon detection
  useEffect(() => {
    const handler = () => {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < questions.length) {
        trackEvent("quickscan_abandoned", { level, answeredCount, totalQuestions: questions.length });
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, level, questions.length]);

  const idx = step - 1;
  const question = questions[idx];
  const selected = question ? answers[question.id] : undefined;

  const submit = useCallback(
    async (finalAnswers: Record<string, number>) => {
      setSubmitting(true);
      const archetypeIndex = calculateArchetype(finalAnswers);
      await new Promise((r) => setTimeout(r, 400));
      clearScan();
      // Store for result page auto-save
      localStorage.setItem("dg:archetype:last-answers", JSON.stringify(finalAnswers));
      localStorage.setItem("dg:archetype:last-level", level);
      trackEvent("quickscan_completed", { level, archetype: archetypeIndex });
      navigate(`/assess/result?a=${archetypeIndex}`);
    },
    [level, navigate],
  );

  const select = useCallback(
    (optionIndex: number) => {
      if (!question) return;
      trackEvent("quickscan_question_answered", {
        questionId: question.id,
        questionNumber: step,
        optionIndex,
        optionLabel: question.options[optionIndex]?.label,
      });
      const next = { ...answers, [question.id]: optionIndex };
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
    trackEvent("quickscan_back_clicked", { fromQuestion: step });
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
      if (submitting) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!question) return;
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const optionIndex = parseInt(e.key, 10) - 1;
        if (optionIndex >= 0 && optionIndex < question.options.length) select(optionIndex);
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
  }, [question, selected, step, questions.length, select, goBack, submit, answers, submitting]);

  if (submitting) {
    return (
      <AssessChrome ariaLabel="Building your result">
        <Seo {...seoRoutes.flow} path="/assess/scan" />
        <main className="container flex-1 flex items-center justify-center py-24">
          <div className="text-center max-w-md">
            <Loader2 className="h-6 w-6 animate-spin text-brass mx-auto" />
            <p className="mt-6 font-display text-2xl text-cream/85">Finding your archetype...</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">Just a moment.</p>
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
      <Seo {...seoRoutes.flow} path="/assess/scan" />
      <main className="w-full flex flex-col">
        <div
          key={question.id}
          className={`container max-w-3xl flex-1 py-8 sm:py-14 ${
            direction === "forward"
              ? "animate-[fade-up_320ms_cubic-bezier(0.22,1,0.36,1)_both]"
              : "animate-fade-in"
          }`}
        >
          {/* Resume banner */}
          {resumed && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-brass/30 bg-brass/5 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright/85">
                Picked up where you left off · {Object.keys(answers).length} of {questions.length} answered
              </span>
              <button
                type="button"
                onClick={() => {
                  trackEvent("quickscan_restart_clicked", { answeredCount: Object.keys(answers).length });
                  if (typeof window !== "undefined" && !window.confirm("Clear your saved answers and start the scan over?")) return;
                  clearScan();
                  setAnswers({});
                  setStep(1);
                  setDirection("forward");
                }}
                className="font-ui text-[11px] uppercase tracking-[0.16em] text-cream/55 hover:text-cream"
              >
                Start over
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-7">
            <StepDots step={step} total={questions.length} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40">
              {step} / {questions.length}
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
                selected={selected === i}
                onClick={() => select(i)}
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
                Press 1–5 · ← back · → next
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
                  See my archetype <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </AssessChrome>
  );
}
