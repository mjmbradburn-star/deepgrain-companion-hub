import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendMagicLink, SyncError } from "@/lib/sync";

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

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);

  // If already signed in, jump straight to "next"
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) navigate(next, { replace: true });
      else setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, [navigate, next]);

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
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      await sendMagicLink(parsed.data, redirectTo);
      setSentTo(parsed.data);
      setCooldown(COOLDOWN_SECONDS);
      toast({ title: "Check your inbox", description: "We just sent your sign-in link." });
    } catch (err) {
      const msg = err instanceof SyncError ? err.message : "Could not send link. Try again.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <AssessChrome ariaLabel="Sign in">
        <main className="container max-w-2xl w-full py-24" />
      </AssessChrome>
    );
  }

  return (
    <AssessChrome ariaLabel="Sign in">
      <main className="container max-w-xl w-full py-20 sm:py-28">
        <p className="eyebrow mb-5">Sign in</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          Pick up where<br />
          <span className="italic text-brass-bright">you left off.</span>
        </h1>
        <p className="mt-6 font-display text-lg text-cream/65 max-w-md">
          We'll email you a one-time link. No passwords, no accounts to manage.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
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
            ) : sentTo ? (
              <><Mail className="h-4 w-4 mr-2" /> Resend link</>
            ) : (
              <>Send sign-in link <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </form>

        {sentTo && (
          <div className="mt-8 rounded-sm border border-brass/30 bg-brass/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright mb-2">
              Link sent
            </p>
            <p className="font-display text-base text-cream/85">
              Check <span className="text-cream">{sentTo}</span>. Open the link on this device to sign in.
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
