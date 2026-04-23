export type AuthProvider = "google" | "apple";

export type AuthCallbackContext = {
  next?: string | null;
  claim?: string | null;
  consentMarketing?: boolean | null;
  email?: string | null;
  authMethod?: AuthProvider | null;
};

const PENDING_AUTH_CONTEXT_KEY = "aioi:pending_auth_context";

export function buildAuthCallbackUrl(context: AuthCallbackContext = {}) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", context.next || "/reports");
  if (context.claim) url.searchParams.set("claim", context.claim);
  if (context.claim || context.consentMarketing !== undefined) {
    url.searchParams.set("consent_marketing", context.consentMarketing ? "1" : "0");
  }
  if (context.email) url.searchParams.set("email", context.email);
  if (context.authMethod) url.searchParams.set("auth_method", context.authMethod);
  return url.toString();
}

export function persistAuthCallbackContext(context: AuthCallbackContext) {
  try {
    sessionStorage.setItem(PENDING_AUTH_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    /* no-op */
  }
}

export function resolveAuthCallbackContext(params: URLSearchParams): AuthCallbackContext {
  let pending: AuthCallbackContext = {};
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_AUTH_CONTEXT_KEY) || "{}") as AuthCallbackContext;
  } catch {
    pending = {};
  }

  const claim = params.get("claim") || pending.claim || null;
  const consentParam = params.get("consent_marketing");
  return {
    next: params.get("next") || pending.next || null,
    claim,
    consentMarketing: consentParam === null ? !!pending.consentMarketing : consentParam === "1",
    email: params.get("email") || pending.email || null,
    authMethod: (params.get("auth_method") as AuthProvider | null) || pending.authMethod || null,
  };
}

export function clearAuthCallbackContext() {
  try {
    sessionStorage.removeItem(PENDING_AUTH_CONTEXT_KEY);
  } catch {
    /* no-op */
  }
}