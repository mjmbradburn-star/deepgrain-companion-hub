import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthAccessPanel } from "@/components/aioi/AuthAccessPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendDeepDiveClaimLink } from "@/lib/report-claim";
import { SyncError } from "@/lib/sync";
import { authAccessCopy, type AuthAccessOutcome } from "@/lib/auth-access";
import { lovable } from "@/integrations/lovable";
import { buildAuthCallbackUrl, persistAuthCallbackContext } from "@/lib/auth-callback-url";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254, "Email is too long");

export function DeepDiveEmailGate({ slug, level = "function", compact = false }: { slug: string; level?: string; compact?: boolean }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentOutcome, setSentOutcome] = useState<AuthAccessOutcome | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    void supabase.from("events").insert({ name: "deepdive_email_cta_viewed", payload: { slug, level } });
  }, [level, slug]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const outcome = await sendDeepDiveClaimLink(parsed.data, slug, consentMarketing);
      setSentOutcome(outcome);
      setCooldown(30);
      toast({ title: "Check your inbox", description: `${authAccessCopy(outcome).toast} It will save this report and continue the Deep Dive.` });
    } catch (err) {
      toast({ title: err instanceof SyncError ? err.message : "Could not send the link.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    const context = { next: `/assess/deep/${slug}`, claim: slug, consentMarketing, authMethod: provider };
    persistAuthCallbackContext(context);
    const redirect_uri = buildAuthCallbackUrl(context);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri,
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });
    if (result.error) toast({ title: `${provider === "google" ? "Google" : "Apple"} sign-in failed`, description: result.error.message, variant: "destructive" });
  };

  if (sentOutcome) {
    const copy = authAccessCopy(sentOutcome);
    return (
      <div className="rounded-sm border border-brass/30 bg-brass/5 p-5">
        <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright">
          <CheckCircle2 className="h-4 w-4" /> {copy.title}
        </p>
        <p className="font-display text-base leading-relaxed text-cream/85">
          Check <span className="text-cream">{sentOutcome.email}</span>. {copy.body} It will save this report and continue the Deep Dive.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-cream/55">
          Delivery can take up to a minute. If it is not there, check spam or promotions, then resend below.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            disabled={sending || cooldown > 0}
            onClick={() => {
              void supabase.from("events").insert({ name: "deepdive_email_resend_clicked", payload: { slug } });
              void submit({ preventDefault: () => undefined } as React.FormEvent);
            }}
            className="h-11 rounded-sm bg-brass px-5 font-ui text-xs uppercase tracking-[0.18em] text-walnut hover:bg-brass-bright"
          >
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</> : cooldown > 0 ? <>Resend in {cooldown}s</> : <><RefreshCw className="h-4 w-4 mr-2" /> Resend secure link</>}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSentOutcome(null);
              setCooldown(0);
            }}
            className="h-11 rounded-sm border-cream/20 bg-transparent px-5 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:bg-cream/5 hover:text-cream"
          >
            Try another email
          </Button>
          <Button
            asChild
            type="button"
            variant="outline"
            className="h-11 rounded-sm border-cream/20 bg-transparent px-5 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:bg-cream/5 hover:text-cream"
          >
            <Link to={`/assess/r/${slug}`}>Back to report</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider("google")}
          className="mt-3 h-11 w-full rounded-sm border-cream/20 bg-transparent px-5 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:bg-cream/5 hover:text-cream"
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider("apple")}
          className="mt-3 h-11 w-full rounded-sm border-cream/20 bg-transparent px-5 font-ui text-xs uppercase tracking-[0.18em] text-cream hover:bg-cream/5 hover:text-cream"
        >
          Continue with Apple
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-7 space-y-4" : "mt-8 space-y-5"}>
      <AuthAccessPanel onProvider={signInWithProvider} compact={compact}>
      <form onSubmit={submit} className={compact ? "space-y-4" : "grid gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"}>
      <div className="min-w-0">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/50">Email</span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            disabled={sending}
            className="mt-2 h-12 bg-transparent border-cream/20 text-cream placeholder:text-cream/30 focus-visible:ring-brass-bright"
          />
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm leading-snug text-cream/55">
          <input
            type="checkbox"
            checked={consentMarketing}
            onChange={(event) => setConsentMarketing(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brass"
          />
          Send me occasional AI operating-model notes from Deepgrain.
        </label>
        <p className="mt-3 text-sm leading-relaxed text-cream/45">
          If Google or Apple is not convenient, we can send a secure email link. First-time users may need to confirm their address first.
        </p>
      </div>
      <Button
        type="submit"
        disabled={sending || !email}
        className={`h-12 w-full rounded-sm bg-brass px-6 font-ui text-xs uppercase tracking-[0.18em] text-walnut hover:bg-brass-bright ${compact ? "" : "lg:mt-[22px] lg:w-auto"}`}
      >
        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</> : <><Mail className="h-4 w-4 mr-2" /> Send secure sign-in link <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
      </form>
      </AuthAccessPanel>
    </div>
  );
}
