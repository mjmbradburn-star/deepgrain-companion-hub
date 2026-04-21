import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Phase =
  | "validating"
  | "ready"           // valid token, awaiting confirmation click
  | "submitting"
  | "done"
  | "already"
  | "invalid"
  | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [phase, setPhase] = useState<Phase>("validating");
  const [error, setError] = useState<string | null>(null);

  // 1. Validate the token on mount.
  useEffect(() => {
    if (!token) {
      setPhase("invalid");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(
          token,
        )}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { apikey: SUPABASE_ANON },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404) {
          setPhase("invalid");
        } else if (data?.reason === "already_unsubscribed") {
          setPhase("already");
        } else if (data?.valid) {
          setPhase("ready");
        } else {
          setPhase("invalid");
        }
      } catch (err) {
        console.error("[unsubscribe] validate failed", err);
        if (!cancelled) {
          setPhase("error");
          setError(err instanceof Error ? err.message : "Could not reach the server.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setPhase("submitting");
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } },
      );
      if (invokeErr) throw invokeErr;
      if (data?.success) {
        setPhase("done");
      } else if (data?.reason === "already_unsubscribed") {
        setPhase("already");
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("[unsubscribe] confirm failed", err);
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not unsubscribe.");
    }
  };

  return (
    <div className="min-h-screen bg-walnut text-cream flex flex-col">
      <SiteNav />
      <main className="container max-w-xl flex-1 flex flex-col justify-center py-24">
        <p className="eyebrow mb-5">Email preferences</p>

        {phase === "validating" && (
          <div className="flex items-center gap-3 text-cream/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-display text-lg">Checking your link…</span>
          </div>
        )}

        {phase === "ready" && (
          <>
            <h1 className="font-display text-4xl text-cream leading-tight tracking-tight">
              Unsubscribe from Deepgrain emails?
            </h1>
            <p className="mt-5 font-display text-lg text-cream/70 leading-relaxed">
              We won't send you any more emails from this app. You can still
              access any reports you've already received.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Button
                onClick={confirm}
                className="h-11 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider"
              >
                Confirm unsubscribe
              </Button>
              <a
                href="/"
                className="font-ui text-xs uppercase tracking-[0.16em] text-cream/55 hover:text-cream"
              >
                Keep me subscribed
              </a>
            </div>
          </>
        )}

        {phase === "submitting" && (
          <div className="flex items-center gap-3 text-cream/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-display text-lg">Updating your preferences…</span>
          </div>
        )}

        {phase === "done" && (
          <>
            <h1 className="font-display text-4xl text-cream leading-tight tracking-tight">
              You're unsubscribed.
            </h1>
            <p className="mt-5 font-display text-lg text-cream/70">
              We won't email you again from this app. Sorry to see you go.
            </p>
          </>
        )}

        {phase === "already" && (
          <>
            <h1 className="font-display text-4xl text-cream leading-tight tracking-tight">
              Already unsubscribed.
            </h1>
            <p className="mt-5 font-display text-lg text-cream/70">
              This address is already off the list. Nothing more to do.
            </p>
          </>
        )}

        {phase === "invalid" && (
          <>
            <h1 className="font-display text-4xl text-cream leading-tight tracking-tight">
              This link is no longer valid.
            </h1>
            <p className="mt-5 font-display text-lg text-cream/70">
              The unsubscribe link may have expired or already been used. If you
              keep receiving emails, reply to one and we'll sort it out.
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className="font-display text-4xl text-cream leading-tight tracking-tight">
              Something snagged.
            </h1>
            <p className="mt-5 font-display text-lg text-cream/70">{error}</p>
            <div className="mt-8">
              <Button
                onClick={() => window.location.reload()}
                className="h-11 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-xs uppercase tracking-wider"
              >
                Try again
              </Button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
