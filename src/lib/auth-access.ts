import { supabase } from "@/integrations/supabase/client";
import { SyncError } from "./sync";

export type AuthEmailState = "new" | "unconfirmed" | "confirmed" | "invalid_email" | "unknown";

export type AuthAccessOutcome = {
  email: string;
  state: AuthEmailState;
  emailType: "signin" | "confirmation";
};

type AuthStateRpcResult = {
  ok?: boolean;
  state?: AuthEmailState;
};

export async function getAuthEmailState(email: string): Promise<AuthEmailState> {
  const { data, error } = await supabase.rpc("get_auth_email_state" as never, { _email: email } as never);
  if (error) {
    console.warn("[auth-access] state lookup failed", error);
    return "unknown";
  }

  const result = data as unknown as AuthStateRpcResult | null;
  return result?.state ?? "unknown";
}

export async function sendAccessLink(email: string, redirectTo: string): Promise<AuthAccessOutcome> {
  const state = await getAuthEmailState(email);
  const shouldCreateUser = state !== "confirmed";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser,
    },
  });

  if (error) throw new SyncError(error.message, error);

  const emailType = state === "confirmed" ? "signin" : "confirmation";
  void supabase.from("events").insert({
    name: "auth_access_email_requested",
    payload: { state, expected_email_type: emailType, should_create_user: shouldCreateUser },
  });

  return { email, state, emailType };
}

export function authAccessCopy(outcome: Pick<AuthAccessOutcome, "state" | "emailType">) {
  if (outcome.emailType === "signin") {
    return {
      title: "Sign-in link sent",
      toast: "We sent a secure sign-in link.",
      body: "Open the link to sign in and pick up where you left off.",
      resend: "Resend sign-in link",
    };
  }

  if (outcome.state === "unconfirmed") {
    return {
      title: "Confirmation email sent",
      toast: "We sent a fresh confirmation email.",
      body: "This address already has an account, but the email still needs confirmation before sign-in works.",
      resend: "Resend confirmation email",
    };
  }

  return {
    title: "Confirmation email sent",
    toast: "We sent a confirmation email.",
    body: "Confirm your email first, then you’ll be signed in and returned here.",
    resend: "Resend confirmation email",
  };
}