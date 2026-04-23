import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/aioi/Seo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendMagicLink, SyncError } from "@/lib/sync";
import { claimReportBySlug } from "@/lib/report-claim";
import { loadDraft } from "@/lib/assessment";
import { seoRoutes } from "@/lib/seo";
import { authAccessCopy, type AuthAccessOutcome } from "@/lib/auth-access";
import { lovable } from "@/integrations/lovable";
import { useAuthReady } from "@/hooks/use-auth-ready";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address" })
  .max(254, { message: "Email is too long" });

const COOLDOWN_SECONDS = 30;

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const next = params.get("next") || "/reports";
  const emailFromUrl = params.get("email") || "";
  const claimSlug = params.get("claim");
  const consentMarketing = params.get("consent_marketing") === "1";

  const [email, setEmail] = useState(() => {
    if (emailFromUrl) return emailFromUrl;
    try {
      return loadDraft().qualifier?.email ?? "";
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [sentOutcome, setSentOutcome] = useState<AuthAccessOutcome | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkError, setLinkError] = useState<{ title: string; body: string } | null>(null);
  const { isReady: authReady, session } = useAuthReady();

  // Detect error params bounced from the magic-link callback (Supabase puts
  // them in the hash, e.g. #error=access_denied&error_code=otp_expired).
  useEffect(() => {
    const hash = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
    );
    const code = hash.get("error_code") || params.get("error_code");
    const error = hash.get("error") || params.get("error");
    const desc = (hash.get("error_description") || params.get("error_description") || "").replace(/\+/g, " ");
    if (!code && !error) return;

    if (code === "otp_expired" || /expired/i.test(desc)) {
      setLinkError({
        title: "That sign-in link expired",
        body: "Sign-in links are valid for a short window. Enter your email below and we'll send a fresh one.",
      });
    } else if (code === "otp_invalid" || /invalid/i.test(desc)) {
      setLinkError({
        title: "We couldn't verify that link",
        body: "It may have already been used or opened in a different browser. Request a new link below.",
      });
    } else {
      setLinkError({
        title: "Sign-in didn't go through",
        body: desc || "Try requesting a new link below.",
      });
    }

    try {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    } catch {
      /* no-op */
    }
  }, [params]);

  // If already signed in, jump straight to "next"
  useEffect(() => {
    let cancelled = false;
    if (!authReady) return;
    (async () => {
      if (session) {
        if (claimSlug) await claimReportBySlug(claimSlug, consentMarketing).catch(() => null);
        if (cancelled) return;
        navigate(next, { replace: true });
      }
      else setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, [authReady, claimSlug, consentMarketing, navigate, next, session]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || submitting) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${claimSlug ? `&claim=${encodeURIComponent(claimSlug)}&consent_marketing=${consentMarketing ? "1" : "0"}` : ""}`;
      const outcome = await sendMagicLink(parsed.data, redirectTo);
      setSentOutcome(outcome);
      setCooldown(COOLDOWN_SECONDS);
      toast({ title: "Check your inbox", description: authAccessCopy(outcome).toast });
    } catch (err) {
      const msg = err instanceof SyncError ? err.message : "Could not send link. Try again.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    const redirect_uri = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${claimSlug ? `&claim=${encodeURIComponent(claimSlug)}&consent_marketing=${consentMarketing ? "1" : "0"}` : ""}&auth_method=${provider}`;
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri,
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });
    if (result.error) toast({ title: `${provider === "google" ? "Google" : "Apple"} sign-in failed`, description: result.error.message, variant: "destructive" });
  };

  const sentCopy = sentOutcome ? authAccessCopy(sentOutcome) : null;

  if (checkingSession) {
    return (
      <AssessChrome ariaLabel="Sign in">
        <main className="container max-w-2xl w-full py-24" />
      </AssessChrome>
    );
  }

  return (
    <AssessChrome ariaLabel="Sign in">
      <Seo {...seoRoutes.signin} />
      <main className="container max-w-xl w-full py-20 sm:py-28">
        <p className="eyebrow mb-5">Sign in</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          Pick up where<br />
          <span className="italic text-brass-bright">you left off.</span>
        </h1>
        <p className="mt-6 font-display text-lg text-cream/65 max-w-md">
          Use Google or Apple for the most reliable access. Email links are here as a backup.
        </p>

        {linkError && (
          <div
            role="alert"
            className="mt-8 rounded-sm border border-destructive/40 bg-destructive/10 p-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-destructive mb-2">
              {linkError.title}
            </p>
            <p className="font-display text-base text-cream/85">
              {linkError.body}
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-3">
          <Button
            type="button"
            onClick={() => signInWithProvider("google")}
            className="w-full h-12 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.2em]"
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => signInWithProvider("apple")}
            className="w-full h-12 rounded-sm border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:text-cream font-ui text-xs uppercase tracking-[0.2em]"
          >
            Continue with Apple
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-cream/10" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/35">email backup</span>
          <div className="h-px flex-1 bg-cream/10" />
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/50">
              Email
            </span>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={submitting}
              className="mt-2 h-12 bg-transparent border-cream/20 text-cream placeholder:text-cream/30 focus-visible:ring-brass-bright"
            />
          </label>

          <Button
            type="submit"
            disabled={submitting || cooldown > 0 || !email}
            className="w-full h-12 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.2em]"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</>
            ) : cooldown > 0 ? (
              <>Resend in {cooldown}s</>
            ) : sentOutcome ? (
              <><Mail className="h-4 w-4 mr-2" /> Resend link</>
            ) : (
              <>Send secure access link <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </form>

        {sentOutcome && sentCopy && (
          <div className="mt-8 rounded-sm border border-brass/30 bg-brass/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright mb-2">
              {sentCopy.title}
            </p>
            <p className="font-display text-base text-cream/85">
              Check <span className="text-cream">{sentOutcome.email}</span>. {sentCopy.body}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/55">
              Delivery can take up to a minute. Check spam or promotions if it is not visible.
            </p>
          </div>
        )}

        <p className="mt-12 font-mono text-[11px] text-cream/40">
          Don't have a report yet?{" "}
          <Link to="/assess" className="text-cream/70 hover:text-brass-bright underline underline-offset-4">
            Take the assessment
          </Link>
        </p>
      </main>
    </AssessChrome>
  );
}
