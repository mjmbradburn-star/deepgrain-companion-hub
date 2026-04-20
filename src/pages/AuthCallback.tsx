import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { loadDraft, getQuestions } from "@/lib/assessment";
import { ensureRespondent, flushAnswers } from "@/lib/sync";

/**
 * Handles the magic-link redirect target. When the session resolves we:
 *   1. Make sure a respondent row exists (writes id + slug into the draft).
 *   2. Backfill any answers the user already gave on this device.
 *   3. Send them back to where they were:
 *        • ?next=<path> if provided
 *        • else /assess/processing if they're past the last question
 *        • else /assess/q/<next-unanswered>
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let handled = false;

    const handle = async () => {
      if (handled || cancelled) return;
      handled = true;

      const next = params.get("next");
      const draft = loadDraft();

      try {
        if (draft.level && Object.keys(draft.answers ?? {}).length > 0) {
          const { respondentId } = await ensureRespondent(draft);
          await flushAnswers(respondentId, draft);
        } else if (draft.level) {
          // No answers yet but they have a level — still create the respondent
          // so subsequent answers stream live.
          await ensureRespondent(draft);
        }
      } catch (err) {
        console.error("[auth-callback] sync failed", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Sync failed");
          return;
        }
      }

      if (cancelled) return;
      if (next) {
        navigate(next, { replace: true });
        return;
      }
      const answered = Object.keys(draft.answers ?? {}).length;
      if (answered >= FUNCTION_QUESTIONS.length) {
        navigate("/assess/processing", { replace: true });
      } else if (draft.level && answered > 0) {
        navigate(`/assess/q/${answered + 1}`, { replace: true });
      } else if (draft.level) {
        navigate("/assess/q/1", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void handle();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void handle();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, params]);

  return (
    <AssessChrome ariaLabel="Signing you in">
      <main className="container max-w-2xl w-full py-24">
        <p className="eyebrow mb-5">{status === "error" ? "Snag" : "Signing you in"}</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          {status === "error" ? (
            <>Something snagged.<br /><span className="italic text-brass-bright">{errorMsg}</span></>
          ) : (
            <>One moment.<br /><span className="italic text-brass-bright">Resuming your assessment.</span></>
          )}
        </h1>
      </main>
    </AssessChrome>
  );
}
