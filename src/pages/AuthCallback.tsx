import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssessChrome } from "@/components/aioi/AssessChrome";

/**
 * Handles the magic-link redirect target. Supabase parses the access_token
 * from the URL hash automatically (detectSessionInUrl is on by default). Once
 * the session resolves we send the user back to /assess/processing where the
 * sync flow will pick up.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/assess/processing", { replace: true });
    });

    // Edge case: session already in place by the time we mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/assess/processing", { replace: true });
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <AssessChrome ariaLabel="Signing you in">
      <main className="container max-w-2xl w-full py-24">
        <p className="eyebrow mb-5">Signing you in</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream leading-tight tracking-tight">
          One moment.<br />
          <span className="italic text-brass-bright">Resuming your assessment.</span>
        </h1>
      </main>
    </AssessChrome>
  );
}
