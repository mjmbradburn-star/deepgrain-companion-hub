import { supabase } from "@/integrations/supabase/client";
import { sendMagicLink, SyncError } from "./sync";

export type ClaimStatus = "claimed" | "already_owned" | "already_claimed" | "not_found" | "unauthorized" | "invalid_slug";

export interface ClaimReportResult {
  ok: boolean;
  status: ClaimStatus;
  respondent_id?: string;
  slug?: string;
}

export async function claimReportBySlug(slug: string, consentMarketing = false): Promise<ClaimReportResult> {
  const { data, error } = await supabase.rpc("claim_report_by_slug" as never, {
    _slug: slug,
    _consent_marketing: consentMarketing,
  } as never);
  if (error) throw new SyncError("Could not claim report", error);

  const result = data as unknown as ClaimReportResult | null;
  const ok = result?.ok === true;
  void supabase.from("events").insert({
    name: ok ? "report_claimed" : "report_claim_failed",
    payload: { slug, status: result?.status ?? "unknown" },
  });
  return result ?? { ok: false, status: "not_found" };
}

export async function sendDeepDiveClaimLink(email: string, slug: string, consentMarketing = false) {
  const next = `/assess/deep/${slug}`;
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&claim=${encodeURIComponent(slug)}&consent_marketing=${consentMarketing ? "1" : "0"}`;
  void supabase.from("events").insert({
    name: "deepdive_email_link_requested",
    payload: { slug, consent_marketing: consentMarketing },
  });
  const outcome = await sendMagicLink(email, redirectTo);
  void supabase.from("events").insert({
    name: "deepdive_email_link_sent",
    payload: { slug, consent_marketing: consentMarketing, auth_state: outcome.state, expected_email_type: outcome.emailType },
  });
  return outcome;
}