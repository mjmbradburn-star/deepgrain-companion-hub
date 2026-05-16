import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { AssessChrome } from "@/components/aioi/AssessChrome";
import { Seo } from "@/components/aioi/Seo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
        trackEvent("auth_signup_success", { email });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        trackEvent("auth_signin_success", { email });
        navigate(redirectTo);
      }
    } catch (err: any) {
      setMessage(err.message || "Something went wrong.");
      trackEvent("auth_error", { mode, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage("Magic link sent. Check your email.");
      trackEvent("auth_magic_link_sent", { email });
    } catch (err: any) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssessChrome ariaLabel={mode === "signin" ? "Sign in" : "Create account"}>
      <Seo title={mode === "signin" ? "Sign in" : "Create account"} path="/signin" noindex />
      <main className="container max-w-md mx-auto py-16 sm:py-24 w-full">
        <h1 className="font-display text-3xl text-cream">
          {mode === "signin" ? "Sign in to AIOI" : "Create your account"}
        </h1>
        <p className="mt-2 font-display text-cream/60">
          {mode === "signin"
            ? "Access your saved results and download PDF reports."
            : "Save your archetype results and receive PDF reports by email."}
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label htmlFor="email" className="block font-ui text-xs uppercase tracking-[0.16em] text-cream/50 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-sm border border-cream/15 bg-surface-0/50 px-4 py-3 font-display text-cream placeholder:text-cream/30 focus:outline-none focus:border-brass/50"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-ui text-xs uppercase tracking-[0.16em] text-cream/50 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "signin"}
              className="w-full rounded-sm border border-cream/15 bg-surface-0/50 px-4 py-3 font-display text-cream placeholder:text-cream/30 focus:outline-none focus:border-brass/50"
              placeholder="········"
            />
          </div>

          {message && (
            <p className={`font-ui text-sm ${message.includes("Check") || message.includes("sent") ? "text-brass-bright" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-sm bg-brass text-walnut hover:bg-brass-bright font-ui text-sm uppercase tracking-wider"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                {mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-cream/15 text-cream hover:bg-cream/5 px-5 py-3 font-ui text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <Mail className="h-4 w-4" /> Send magic link
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
            className="text-center font-ui text-sm text-cream/50 hover:text-cream transition-colors"
          >
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </AssessChrome>
  );
}
