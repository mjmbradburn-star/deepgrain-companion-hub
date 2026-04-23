import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, Info, Loader2, LogOut } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { OptionCard } from "@/components/aioi/OptionCard";
import { PillarChip } from "@/components/aioi/PillarChip";
import { ProgressBar } from "@/components/aioi/ProgressBar";
import { DeepDiveEmailGate } from "@/components/aioi/DeepDiveEmailGate";
import { Seo } from "@/components/aioi/Seo";
import { Button } from "@/components/ui/button";
import {
  PILLAR_NAMES,
  getDeepDiveQuestions,
  type Level,
  type BusinessFunction,
  type Question,
} from "@/lib/assessment";
import { getQuickscanQuestions } from "@/lib/quickscan";
import { supabase } from "@/integrations/supabase/client";
import { claimReportBySlug } from "@/lib/report-claim";
import { seoRoutes } from "@/lib/seo";
import { useAuthReady } from "@/hooks/use-auth-ready";

interface RespondentLite {
  id: string;
  slug: string;
  level: Level;
  function: BusinessFunction | null;
  isAnonymous: boolean;
}

export default function AssessDeep() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [respondent, setRespondent] = useState<RespondentLite | null>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, number>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [authGate, setAuthGate] = useState<"checking" | "needs-email" | "blocked" | "ready">("checking");
  const { isReady: authReady, session, user } = useAuthReady();

  // Load public respondent metadata first. Authenticated claim/response loading
  // waits for the browser session to be fully restored below.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: rpc, error } = await supabase.rpc("get_report_by_slug", { _slug: slug });
      if (cancelled) return;
      if (error || !rpc) {
        setLoadErr(error?.message ?? "Not found");
        return;
      }
      const payload = rpc as unknown as {
        respondent: { id: string; slug: string; level: Level; function: BusinessFunction | null; is_anonymous: boolean } | null;
      };
      if (!payload.respondent) {
        setLoadErr("Report not found");
        return;
      }
      setRespondent({ ...payload.respondent, isAnonymous: payload.respondent.is_anonymous });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!respondent || !authReady) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setAuthGate("needs-email");
        return;
      }

      setAuthGate("checking");
      setLoadErr(null);
      const claim = await claimReportBySlug(respondent.slug, false);
      if (cancelled) return;
      void supabase.from("events").insert({
        name: claim.ok ? "report_claimed" : "report_claim_failed",
        payload: { slug: respondent.slug, status: claim.status },
      });
      if (!claim.ok) {
        setAuthGate("blocked");
        return;
      }
      setAuthGate("ready");

      // Load existing responses to skip what's already answered
      const { data: existing } = await supabase
        .from("responses")
        .select("question_id")
        .eq("respondent_id", respondent.id);
      if (!cancelled) {
        setAnsweredIds(new Set((existing ?? []).map((r) => r.question_id)));
      }

      void supabase.from("events").insert({
        name: "deepdive_started",
        payload: { slug: respondent.slug, respondent_id: respondent.id },
      });
    })();
    return () => { cancelled = true; };
  }, [authReady, respondent, user]);

  const allProgressQuestions = useMemo<Question[]>(() => {
    if (!respondent) return [];
    const quickscan = getQuickscanQuestions(respondent.level, respondent.function ?? undefined);
    const deep = getDeepDiveQuestions(respondent.level, respondent.function ?? undefined);
    return [...quickscan, ...deep].filter(
      (question, index, all) => all.findIndex((candidate) => candidate.id === question.id) === index,
    );
  }, [respondent]);

  // Build the remaining question list — deep set minus already-answered, so
  // Quickscan answers carry forward without being repeated.
  const remaining = useMemo<Question[]>(() => {
    if (!respondent) return [];
    const all = getDeepDiveQuestions(respondent.level, respondent.function ?? undefined);
    return all.filter((q) => !answeredIds.has(q.id));
  }, [respondent, answeredIds]);

  const idx = step - 1;
  const question = remaining[idx];
  const selected = question ? answers[question.id] : undefined;

  const answeredProgressCount = useMemo(
    () => allProgressQuestions.filter((q) => answeredIds.has(q.id)).length,
    [allProgressQuestions, answeredIds],
  );

  const totalProgressCount = allProgressQuestions.length || answeredIds.size + remaining.length;

  const segments = useMemo(
    () => allProgressQuestions.map((q) => ({
      pillar: q.pillar,
      filled: answeredIds.has(q.id) || answers[q.id] !== undefined,
    })),
    [allProgressQuestions, answeredIds, answers],
  );

  useEffect(() => {
    if (!respondent || submitting || submitErr || remaining.length !== 0) return;
    const t = window.setTimeout(() => navigate(`/assess/r/${respondent.slug}`), 1200);
    return () => window.clearTimeout(t);
  }, [navigate, remaining.length, respondent, submitErr, submitting]);

  const submitAll = async (finalAnswers: Record<string, number>) => {
    if (!respondent) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const rows = Object.entries(finalAnswers).map(([question_id, tier]) => ({
        respondent_id: respondent.id,
        question_id,
        tier,
      }));
      if (rows.length > 0 && !answersSaved) {
        const { error: insertError } = await supabase.from("responses").upsert(rows, { onConflict: "respondent_id,question_id" });
        if (insertError) throw insertError;
        setAnswersSaved(true);
        setSavedAnswers(finalAnswers);
      }
      await scoreReport();
      void supabase.from("events").insert({
        name: "deepdive_completed",
        payload: { slug: respondent.slug, respondent_id: respondent.id, answered: Object.keys(finalAnswers).length },
      });
      navigate(`/assess/r/${respondent.slug}`);
    } catch (err) {
      console.error("[deep] submit failed", err);
      setSubmitErr("Your Deep Dive answers are saved. We could not refresh the score yet.");
      void supabase.from("events").insert({
        name: "deepdive_rescore_failed",
            payload: { slug: respondent.slug, respondent_id: respondent.id, message: err instanceof Error ? err.message : String(err) },
      });
      setSubmitting(false);
    }
  };

  const scoreReport = async () => {
    if (!respondent) return;
    if (!session?.access_token) {
      setAuthGate("needs-email");
      throw new Error("Sign-in required before scoring");
    }
    const { error: scoreError } = await supabase.functions.invoke("rescore-respondent", {
      body: { slug: respondent.slug },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (scoreError) throw scoreError;
  };

  const retryScoring = async (goToReportAfter = false) => {
    if (!respondent) return;
    setSubmitting(true);
    setSubmitErr(null);
    void supabase.from("events").insert({
      name: "deepdive_rescore_retried",
      payload: { slug: respondent.slug, respondent_id: respondent.id },
    });
    try {
      await scoreReport();
      navigate(`/assess/r/${respondent.slug}`);
    } catch (err) {
      console.error("[deep] scoring retry failed", err);
      setSubmitErr("Your Deep Dive answers are saved. We could not refresh the score yet.");
      if (goToReportAfter) navigate(`/assess/r/${respondent.slug}`);
    } finally {
      setSubmitting(false);
    }
  };

  const select = (tier: number) => {
    if (!question) return;
    if (Object.keys(answers).length === 0) {
      void supabase.from("events").insert({
        name: "deepdive_first_question_answered",
        payload: { slug: respondent?.slug, respondent_id: respondent?.id, question_id: question.id },
      });
    }
    const next = { ...answers, [question.id]: tier };
    setAnswers(next);
    setSavedAnswers(next);
    window.setTimeout(() => {
      if (step < remaining.length) setStep(step + 1);
      else void submitAll(next);
    }, 220);
  };

  if (loadErr) {
    return (
      <AssessChrome ariaLabel="Deep dive">
        <Seo {...seoRoutes.flow} path={slug ? `/assess/deep/${slug}` : "/assess/deep"} />
        <main className="container py-24 text-center">
          <p className="font-display text-2xl text-cream/80">{loadErr}</p>
        </main>
      </AssessChrome>
    );
  }

  if (!respondent) {
    return (
      <AssessChrome ariaLabel="Loading">
        <Seo {...seoRoutes.flow} path={slug ? `/assess/deep/${slug}` : "/assess/deep"} />
        <main className="container flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brass" />
        </main>
      </AssessChrome>
    );
  }

  if (authGate === "needs-email") {
    return (
      <AssessChrome ariaLabel="Save report">
        <Seo {...seoRoutes.flow} path={slug ? `/assess/deep/${slug}` : "/assess/deep"} />
        <main className="container max-w-2xl w-full py-20 sm:py-28">
          <p className="eyebrow mb-5">Save report</p>
          <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">Save this report and<br /><span className="italic text-brass-bright">unlock the Deep Dive.</span></h1>
          <p className="mt-6 font-display text-lg text-cream/65 max-w-md">We need your email before updating this report, so the full report is saved to you.</p>
          <DeepDiveEmailGate slug={respondent.slug} level={respondent.level} compact />
        </main>
      </AssessChrome>
    );
  }

  if (authGate === "checking" || submitting || submitErr || remaining.length === 0) {
    return (
      <AssessChrome ariaLabel="Re-scoring">
        <Seo {...seoRoutes.flow} path={slug ? `/assess/deep/${slug}` : "/assess/deep"} />
        <main className="container flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            {!submitErr && <Loader2 className="h-6 w-6 animate-spin text-brass mx-auto" />}
            <p className="mt-6 font-display text-2xl text-cream/85">
              {authGate === "checking"
                ? "Saving this report to your email…"
                : submitErr
                ? "Your answers are saved. Re-scoring needs another try."
                : remaining.length === 0
                ? "Your full report is already complete. Taking you back now…"
                : "Re-scoring with the full picture…"}
            </p>
            {submitErr && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="sm"
                  onClick={retryScoring}
                  className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
                >
                  Retry scoring
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/assess/r/${respondent.slug}`)}
                  className="rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 font-ui text-xs tracking-wider uppercase"
                >
                  Back to report
                </Button>
              </div>
            )}
          </div>
        </main>
      </AssessChrome>
    );
  }

  if (!question) return null;

  return (
      <AssessChrome
      step={answeredProgressCount + step}
      total={totalProgressCount}
      back={{ to: `/assess/r/${respondent.slug}`, label: "Report" }}
      ariaLabel={`Deep dive question ${answeredProgressCount + step} of ${totalProgressCount}`}
    >
      <Seo {...seoRoutes.flow} path={slug ? `/assess/deep/${slug}` : "/assess/deep"} />
      <main className="w-full flex flex-col">
        <div className="container pt-6">
          <ProgressBar
            segments={segments}
            currentPillar={question.pillar}
            currentPillarLabel={PILLAR_NAMES[question.pillar]}
          />
        </div>
        <div className="container max-w-3xl flex-1 py-8 sm:py-14 animate-[fade-up_320ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 sm:mb-7">
            <PillarChip index={question.pillar} label={PILLAR_NAMES[question.pillar]} />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-cream/40">
              Deep dive · {answeredProgressCount + step} of {totalProgressCount}
            </span>
          </div>
          {step === 1 && answeredProgressCount > 0 && (
            <p className="mb-5 rounded-sm border border-cream/10 bg-surface-1/35 px-4 py-3 font-display text-base leading-relaxed text-cream/65">
              You already answered {answeredProgressCount} questions; we'll only ask what is missing.
            </p>
          )}
          <h1 className="font-display headline-md text-cream text-balance">
            {question.prompt}
          </h1>
          {question.detail?.rationale && (
            <details className="group mt-6 rounded-sm border border-cream/10 bg-surface-1/35 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-ui text-xs uppercase tracking-[0.16em] text-cream/55 transition-colors hover:text-cream [&::-webkit-details-marker]:hidden">
                <Info className="h-3.5 w-3.5 text-brass-bright" />
                Why this question?
              </summary>
              <p className="mt-3 font-display text-base leading-relaxed text-cream/70">
                {question.detail.rationale}
              </p>
            </details>
          )}
          <div className="mt-9 space-y-3">
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
              onClick={() => step > 1 ? setStep(step - 1) : navigate(`/assess/r/${respondent.slug}`)}
              className="inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.16em] text-cream/50 hover:text-cream transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {step === 1 ? "Back to report" : "Previous"}
            </button>
            {selected !== undefined && step === remaining.length && (
              <Button
                size="sm"
                onClick={() => void submitAll(answers)}
                className="rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs tracking-wider uppercase"
              >
                Re-score my report <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </AssessChrome>
  );
}
