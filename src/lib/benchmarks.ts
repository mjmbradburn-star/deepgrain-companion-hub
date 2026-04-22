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
  matchType?: "exact-size" | "adjacent-size" | "function-region" | "function" | "region" | "broad" | "approximate";
  cohortNote?: string;
  lockedReason?: string;
}

const SIZE_BAND_LABELS: Record<string, string> = {
  S: "Early-stage (1–50 people)",
  M1: "Early scale-up (51–100 people)",
  M2: "Mid scale-up (101–200 people)",
  M3: "Late scale-up (201–500 people)",
  L1: "Growth (501–1,000 people)",
  L2: "Upper-mid-market (1,001–2,000 people)",
  XL: "Enterprise (2,001+ people)",
};

const COMBINED_SIZE_BANDS: Record<string, string[]> = {
  S: ["S", "M1", "M2"],
  M1: ["S", "M1", "M2"],
  M2: ["M1", "M2", "M3"],
  M3: ["M2", "M3", "L1"],
  L1: ["M3", "L1", "L2"],
  L2: ["L1", "L2", "XL"],
  XL: ["L1", "L2", "XL"],
};

export function sizeBandLabel(code: string | null | undefined): string {
  if (!code) return "Unknown size band";
  return SIZE_BAND_LABELS[code] ?? `Size band ${code}`;
}

function rollupSizeBand(rows: BenchmarkRow[], bands: string[]): BenchmarkRow | null {
  const exactRows = rows.filter((x) => bands.includes(String(x.size_band ?? "")) && !x.function && !x.region && !x.sector);
  if (!exactRows.length) return null;
  const sampleSize = exactRows.reduce((sum, row) => sum + row.sample_size, 0);
  if (sampleSize < 20) return null;
  const weightedMedian = exactRows.reduce((sum, row) => sum + Number(row.median_score ?? 0) * row.sample_size, 0) / sampleSize;
  const pillar_medians: Record<string, { name: string; tier: number }> = {};
  for (let pillar = 1; pillar <= 8; pillar++) {
    const weightedTier = exactRows.reduce((sum, row) => sum + (readPillarTier(row.pillar_medians, pillar) ?? 0) * row.sample_size, 0) / sampleSize;
    pillar_medians[String(pillar)] = { name: `Pillar ${pillar}`, tier: Math.round(weightedTier * 10) / 10 };
  }
  return { ...exactRows[0], id: `combined-${bands.join("-")}`, size_band: bands.join("+"), sample_size: sampleSize, median_score: Math.round(weightedMedian * 100) / 100, pillar_medians };
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
  function: fnRaw,
  region,
  sizeBand,
}: {
  level: Level;
  function?: string | null;
  region?: string | null;
  sizeBand?: string | null;
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

  return selectBestSliceFromRows({ rows: data as BenchmarkRow[], level, function: fnRaw, region, sizeBand });
}

export function selectBestSliceFromRows({
  rows,
  level,
  function: fnRaw,
  region,
  sizeBand,
}: {
  rows: BenchmarkRow[];
  level: Level;
  function?: string | null;
  region?: string | null;
  sizeBand?: string | null;
}): MatchedSlice | null {
  const fn = normaliseFunction(fnRaw);
  const totalBase = rows.find((x) => !x.function && !x.region && !x.size_band && !x.sector)?.sample_size ?? 0;
  if (totalBase > 0 && totalBase < 50) {
    return {
      row: rows[0],
      label: `All ${level}-level respondents`,
      specificity: 0,
      lockedReason: `Benchmark unlocks at 50 responses in your size band. Currently at N=${totalBase}. Check back soon.`,
    };
  }

  // Helper: find first row that matches the predicate.
  const find = (pred: (r: BenchmarkRow) => boolean) => rows.find(pred);

  if (sizeBand) {
    const exact = find((x) => x.size_band === sizeBand && !x.function && !x.region && !x.sector);
    if (exact && exact.sample_size >= 20) {
      return { row: exact, label: sizeBandLabel(sizeBand), specificity: 4, matchType: "exact-size", cohortNote: `Exact size-band cohort · N=${exact.sample_size}` };
    }
    const combinedBands = COMBINED_SIZE_BANDS[sizeBand] ?? [sizeBand];
    const combined = rollupSizeBand(rows, combinedBands);
    if (combined) {
      return { row: combined, label: combinedBands.map(sizeBandLabel).join(" + "), specificity: 3, matchType: "adjacent-size", cohortNote: `Combined adjacent size-band cohort · N=${combined.sample_size}` };
    }
  }

  if (fn && region) {
    const r = find(
      (x) => x.function === fn && x.region === region && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: `${fn} · ${region}`, specificity: 3, matchType: "function-region", cohortNote: `Matched function and region · N=${r.sample_size}` };
  }
  if (fn) {
    const r = find(
      (x) => x.function === fn && !x.region && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: fn, specificity: 2, matchType: "function", cohortNote: `Matched function cohort · N=${r.sample_size}` };
  }
  if (region) {
    const r = find(
      (x) => x.region === region && !x.function && !x.size_band && !x.sector,
    );
    if (r) return { row: r, label: region, specificity: 2, matchType: "region", cohortNote: `Matched regional cohort · N=${r.sample_size}` };
  }
  // Level-wide fallback: a row with no secondary dimensions set.
  const r = find(
    (x) => !x.function && !x.region && !x.size_band && !x.sector,
  );
  if (r) return { row: r, label: `All ${level}-level respondents`, specificity: 1, matchType: "broad", cohortNote: `Broad level-wide cohort · N=${r.sample_size}` };

  // Last resort: the most recent row at this level.
  if (rows[0]) return { row: rows[0], label: `${level} cohort`, specificity: 0, matchType: "approximate" };
  return null;
}
