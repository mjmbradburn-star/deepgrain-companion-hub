import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { OptionCard } from "@/components/aioi/OptionCard";
import { PillarChip } from "@/components/aioi/PillarChip";
import { ProgressBar } from "@/components/aioi/ProgressBar";
import { Button } from "@/components/ui/button";
import {
  getQuestions,
  PILLAR_NAMES,
  loadDraft,
  saveDraft,
  type AssessmentDraft,
} from "@/lib/assessment";
import { pushAnswer } from "@/lib/sync";

export default function AssessQuestion() {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AssessmentDraft>(() => loadDraft());
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const questions = useMemo(() => getQuestions(draft.level, draft.qualifier?.function), [draft.level, draft.qualifier?.function]);
  const stepNum = Math.max(1, Math.min(questions.length, parseInt(step ?? "1", 10) || 1));
  const idx = stepNum - 1;

  // Guard: must have a level + email captured
  useEffect(() => {
    if (!draft.level) {
      navigate("/assess", { replace: true });
      return;
    }
    if (!draft.qualifier?.email) {
      navigate("/assess/start", { replace: true });
    }
  }, [draft.level, draft.qualifier?.email, navigate]);

  const question = questions[idx];
  const selected = question ? draft.answers[question.id] : undefined;

  const segments = useMemo(
    () =>
      questions.map((q, i) => ({
        pillar: q.pillar,
        filled: i <= idx && draft.answers[q.id] !== undefined,
      })),
    [idx, draft.answers, questions],
  );

  // Pillar grouping: where this question sits within its pillar.
  const pillarPosition = useMemo(() => {
    if (!question) return { index: 0, total: 0 };
    const inPillar = questions.filter((q) => q.pillar === question.pillar);
    const indexInPillar = inPillar.findIndex((q) => q.id === question.id) + 1;
    return { index: indexInPillar, total: inPillar.length };
  }, [question, questions]);

  const goTo = useCallback(
    (nextStep: number, dir: "forward" | "back") => {
      setDirection(dir);
      navigate(`/assess/q/${nextStep}`);
    },
    [navigate],
  );

  const select = useCallback(
    (tier: number) => {
      if (!question) return;
      const next = { ...draft, answers: { ...draft.answers, [question.id]: tier } };
      setDraft(next);
      saveDraft(next);
      // Stream to DB if signed-in (best-effort — local cache stays the source of truth)
      if (next.respondentId) {
        void pushAnswer(next.respondentId, question.id, tier);
      }
      // Auto-advance with a short delay for the visual ack
      window.setTimeout(() => {
        if (stepNum < questions.length) {
          goTo(stepNum + 1, "forward");
        } else {
          navigate("/assess/processing");
        }
      }, 280);
    },
    [draft, question, stepNum, goTo, navigate],
  );

  const goBack = useCallback(() => {
    if (stepNum > 1) goTo(stepNum - 1, "back");
    else navigate("/assess/start");
  }, [stepNum, goTo, navigate]);

  // Keyboard: 1–6 for options, ArrowLeft to go back, ArrowRight/Enter to advance if answered
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!question) return;
      // ignore when typing in inputs
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const tier = parseInt(e.key, 10) - 1;
        if (tier >= 0 && tier < question.options.length) select(question.options[tier].tier);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if ((e.key === "ArrowRight" || e.key === "Enter") && selected !== undefined) {
        e.preventDefault();
        if (stepNum < questions.length) goTo(stepNum + 1, "forward");
        else navigate("/assess/processing");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [question, selected, stepNum, select, goBack, goTo, navigate]);

  if (!question) return null;

  return (
    <AssessChrome
      step={stepNum}
      total={questions.length}
      back={{ to: "#", label: "Back" }}
      ariaLabel={`Question ${stepNum} of ${questions.length}`}
    >
      <main className="w-full flex flex-col">
        {/* Progress bar — full width under the chrome */}
        <div className="container pt-6">
          <ProgressBar
            segments={segments}
            currentPillar={question.pillar}
            currentPillarLabel={PILLAR_NAMES[question.pillar]}
          />
        </div>

        <div
          key={question.id}
          className={`container max-w-3xl flex-1 py-12 sm:py-16 ${
            direction === "forward" ? "animate-[fade-up_320ms_cubic-bezier(0.22,1,0.36,1)_both]" : "animate-fade-in"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-8">
            <PillarChip index={question.pillar} label={PILLAR_NAMES[question.pillar]} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/40">
              Question {stepNum} of {questions.length}
              <span className="mx-2 text-cream/20">·</span>
              {pillarPosition.index} of {pillarPosition.total} in pillar
            </span>
          </div>

          <h1 className="font-display headline-md text-cream text-balance">
            {question.prompt}
          </h1>

          <div className="mt-10 space-y-3">
            {question.options.map((opt, i) => (
              <OptionCard
                key={opt.label}
                index={i + 1}
                title={opt.label}
                description={opt.detail}
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
              Previous
            </button>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/30 hidden sm:inline">
                Press 1–6 · ← back · → next
              </span>
              {selected !== undefined && stepNum < questions.length && (
                <Button
                  size="sm"
                  onClick={() => goTo(stepNum + 1, "forward")}
                  className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {selected !== undefined && stepNum === questions.length && (
                <Button
                  size="sm"
                  onClick={() => navigate("/assess/processing")}
                  className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                >
                  Build my report <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </AssessChrome>
  );
}
