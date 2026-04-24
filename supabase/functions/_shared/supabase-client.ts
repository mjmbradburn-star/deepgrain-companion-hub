// Shared Supabase client factories for edge functions.
//
// Why this exists:
//   - Pins the @supabase/supabase-js version in one place (no per-function drift).
//   - Wires the generated `Database` type so `from(...)` / `rpc(...)` return
//     typed rows without per-call casts.
//   - Centralises the "user JWT vs service role" choice so the wrong key
//     can't accidentally be used for ownership-sensitive reads.
//
// Why this is *not* a Zod-validated query wrapper:
//   - Postgres rows are already typed via `Database`; runtime re-validation on
//     every read is overhead with no payoff.
//   - JSONB columns and request bodies *are* untrusted boundaries — validate
//     those locally with Zod where you parse them (see email-report-pdf for the
//     pattern).
//
// Adoption: new edge functions should import from here. Existing functions
// can migrate opportunistically; there are no `as any` casts on supabase
// client calls today, so a forced migration would be churn for no gain.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Database } from "../../../src/integrations/supabase/types.ts";

export type TypedSupabaseClient = SupabaseClient<Database>;

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

/**
 * Service-role client. Bypasses RLS — only use for trusted server-side
 * operations that have already enforced their own authorisation.
 */
export function createAdminClient(): TypedSupabaseClient {
  return createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

/**
 * Caller-scoped client. Forwards the request's `Authorization` header so RLS
 * runs against the user's JWT — use this whenever you need ownership checks.
 * Returns `null` if the request has no Authorization header.
 */
export function createUserClient(req: Request): TypedSupabaseClient | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    },
  );
}
