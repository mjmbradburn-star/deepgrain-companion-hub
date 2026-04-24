import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";

type AdminState = {
  isReady: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
};

/**
 * Server-validated admin check. Calls the `has_role` SECURITY DEFINER
 * function via RPC. Never trusts client storage. Recomputes whenever the
 * authenticated user changes.
 */
export function useIsAdmin(): AdminState {
  const { isReady: authReady, user } = useAuthReady();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!authReady) return;
    if (!user) {
      setIsAdmin(false);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsAdmin(!error && data === true);
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  return { isReady: authReady && isReady, isAdmin, isAuthenticated: !!user };
}
