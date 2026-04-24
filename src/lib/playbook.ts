import type { Database } from "@/integrations/supabase/types";

export type Move = Database["public"]["Tables"]["outcomes_library"]["Row"];
export type MoveInsert = Database["public"]["Tables"]["outcomes_library"]["Insert"];
export type MoveUpdate = Database["public"]["Tables"]["outcomes_library"]["Update"];

export const LENSES = ["individual", "organisational", "functional"] as const;
export type Lens = (typeof LENSES)[number];

export const TIER_BANDS = ["low", "mid", "high"] as const;
export type TierBand = (typeof TIER_BANDS)[number];

export const PILLARS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Pillar = (typeof PILLARS)[number];

export const FUNCTIONS = [
  "revops",
  "marketing",
  "engineering-product",
  "people-hr",
  "finance",
  "ops-cs",
  "legal",
] as const;
export type Func = (typeof FUNCTIONS)[number];

export const SIZE_BANDS = ["S", "M1", "M2", "M3", "L1", "L2", "XL"] as const;

export const FUNCTION_LABELS: Record<Func, string> = {
  revops: "RevOps",
  marketing: "Marketing",
  "engineering-product": "Engineering & Product",
  "people-hr": "People & HR",
  finance: "Finance",
  "ops-cs": "Operations & CS",
  legal: "Legal",
};

export const TIER_BAND_LABELS: Record<TierBand, string> = {
  low: "Low (T0–T1)",
  mid: "Mid (T2–T3)",
  high: "High (T4–T5)",
};

export const LENS_LABELS: Record<Lens, string> = {
  individual: "Individual",
  organisational: "Organisational",
  functional: "Functional",
};
