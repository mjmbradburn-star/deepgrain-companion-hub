import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "aioi_cookie_consent_v1";

export type AnalyticsEventName =
  | "seo_landing_viewed"
  | "primary_cta_clicked"
  | "assessment_level_selected"
  | "quickscan_started"
  | "quickscan_completed"
  | "report_viewed"
  | "deepdive_email_cta_viewed"
  | "deepdive_started"
  | "deepdive_completed"
  | "benchmark_filter_changed"
  | string;

export function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.choice === "accepted";
  } catch {
    return false;
  }
}

export function trackEvent(name: AnalyticsEventName, payload: Record<string, unknown> = {}, options: { optional?: boolean } = {}) {
  if (options.optional && !hasAnalyticsConsent()) return;
  void supabase.from("events").insert({
    name,
    payload: {
      ...payload,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      ts: new Date().toISOString(),
    },
  });
}