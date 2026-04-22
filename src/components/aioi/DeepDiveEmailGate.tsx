import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendDeepDiveClaimLink } from "@/lib/report-claim";
import { SyncError } from "@/lib/sync";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254, "Email is too long");

export function DeepDiveEmailGate({ slug, level = "function", compact = false }: { slug: string; level?: string; compact?: boolean }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    void supabase.from("events").insert({ name: "deepdive_email_cta_viewed", payload: { slug, level } });
  }, [level, slug]);

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
      await sendDeepDiveClaimLink(parsed.data, slug, consentMarketing);
      setSentTo(parsed.data);
      toast({ title: "Check your inbox", description: "We sent a secure link to save this report and continue." });
    } catch (err) {
      toast({ title: err instanceof SyncError ? err.message : "Could not send the link.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="rounded-sm border border-brass/30 bg-brass/5 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass-bright mb-2">Link sent</p>
        <p className="font-display text-base text-cream/85">Check <span className="text-cream">{sentTo}</span>. Open the link to save this report and answer the Deep Dive.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "mt-7 space-y-4" : "mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start"}>
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
      </div>
      <Button type="submit" disabled={sending || !email} className="h-12 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-[0.18em] px-6">
        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</> : <><Mail className="h-4 w-4 mr-2" /> Email me a secure link <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
    </form>
  );
}

export function DeepDiveSignedInLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <>{children}</>;
}