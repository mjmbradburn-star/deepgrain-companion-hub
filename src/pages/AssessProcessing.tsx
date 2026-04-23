import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadDraft } from "@/lib/assessment";
import { finaliseAssessment, sendMagicLink, SyncError } from "@/lib/sync";
import { seoRoutes } from "@/lib/seo";
import { authAccessCopy, type AuthAccessOutcome } from "@/lib/auth-access";
import { lovable } from "@/integrations/lovable";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { AuthAccessPanel } from "@/components/aioi/AuthAccessPanel";
import { buildAuthCallbackUrl, persistAuthCallbackContext } from "@/lib/auth-callback-url";

/**
 * Dev-only: sign in a synthetic test user so the full flow can be
 * walked end-to-end without waiting on a magic link. Activated by
 * appending `?seed=1` to /assess/processing. No-op in production.
 */
async function seedDevSession(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const email = `seed-${Date.now()}@deepgrain-test.dev`;
  const password = `Seed!${crypto.randomUUID()}`;
  const { error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (signUpErr && !/already/i.test(signUpErr.message)) {
    throw new SyncError(`Seed sign-up failed: ${signUpErr.message}`, signUpErr);
  }
  // signUp returns a session immediately when auto-confirm is on.
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    throw new SyncError(
      `Seed sign-in failed: ${signInErr.message}. Enable auto-confirm signups in Cloud auth settings to use ?seed=1.`,
      signInErr,
    );
  }
}

type Phase =
  | "checking"      // working out whether we already have a session
  | "needs-link"    // signed-out — magic link was sent earlier (or just resent)
  | "syncing"       // signed-in — flushing answers + scoring
  | "done"          // everything saved — redirecting to report
  | "error";

const SYNC_LINES = [
  "Confirming your responses…",
  "Mapping answers to maturity tiers…",
  "Computing weighted AIOI score…",
  "Cross-referencing benchmark cohort…",
  "Identifying hotspots (bottom-quartile pillars)…",
  "Drafting plan: Month 1 / 2 / 3…",
  "Selecting interventions from outcomes library…",
  "Sealing report…",
];

export default function AssessProcessing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seedMode = import.meta.env.DEV && searchParams.get("seed") === "1";
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [accessOutcome, setAccessOutcome] = useState<AuthAccessOutcome | null>(null);
  const [shown, setShown] = useState<string[]>([]);
  const [resending, setResending] = useState(false);
  const finalisedRef = useRef(false); // guard against StrictMode double-fire
  const finalisePromiseRef = useRef<ReturnType<typeof finaliseAssessment> | null>(null);
  const { isReady: authReady, session } = useAuthReady();

  // 1. Decide what to do based on session + draft.
  useEffect(() => {
    const draft = loadDraft();

    if (!draft.level) {
      navigate("/assess", { replace: true });
      return;
    }
    if (Object.keys(draft.answers ?? {}).length === 0) {
      navigate("/assess/q/1", { replace: true });
      return;
    }

    let cancelled = false;
    if (!authReady) return;

    const handleSession = async (signedIn: boolean) => {
      if (cancelled || finalisedRef.current) return;
      if (signedIn) {
        setPhase("syncing");
        try {
          if (!finalisePromiseRef.current) {
            finalisePromiseRef.current = finaliseAssessment();
          }
          const { slug } = await finalisePromiseRef.current;
          finalisedRef.current = true;
          if (cancelled) return;

          // Fire-and-forget: generate the PDF server-side and email a link to it.
          // Uses the email captured during qualifier (or the signed-in user's email).
          const recipient =
            draft.qualifier?.email ??
            (await supabase.auth.getUser()).data.user?.email ??
            null;
          if (recipient) {
            void supabase.functions
              .invoke("email-report-pdf", { body: { slug, email: recipient } })
              .catch((err) => {
                // Non-blocking — user can still request the PDF from the report page.
                console.warn("[email-report-pdf] auto-send failed", err);
              });
          }

          setPhase("done");
          // Brief settle before redirect so the build-log finishes.
          window.setTimeout(() => {
            if (!cancelled) navigate(`/assess/r/${slug}`, { replace: true });
          }, 1400);
        } catch (err) {
          console.error("[finalise] failed", err);
          if (!cancelled) {
            setPhase("error");
            setError(err instanceof SyncError ? err.message : "Something went wrong saving your answers.");
          }
        }
      } else if (seedMode) {
        // Dev shortcut — bypass the magic-link wait by minting a synthetic session.
        try {
          await seedDevSession();
          // onAuthStateChange will fire and re-enter handleSession with signedIn=true.
        } catch (err) {
          console.error("[seed] failed", err);
          if (!cancelled) {
            setPhase("error");
            setError(err instanceof SyncError ? err.message : "Seed session failed.");
          }
        }
      } else {
        // Signed-out — the magic link was already sent on the email screen.
        const email = draft.qualifier?.email;
        if (!email) {
          navigate("/assess/start", { replace: true });
          return;
        }
        if (!cancelled) {
          setEmailSentTo(email);
          setPhase("needs-link");
        }
      }
    };

    void handleSession(!!session);

    return () => {
      cancelled = true;
    };
  }, [authReady, navigate, seedMode, session]);

  // 2. Animate the "build log" while syncing.
  useEffect(() => {
    if (phase !== "syncing") return;
    setShown([]);
    let i = 0;
    const id = window.setInterval(() => {
      setShown((s) => [...s, SYNC_LINES[i]]);
      i++;
      if (i >= SYNC_LINES.length) window.clearInterval(id);
    }, 220);
    return () => window.clearInterval(id);
  }, [phase]);

  const resendLink = async () => {
    if (!emailSentTo || resending) return;
    setResending(true);
    try {
      const outcome = await sendMagicLink(emailSentTo, buildAuthCallbackUrl({ next: "/assess/processing", email: emailSentTo }));
      setAccessOutcome(outcome);
    } catch (err) {
      console.error("[resend] failed", err);
      setError(err instanceof SyncError ? err.message : "Could not resend the link.");
    } finally {
      setResending(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    const context = { next: "/assess/processing", authMethod: provider };
    persistAuthCallbackContext(context);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: buildAuthCallbackUrl(context),
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });
    if (result.error) setError(result.error.message);
  };

  const accessCopy = accessOutcome ? authAccessCopy(accessOutcome) : null;

  return (
    <AssessChrome ariaLabel="Building your report">
      <Seo {...seoRoutes.flow} path="/assess/processing" />
      <main className="container max-w-2xl w-full py-20 flex flex-col">
        {seedMode && (
          <div className="mb-6 inline-flex items-center gap-2 self-start rounded-sm border border-brass/40 bg-brass/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-brass-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-brass-bright animate-pulse" />
            Dev seed mode · synthetic session
          </div>
        )}
        {phase === "checking" && (
          <Headline eyebrow="One moment" line1="Checking your session…" />
        )}

        {phase === "needs-link" && (
          <>
            <Headline
              eyebrow="One last step"
              line1="Sign in to save."
              line2={<>Google or Apple is fastest.</>}
            />
            <p className="mt-8 max-w-xl font-display text-lg text-cream/65 leading-relaxed">
              Your answers are saved on this device. Sign in to attach them to your report, or use the email backup sent to <span className="text-brass-bright">{emailSentTo}</span>.
            </p>
            <div className="mt-10 max-w-xl">
              <AuthAccessPanel onProvider={signInWithProvider} />
            </div>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/30">
              Didn't arrive? <button onClick={resendLink} disabled={resending} className="underline underline-offset-4 hover:text-cream disabled:opacity-50">{resending ? "Sending…" : "Resend"}</button>
              {" · "}
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
            <Headline eyebrow="Saved" line1="Your report is ready." line2="Taking you to it now." />
            <BuildLog shown={SYNC_LINES} total={SYNC_LINES.length} />
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
