import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadDraft, getQuestions } from "@/lib/assessment";
import { ensureRespondent, flushAnswers, sendMagicLink, SyncError } from "@/lib/sync";
import { claimReportBySlug } from "@/lib/report-claim";
import { seoRoutes } from "@/lib/seo";
import { lovable } from "@/integrations/lovable";
import { authAccessCopy } from "@/lib/auth-access";
import { buildAuthCallbackUrl, clearAuthCallbackContext, persistAuthCallbackContext, resolveAuthCallbackContext } from "@/lib/auth-callback-url";

/**
 * Handles the magic-link redirect target. When the session resolves we:
 *   1. Make sure a respondent row exists (writes id + slug into the draft).
 *   2. Backfill any answers the user already gave on this device.
 *   3. Send them back to where they were.
 *
 * If Supabase redirects back with an error (expired/invalid link), we show
 * a friendly state with a "Request a new link" CTA.
 */

type LinkErrorKind = "expired" | "invalid" | "used" | "unconfirmed" | "access_denied" | "sync" | "generic";

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

function detectLinkError(search: URLSearchParams, hash: URLSearchParams): {
  kind: LinkErrorKind;
  description?: string;
} | null {
  const error = hash.get("error") || search.get("error");
  const code = hash.get("error_code") || search.get("error_code");
  const desc = hash.get("error_description") || search.get("error_description") || undefined;
  if (!error && !code) return null;
  const description = desc?.replace(/\+/g, " ");
  if (/not confirmed|unconfirmed|confirm your email|email.*confirm/i.test(description ?? "")) {
    return { kind: "unconfirmed", description };
  }
  if (/already been used|used/i.test(description ?? "")) {
    return { kind: "used", description };
  }
  if (code === "otp_expired" || /expired/i.test(description ?? "")) {
    return { kind: "expired", description };
  }
  if (error === "access_denied") return { kind: "access_denied", description };
  if (code === "otp_invalid" || /invalid/i.test(description ?? "")) {
    return { kind: "invalid", description };
  }
  return { kind: "generic", description };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorKind, setErrorKind] = useState<LinkErrorKind>("generic");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [knownEmail, setKnownEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resentTo, setResentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const callbackContext = resolveAuthCallbackContext(params);
  const next = callbackContext.next;
  const claimSlug = callbackContext.claim;
  const consentMarketing = callbackContext.consentMarketing;
  const emailParam = callbackContext.email;
  const authMethod = callbackContext.authMethod;

  useEffect(() => {
    let cancelled = false;
    let handled = false;

    // 1. Detect link errors surfaced via URL hash/query before doing anything else.
    const hashParams = parseHashParams(window.location.hash);
    const linkError = detectLinkError(params, hashParams);
    if (linkError) {
      void supabase.from("events").insert({
        name: "auth_callback_failed",
        payload: { kind: linkError.kind, next, claim_slug: claimSlug, auth_method: authMethod },
      });
      setStatus("error");
      setErrorKind(linkError.kind);
      setErrorDetail(linkError.description ?? null);
      try {
        const draftEmail = emailParam || loadDraft().qualifier?.email;
        if (draftEmail) setKnownEmail(draftEmail);
      } catch {
        /* no-op */
      }
      // Clean the URL so a refresh doesn't keep showing the error fragment.
      try {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      } catch {
        /* no-op */
      }
      return;
    }

    const handle = async () => {
      if (handled || cancelled) return;
      handled = true;

      const draft = loadDraft();

      try {
        if (claimSlug) {
          const claim = await claimReportBySlug(claimSlug, consentMarketing);
          if (!claim.ok) throw new SyncError(claim.status === "already_claimed" ? "This report is already linked to another email." : "Could not save this report to your email.");
        }
        if (draft.level && Object.keys(draft.answers ?? {}).length > 0) {
          const { respondentId } = await ensureRespondent(draft);
          await flushAnswers(respondentId, draft);
        } else if (draft.level) {
          await ensureRespondent(draft);
        }
      } catch (err) {
        console.error("[auth-callback] sync failed", err);
        if (!cancelled) {
          setStatus("error");
          setErrorKind("sync");
          setErrorDetail(err instanceof Error ? err.message : "Sync failed");
          return;
        }
      }

      if (cancelled) return;
      void supabase.from("events").insert({
        name: "auth_callback_succeeded",
        payload: { next, claim_slug: claimSlug, auth_method: authMethod },
      });
      clearAuthCallbackContext();
      const nextParam = next;
      if (nextParam) {
        navigate(nextParam, { replace: true });
        return;
      }
      const answered = Object.keys(draft.answers ?? {}).length;
      const totalQuestions = getQuestions(draft.level, draft.qualifier?.function).length;
      if (answered >= totalQuestions) {
        navigate("/assess/processing", { replace: true });
      } else if (draft.level && answered > 0) {
        navigate(`/assess/q/${answered + 1}`, { replace: true });
      } else if (draft.level) {
        navigate("/assess/q/1", { replace: true });
      } else {
        navigate("/reports", { replace: true });
      }
    };

    // Give Supabase ~2.5s to surface a session. If nothing arrives and there's
    // no recognisable error, treat it as an invalid link rather than spinning
    // forever.
    const noSessionTimer = window.setTimeout(() => {
      if (handled || cancelled) return;
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled || handled) return;
        if (!data.session) {
          void supabase.from("events").insert({
            name: "auth_callback_failed",
            payload: { kind: "invalid", next, claim_slug: claimSlug },
          });
          setStatus("error");
          setErrorKind("invalid");
          try {
            const draftEmail = emailParam || loadDraft().qualifier?.email;
            if (draftEmail) setKnownEmail(draftEmail);
          } catch {
            /* no-op */
          }
        }
      });
    }, 2500);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void handle();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void handle();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(noSessionTimer);
      sub.subscription.unsubscribe();
    };
  }, [navigate, params]);

  // Cooldown countdown for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!knownEmail || resending || cooldown > 0) return;
    setResending(true);
    try {
      const redirectTo = buildAuthCallbackUrl({ next, claim: claimSlug, consentMarketing, email: knownEmail });
      const outcome = await sendMagicLink(knownEmail, redirectTo);
      void supabase.from("events").insert({
        name: "auth_callback_resend_clicked",
        payload: { next, claim_slug: claimSlug },
      });
      setResentTo(knownEmail);
      setCooldown(30);
      toast({ title: "Check your inbox", description: authAccessCopy(outcome).toast });
    } catch (err) {
      const msg = err instanceof SyncError ? err.message : "Could not send link. Try again.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleProvider = async (provider: "google" | "apple") => {
    const context = { next, claim: claimSlug, consentMarketing, email: knownEmail ?? emailParam, authMethod: provider };
    persistAuthCallbackContext(context);
    const redirect_uri = buildAuthCallbackUrl(context);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri,
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });
    if (result.error) toast({ title: `${provider === "google" ? "Google" : "Apple"} sign-in failed`, description: result.error.message, variant: "destructive" });
  };

  if (status === "error") {
    const copy = errorCopy(errorKind);
    const reportHref = claimSlug ? `/assess/r/${claimSlug}` : null;
    const claimParams = claimSlug ? `&claim=${encodeURIComponent(claimSlug)}&consent_marketing=${consentMarketing ? "1" : "0"}` : "";
    const retryHref = knownEmail
      ? `/signin?next=${encodeURIComponent(next)}&email=${encodeURIComponent(knownEmail)}${claimParams}`
      : `/signin?next=${encodeURIComponent(next)}${claimParams}`;
    return (
      <AssessChrome ariaLabel="Sign-in problem">
        <Seo {...seoRoutes.flow} path="/auth/callback" />
        <main className="container max-w-xl w-full py-20 sm:py-28">
          <p className="eyebrow mb-5">{copy.eyebrow}</p>
          <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
            {copy.title}<br />
            <span className="italic text-brass-bright">{copy.titleAccent}</span>
          </h1>
          <p className="mt-6 font-display text-lg text-cream/65 max-w-md">
            {copy.body}
          </p>
          {errorDetail && errorKind !== "expired" && errorKind !== "invalid" && (
            <p className="mt-3 font-mono text-[11px] text-cream/40 break-words">
              {errorDetail}
            </p>
          )}

          {reportHref && (
            <div className="mt-8 rounded-sm border border-brass/30 bg-brass/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright mb-2">
                Next action
              </p>
              <p className="font-display text-base text-cream/85">
                Your report is still available. Return to it, then continue with Google or Apple, or resend the email backup from the report gate.
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            {reportHref && (
              <Button
                asChild
                className="h-12 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.2em]"
              >
                <Link to={reportHref}>
                  Back to report
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
            <Button
              type="button"
              onClick={() => handleProvider("google")}
              className={`${reportHref ? "" : "bg-brass text-walnut hover:bg-brass-bright"} h-12 rounded-sm font-ui text-xs uppercase tracking-[0.2em]`}
              variant={reportHref ? "outline" : "default"}
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              onClick={() => handleProvider("apple")}
              variant="outline"
              className="h-12 rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-xs uppercase tracking-[0.2em]"
            >
              Continue with Apple
            </Button>
            {knownEmail ? (
              <Button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                variant="outline"
                className="h-12 rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-xs uppercase tracking-[0.2em]"
              >
                {resending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</>
                ) : cooldown > 0 ? (
                  <>Resend in {cooldown}s</>
                ) : resentTo ? (
                  <><Mail className="h-4 w-4 mr-2" /> Resend link</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Resend link</>
                )}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-xs uppercase tracking-[0.2em]"
              >
                <Link to={retryHref}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Request a new link
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-xs uppercase tracking-[0.2em]"
            >
              <Link to={knownEmail ? retryHref : "/assess"}>
                {knownEmail ? "Use a different email" : "Take the assessment"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {resentTo && (
            <div className="mt-8 rounded-sm border border-brass/30 bg-brass/5 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright mb-2">
                Link sent
              </p>
              <p className="font-display text-base text-cream/85">
                Check <span className="text-cream">{resentTo}</span>. Open the link on this device to sign in.
              </p>
            </div>
          )}

          <p className="mt-12 font-mono text-[11px] text-cream/40">
            Tip: email links are single-use and time-limited. If one fails, use Google or Apple, or request a fresh email backup.
          </p>
        </main>
      </AssessChrome>
    );
  }

  return (
    <AssessChrome ariaLabel="Signing you in">
      <Seo {...seoRoutes.flow} path="/auth/callback" />
      <main className="container max-w-2xl w-full py-24">
          <p className="eyebrow mb-5">{authMethod ? `Signed in with ${authMethod}` : "Signing you in"}</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          {claimSlug ? "Saving this report." : "One moment."}<br />
          <span className="italic text-brass-bright">{claimSlug ? "Taking you to the Deep Dive." : "Resuming your assessment."}</span>
        </h1>
      </main>
    </AssessChrome>
  );
}

function errorCopy(kind: LinkErrorKind): {
  eyebrow: string;
  title: string;
  titleAccent: string;
  body: string;
} {
  switch (kind) {
    case "expired":
      return {
        eyebrow: "Link expired",
        title: "That link has",
        titleAccent: "expired.",
        body: "Sign-in links are valid for a short window. Request a fresh one and we'll send it over.",
      };
    case "invalid":
      return {
        eyebrow: "Link not valid",
        title: "We couldn't verify",
        titleAccent: "that link.",
        body: "It may have already been used, or it was opened in a different browser. Request a new link to continue.",
      };
    case "used":
      return {
        eyebrow: "Link already used",
        title: "That link was",
        titleAccent: "already used.",
        body: "Email links only work once. Return to your report and continue with Google or Apple, or request a fresh email backup.",
      };
    case "unconfirmed":
      return {
        eyebrow: "Email not confirmed",
        title: "Confirm your",
        titleAccent: "email first.",
        body: "This account exists, but the email address still needs confirmation before sign-in can finish. Use Google or Apple, or request a fresh confirmation email.",
      };
    case "access_denied":
      return {
        eyebrow: "Sign-in cancelled",
        title: "Sign-in was",
        titleAccent: "cancelled.",
        body: "No worries — request a new link whenever you're ready to continue.",
      };
    case "sync":
      return {
        eyebrow: "Snag",
        title: "Signed in, but",
        titleAccent: "sync hit a snag.",
        body: "Your session is active but we couldn't save your draft. Try again, or head straight to your reports.",
      };
    default:
      return {
        eyebrow: "Something went wrong",
        title: "We hit a",
        titleAccent: "snag.",
        body: "Request a new sign-in link and we'll get you back on track.",
      };
  }
}
