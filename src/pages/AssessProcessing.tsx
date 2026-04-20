import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadDraft } from "@/lib/assessment";
import { sendMagicLink, syncDraft, SyncError } from "@/lib/sync";

type Phase =
  | "checking"        // working out whether we already have a session
  | "needs-link"      // signed-out — we just sent (or are about to send) the magic link
  | "syncing"         // signed-in — pushing the draft to the database
  | "done"            // everything saved
  | "error";

const SYNC_LINES = [
  "Reading 8 pillar responses…",
  "Mapping answers to maturity tiers…",
  "Saving to your private record…",
  "Cross-referencing benchmark cohort (n = 2,847)…",
  "Identifying hotspots (bottom-quartile pillars)…",
  "Drafting plan: Month 1 / 2 / 3…",
  "Selecting interventions from outcomes library…",
  "Sealing report…",
];

export default function AssessProcessing() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [shown, setShown] = useState<string[]>([]);
  const syncedRef = useRef(false); // guard against StrictMode double-fire

  // 1. On mount, decide what to do based on session + draft.
  useEffect(() => {
    const draft = loadDraft();

    // No level → wandered in directly. Send back to start.
    if (!draft.level) {
      navigate("/assess", { replace: true });
      return;
    }
    if (Object.keys(draft.answers ?? {}).length === 0) {
      navigate("/assess/q/1", { replace: true });
      return;
    }

    let cancelled = false;

    const handleSession = async (signedIn: boolean) => {
      if (cancelled || syncedRef.current) return;
      if (signedIn) {
        syncedRef.current = true;
        setPhase("syncing");
        try {
          await syncDraft(loadDraft());
          if (!cancelled) setPhase("done");
        } catch (err) {
          console.error("[sync] failed", err);
          if (!cancelled) {
            setPhase("error");
            setError(err instanceof SyncError ? err.message : "Something went wrong saving your answers.");
          }
        }
      } else {
        // Signed-out — request magic link and wait.
        const email = draft.qualifier?.email;
        if (!email) {
          navigate("/assess/start", { replace: true });
          return;
        }
        try {
          await sendMagicLink(email, `${window.location.origin}/auth/callback`);
          if (!cancelled) {
            setEmailSentTo(email);
            setPhase("needs-link");
          }
        } catch (err) {
          console.error("[magic-link] failed", err);
          if (!cancelled) {
            setPhase("error");
            setError(err instanceof SyncError ? err.message : "Could not send your magic link.");
          }
        }
      }
    };

    // Listen first, then check current session — avoids races.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(!!session);
    });
    supabase.auth.getSession().then(({ data }) => {
      void handleSession(!!data.session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // 2. Animate the "build log" while syncing, then settle.
  useEffect(() => {
    if (phase !== "syncing") return;
    setShown([]);
    let i = 0;
    const id = window.setInterval(() => {
      setShown((s) => [...s, SYNC_LINES[i]]);
      i++;
      if (i >= SYNC_LINES.length) window.clearInterval(id);
    }, 420);
    return () => window.clearInterval(id);
  }, [phase]);

  return (
    <AssessChrome ariaLabel="Building your report">
      <main className="container max-w-2xl w-full py-20 flex flex-col">
        {phase === "checking" && (
          <Headline eyebrow="One moment" line1="Checking your session…" />
        )}

        {phase === "needs-link" && (
          <>
            <Headline
              eyebrow="One last step"
              line1="Check your inbox."
              line2={<>We've sent a magic link to <span className="text-brass-bright not-italic">{emailSentTo}</span>.</>}
            />
            <p className="mt-8 max-w-xl font-display text-lg text-cream/65 leading-relaxed">
              Click the link to sign in — your answers are waiting on this device, and we'll save them and build your report the instant you're back.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-md border border-cream/10 bg-surface-1/60 px-4 py-3 max-w-fit">
              <Mail className="h-4 w-4 text-brass-bright" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-cream/60">
                Don't close this tab
              </span>
            </div>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/30">
              Wrong email? <button onClick={() => navigate("/assess/start")} className="underline underline-offset-4 hover:text-cream">Change it</button>
            </p>
          </>
        )}

        {phase === "syncing" && (
          <>
            <Headline eyebrow="Building your report" line1="Hold a moment." line2="We're doing the work." />
            <BuildLog shown={shown} total={SYNC_LINES.length} />
          </>
        )}

        {phase === "done" && (
          <>
            <Headline eyebrow="Saved" line1="Your answers are in." line2="Report engine arrives in Phase 3." />
            <div className="mt-12 rounded-lg border border-brass/30 bg-brass/5 p-6 max-w-xl">
              <p className="font-display text-lg text-cream/85 leading-snug">
                <span className="text-brass-bright mr-2">✓</span>
                We've recorded your responses and your benchmark consent. The scoring engine and your private one-pager land in the next phase — we'll email you the moment it's live.
              </p>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <Button
                onClick={() => navigate("/")}
                className="h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase"
              >
                Back to home <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {phase === "error" && (
          <>
            <Headline eyebrow="Something snagged" line1="We hit a problem." />
            <p className="mt-6 max-w-xl font-display text-lg text-cream/70">{error}</p>
            <div className="mt-10 flex items-center gap-4">
              <Button
                onClick={() => window.location.reload()}
                className="h-12 px-7 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm tracking-wider uppercase"
              >
                Try again
              </Button>
              <button
                onClick={() => navigate("/assess/start")}
                className="font-ui text-xs uppercase tracking-[0.16em] text-cream/55 hover:text-cream"
              >
                Start over
              </button>
            </div>
          </>
        )}
      </main>
    </AssessChrome>
  );
}

function Headline({
  eyebrow, line1, line2,
}: { eyebrow: string; line1: string; line2?: React.ReactNode }) {
  return (
    <>
      <p className="eyebrow mb-5">{eyebrow}</p>
      <h1 className="font-display text-4xl sm:text-5xl text-cream leading-[1.05] tracking-tight">
        {line1}
        {line2 && (<><br /><span className="italic text-brass-bright">{line2}</span></>)}
      </h1>
    </>
  );
}

function BuildLog({ shown, total }: { shown: string[]; total: number }) {
  return (
    <div className="mt-12 rounded-lg border border-cream/10 bg-surface-1/60 p-6 font-mono text-[13px] leading-relaxed text-cream/70 min-h-[300px]">
      {shown.map((line, i) => (
        <p key={i} className="animate-fade-in">
          <span className="text-brass-bright/70 mr-2">›</span>
          {line}
        </p>
      ))}
      {shown.length < total && (
        <p className="mt-1 text-cream/30">
          <span className="text-brass-bright/70 mr-2">›</span>
          <span className="inline-block w-2 h-4 align-middle bg-brass-bright/70 animate-pulse" />
        </p>
      )}
    </div>
  );
}
