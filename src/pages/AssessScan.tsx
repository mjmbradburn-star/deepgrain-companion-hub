import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ErrorKind = "timeout" | "offline" | "network" | "server" | "validation" | "unknown";
interface SubmitError {
  kind: ErrorKind;
  title: string;
  detail: string;
  hint: string;
}

const SUBMIT_TIMEOUT_MS = 25_000;

/**
 * Classify a submit failure into something we can speak about plainly.
 *
 * The supabase-js `functions.invoke` call surfaces three meaningfully
 * different shapes: a `FunctionsHttpError` for non-2xx responses (the
 * function ran but returned an error), a `FunctionsRelayError` when the
 * gateway can't reach the function, and a `FunctionsFetchError` when the
 * fetch itself fails. We also handle our own `AbortError` (timeout) and
 * the browser's `navigator.onLine` flag for offline detection.
 */
function classifyError(err: unknown, ctx: { offline: boolean; payloadError?: string }): SubmitError {
  // 1. Server returned a structured error from the function body
  if (ctx.payloadError) {
    return {
      kind: "validation",
      title: "We couldn't accept those answers",
      detail: ctx.payloadError,
      hint: "Review your answers below — one of them may be incomplete. If it looks right, try again.",
    };
  }

  // 2. Browser is offline
  if (ctx.offline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return {
      kind: "offline",
      title: "You're offline",
      detail: "Your device isn't connected to the internet right now.",
      hint: "Check your connection — your answers are safe on this device, hit Try again once you're back online.",
    };
  }

  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err ?? "");

  // 3. Our own timeout (AbortController) — the request didn't come back in time
  if (name === "AbortError" || /timeout|timed out|aborted/i.test(message)) {
    return {
      kind: "timeout",
      title: "That took too long",
      detail: "The scoring service didn't respond within 25 seconds.",
      hint: "Usually a one-off — wait a few seconds and hit Try again. If it keeps timing out, refresh the page.",
    };
  }

  // 4. Server-side error (function ran, returned non-2xx) — supabase wraps as FunctionsHttpError
  if (name === "FunctionsHttpError" || /\b5\d\d\b/.test(message) || /server/i.test(message)) {
    return {
      kind: "server",
      title: "Our scoring service hiccupped",
      detail: message || "The function ran but returned an error.",
      hint: "We've logged it. Try again in a moment — your answers are saved.",
    };
  }

  // 5. Network / relay failure — couldn't reach the function at all
  if (
    name === "FunctionsRelayError" ||
    name === "FunctionsFetchError" ||
    name === "TypeError" ||
    /failed to fetch|network|relay|load failed/i.test(message)
  ) {
    return {
      kind: "network",
      title: "Couldn't reach the scoring service",
      detail: "We couldn't make it to the server — could be your connection or ours.",
      hint: "Check your connection and try again. If it persists, refresh and we'll resume from your last answer.",
    };
  }

  return {
    kind: "unknown",
    title: "Something snagged",
    detail: message || "An unexpected error occurred.",
    hint: "Try again — your answers are safe on this device.",
  };
}

export default function AssessScan() {
  const navigate = useNavigate();

  // Resolve level from the previous picker (or fall back to function-level).
  const initialScan = loadScan();
  const draftLevel = initialScan.level ?? loadDraft().level;
  const level: Level = draftLevel && VALID_LEVELS.includes(draftLevel) ? draftLevel : "function";

  const [fn, setFn] = useState<BusinessFunction | undefined>(initialScan.function);
  const [region, setRegion] = useState<Region | undefined>(initialScan.region as Region | undefined);
  const [answers, setAnswers] = useState<Record<string, number>>(initialScan.answers ?? {});
  // Resume at the first unanswered question if a draft exists. We compute the
  // initial step against the question list for the level + function we just
  // restored, so a refresh mid-scan drops the user back exactly where they left.
  const [step, setStep] = useState(() => {
    const initialQs = getQuickscanQuestions(
      level,
      level === "function" ? initialScan.function : undefined,
    );
    const restored = initialScan.answers ?? {};
    const firstUnanswered = initialQs.findIndex((q) => restored[q.id] === undefined);
    if (firstUnanswered === -1) return Math.max(1, initialQs.length);
    return firstUnanswered + 1;
  });
  const [resumed] = useState(() => Object.keys(initialScan.answers ?? {}).length > 0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
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

  // Re-entry guard. `submitting` lives in state and won't be visible to a
  // second call that arrives in the same React tick — a ref gives us a
  // synchronous lock so a fast double-click or an Enter+button race can't
  // fire two report-generation requests in parallel.
  const inflight = useRef(false);

  const submit = useCallback(
    async (finalAnswers: Record<string, number>) => {
      if (inflight.current) return;
      inflight.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setLastAttempt(finalAnswers);

      // Snapshot the connectivity state before kicking off the call so the
      // classifier can describe the right failure even if the browser comes
      // back online during the timeout window.
      const wasOffline = typeof navigator !== "undefined" && !navigator.onLine;

      // Race the invoke against a timeout so a hung request surfaces as an
      // explicit `timeout` error instead of spinning forever. supabase-js
      // doesn't expose an AbortSignal pass-through, so Promise.race is the
      // cleanest way to bound this.
      let timeout: number | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => {
          const err = new Error("Request timed out");
          err.name = "AbortError";
          reject(err);
        }, SUBMIT_TIMEOUT_MS);
      });

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
        const { data, error } = await Promise.race([
          supabase.functions.invoke("submit-quickscan", { body: payload }),
          timeoutPromise,
        ]);
        if (error) {
          console.error("[scan] submit failed", error, data);
          setSubmitting(false);
          setSubmitError(
            classifyError(error, {
              offline: wasOffline,
              payloadError: typeof data === "object" && data && "error" in data
                ? String((data as { error?: unknown }).error ?? "")
                : undefined,
            }),
          );
          return;
        }
        if (!data?.slug) {
          console.error("[scan] submit returned no slug", data);
          setSubmitting(false);
          setSubmitError(
            classifyError(new Error("Missing slug in response"), {
              offline: wasOffline,
              payloadError:
                typeof data === "object" && data && "error" in data
                  ? String((data as { error?: unknown }).error ?? "")
                  : undefined,
            }),
          );
          return;
        }
        saveScan({ ...loadScan(), slug: data.slug });
        clearScan();
        navigate(`/assess/r/${data.slug}`);
      } catch (err) {
        console.error("[scan] submit threw", err);
        setSubmitting(false);
        setSubmitError(classifyError(err, { offline: wasOffline }));
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [level, fn, region, questions, navigate],
  );

  const retry = useCallback(() => {
    if (lastAttempt) void submit(lastAttempt);
    else void submit(answers);
  }, [lastAttempt, answers, submit]);

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

  if (submitting || submitError) {
    return (
      <AssessChrome ariaLabel={submitError ? "Report generation failed" : "Building your report"}>
        <main className="container flex-1 flex items-center justify-center py-24">
          <div className="text-center max-w-md">
            {submitting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-brass mx-auto" />
                <p className="mt-6 font-display text-2xl text-cream/85">Scoring your scan…</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
                  A few seconds.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright">
                  {submitError?.kind === "offline"
                    ? "No connection"
                    : submitError?.kind === "timeout"
                    ? "Request timed out"
                    : submitError?.kind === "server"
                    ? "Server error"
                    : submitError?.kind === "validation"
                    ? "Couldn't accept answers"
                    : submitError?.kind === "network"
                    ? "Network error"
                    : "Something snagged"}
                </p>
                <p className="mt-4 font-display text-2xl text-cream/90">
                  {submitError?.title ?? "We couldn't build your report."}
                </p>
                <p className="mt-3 font-display text-sm text-cream/65 leading-relaxed">
                  {submitError?.detail}
                </p>
                <div className="mt-5 mx-auto max-w-sm rounded-sm border border-brass/25 bg-brass/5 px-4 py-2.5">
                  <p className="font-ui text-xs text-cream/75 leading-relaxed">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass-bright/85 mr-1.5">Tip ·</span>
                    {submitError?.hint}
                  </p>
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
                  Your answers are safe on this device.
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button
                    onClick={retry}
                    disabled={submitError?.kind === "offline" && typeof navigator !== "undefined" && !navigator.onLine}
                    className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                  >
                    {submitError?.kind === "offline" ? "Try again when online" : "Try again"}
                  </Button>
                  <button
                    onClick={() => { setSubmitError(null); }}
                    className="font-ui text-xs uppercase tracking-[0.16em] text-cream/55 hover:text-cream"
                  >
                    Review answers
                  </button>
                </div>
              </>
            )}
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

          {/* Resume banner — shown above the question whenever there's a
              restored draft, on every step until the user starts over or
              completes the scan. */}
          {resumed && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-brass/30 bg-brass/5 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright/85">
                Picked up where you left off · {Object.keys(answers).length} of {questions.length} answered
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm("Clear your saved answers and start the scan over?")) return;
                  clearScan();
                  setAnswers({});
                  setFn(undefined);
                  setRegion(undefined);
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
