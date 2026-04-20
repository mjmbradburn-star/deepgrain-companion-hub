// Shared helpers for reading and matching benchmarks_materialised rows.
// Used by both the Benchmarks page and the Assess Report.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Level = Database["public"]["Enums"]["assessment_level"];

export type BenchmarkRow = Database["public"]["Tables"]["benchmarks_materialised"]["Row"] & {
  function?: string | null;
  region?: string | null;
};

/** Respondents store function as a lowercase id (e.g. `engineering-product`),
 *  but `benchmarks_materialised.function` stores display labels (e.g.
 *  `Engineering & Product`). Translate id → label so slice matching works.
 *  Unknown ids pass through unchanged. `ops-cs` is intentionally absent —
 *  it has no single corresponding benchmark slice, so it falls through to
 *  the level-wide cohort. */
const FUNCTION_ID_TO_LABEL: Record<string, string> = {
  "sales": "Sales",
  "marketing": "Marketing",
  "engineering-product": "Engineering & Product",
  "people-hr": "People & HR",
  "finance": "Finance",
};

function normaliseFunction(fn: string | null | undefined): string | null {
  if (!fn) return null;
  return FUNCTION_ID_TO_LABEL[fn] ?? fn;
}

/** `pillar_medians` JSON comes in two shapes:
 *   shape A (legacy seed): `{ "1": 2.4 }`
 *   shape B (current):     `{ "1": { "name": "...", "tier": 2.4 } }`
 *  Normalise both to a number, or null. */
export function readPillarTier(raw: unknown, pillar: number): number | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>)[String(pillar)];
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "tier" in v) {
    const t = (v as { tier: unknown }).tier;
    if (typeof t === "number") return t;
    if (typeof t === "string") {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

export function pillarsFromRow(row: BenchmarkRow): Record<number, number> {
  const out: Record<number, number> = {};
  for (let p = 1; p <= 8; p++) {
    const v = readPillarTier(row.pillar_medians, p);
    if (v != null) out[p] = v;
  }
  return out;
}

export interface MatchedSlice {
  row: BenchmarkRow;
  /** Human-readable label for which slice we matched, e.g. "Sales · North America". */
  label: string;
  /** How specific the match is (higher = better). */
  specificity: number;
}

/**
 * Find the most specific benchmark row for a respondent's function + region,
 * falling back through progressively broader slices.
 *
 * Priority:
 *   1. function + region match (most specific)
 *   2. function only
 *   3. region only
 *   4. level only (broadest)
 */
export async function fetchBestSlice({
  level,
  function: fn,
  region,
}: {
  level: Level;
  function?: string | null;
  region?: string | null;
}): Promise<MatchedSlice | null> {
  const { data, error } = await supabase
    .from("benchmarks_materialised")
    .select("*")
    .eq("level", level)
    .order("refreshed_at", { ascending: false });

  if (error || !data) {
    if (error) console.warn("[benchmarks] fetchBestSlice failed", error);
    return null;
  }

  const rows = data as BenchmarkRow[];

  // Helper: find first row that matches the predicate.
  const find = (pred: (r: BenchmarkRow) => boolean) => rows.find(pred);

  if (fn && region) {
    const r = find(
      (x) => x.function === fn && x.region === region && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: `${fn} · ${region}`, specificity: 3 };
  }
  if (fn) {
    const r = find(
      (x) => x.function === fn && !x.region && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: fn, specificity: 2 };
  }
  if (region) {
    const r = find(
      (x) => x.region === region && !x.function && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: region, specificity: 2 };
  }
  // Level-wide fallback: a row with no secondary dimensions set.
  const r = find(
    (x) => !x.function && !x.region && !x.size_band && !x.sector,
  );
  if (r) return { row: r, label: `All ${level}-level respondents`, specificity: 1 };

  // Last resort: the most recent row at this level.
  if (rows[0]) return { row: rows[0], label: `${level} cohort`, specificity: 0 };
  return null;
}
