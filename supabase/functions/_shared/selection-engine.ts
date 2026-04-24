// Pure Selection Engine — deterministic, no Deno/Supabase deps so it's testable.
// Given a respondent's scored profile and the Playbook of Moves, picks the
// right Moves per the brief §6.

export type Lens = "individual" | "functional" | "organisational";
export type TierBand = "low" | "mid" | "high";
export type SizeBand = "S" | "M1" | "M2" | "M3" | "L1" | "L2" | "XL";

export interface Move {
  id: string;
  lens: Lens;
  pillar: number;
  tier_band: TierBand;
  function: string | null;
  size_bands: SizeBand[] | null;
  title: string;
  why_matters: string | null;
  what_to_do: string | null;
  how_to_know: string | null;
  effort: number | null; // 1-4
  tags: string[] | null;
  cta_type: string | null;
  cta_url: string | null;
  active: boolean;
  last_reviewed_at: string | null;
  // Legacy mirrors (still on outcomes_library):
  body?: string | null;
  applies_to_tier?: number | null;
}

export interface RespondentProfile {
  lens: Lens;
  function: string | null;
  size_band: SizeBand | null;
  pillar_tiers: Record<number, number>;
  cap_flag_pillars: number[]; // pillars whose prerequisite caps fired
}

export interface SelectedMove extends Move {
  score: number;
  role?: "forced_rank";
}

const PILLAR_WEIGHTS: Record<number, number> = {
  1: 0.14, 2: 0.14, 3: 0.12, 4: 0.14,
  5: 0.12, 6: 0.12, 7: 0.12, 8: 0.10,
};

const LENS_CAPS: Record<Lens, { min: number; max: number }> = {
  individual: { min: 3, max: 5 },
  functional: { min: 5, max: 7 },
  organisational: { min: 5, max: 6 }, // 5 + 1 forced rank
};

/** Map raw pillar score (0–5) to low/mid/high band. */
export function bandify(score: number): TierBand {
  if (score <= 1.4) return "low";
  if (score <= 3.4) return "mid";
  return "high";
}

/** Map respondents.level → lens. */
export function lensFromLevel(level: string | null | undefined): Lens {
  if (level === "individual") return "individual";
  if (level === "function") return "functional";
  return "organisational"; // 'company' or unknown
}

/** Top N weakest pillars by tier (ascending). */
export function topHotspotsForSelection(
  pillar_tiers: Record<number, number>,
  n = 3,
): Array<{ pillar: number; tier: number }> {
  return Object.entries(pillar_tiers)
    .map(([p, t]) => ({ pillar: Number(p), tier: t }))
    .filter((p) => p.tier > 0)
    .sort((a, b) => a.tier - b.tier)
    .slice(0, n);
}

function freshnessScore(last_reviewed_at: string | null): number {
  if (!last_reviewed_at) return 0.5;
  const ageDays = (Date.now() - new Date(last_reviewed_at).getTime()) / 86_400_000;
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.75;
  if (ageDays <= 180) return 0.5;
  return 0.25;
}

function effortBalanceScore(move: Move, currentSelection: SelectedMove[]): number {
  if (move.effort == null) return 0.5;
  // Reward effort levels under-represented in the current selection.
  const counts: Record<number, number> = {};
  for (const m of currentSelection) {
    if (m.effort != null) counts[m.effort] = (counts[m.effort] ?? 0) + 1;
  }
  const myCount = counts[move.effort] ?? 0;
  return 1 / (1 + myCount);
}

function tagRelevanceScore(move: Move, capPillars: number[]): number {
  if (capPillars.length === 0) return 0.5;
  // Boost moves on a pillar that's flagged as a prerequisite gap.
  return capPillars.includes(move.pillar) ? 1 : 0.4;
}

function sizeMatches(move: Move, size: SizeBand | null): boolean {
  if (!move.size_bands || move.size_bands.length === 0) return true;
  if (!size) return true; // unknown size — be permissive
  return move.size_bands.includes(size);
}

function functionMatches(move: Move, lens: Lens, fn: string | null): boolean {
  if (lens !== "functional") return move.function == null;
  // Functional lens: prefer exact match, but fallback to lens-base (function null) is allowed.
  return move.function == null || move.function === fn;
}

/** Main entry point. Pure function. */
export function selectMoves(
  profile: RespondentProfile,
  playbook: Move[],
): SelectedMove[] {
  const hotspots = topHotspotsForSelection(profile.pillar_tiers, 3);
  const hotspotPillars = new Set(hotspots.map((h) => h.pillar));

  // 1. Build candidate pool — filter to lens, hotspot pillars, tier band, function, size, active.
  const candidates: Move[] = [];
  for (const move of playbook) {
    if (!move.active) continue;
    if (move.lens !== profile.lens) continue;
    if (!hotspotPillars.has(move.pillar)) continue;
    const expectedBand = bandify(profile.pillar_tiers[move.pillar] ?? 0);
    if (move.tier_band !== expectedBand) continue;
    if (!functionMatches(move, profile.lens, profile.function)) continue;
    if (!sizeMatches(move, profile.size_band)) continue;
    candidates.push(move);
  }

  // 2. Greedy ranked selection with effort balancing + pillar spread.
  const cap = LENS_CAPS[profile.lens];
  const selected: SelectedMove[] = [];

  // Sort once by static portion (pillar weight, freshness, tag relevance) descending.
  const staticScored = candidates
    .map((m) => ({
      move: m,
      staticScore:
        0.40 * (PILLAR_WEIGHTS[m.pillar] ?? 0.12) +
        0.20 * freshnessScore(m.last_reviewed_at) +
        0.20 * tagRelevanceScore(m, profile.cap_flag_pillars),
    }))
    .sort((a, b) => b.staticScore - a.staticScore);

  // Greedy pass: prefer pillar spread until we hit the floor.
  for (const { move, staticScore } of staticScored) {
    const dynamicScore = staticScore + 0.20 * effortBalanceScore(move, selected);
    const pillarsSelected = new Set(selected.map((s) => s.pillar));
    const wouldOverlap = pillarsSelected.has(move.pillar);

    if (selected.length < cap.min) {
      // Below floor: prefer non-overlap, but accept anything if floor unreachable.
      if (!wouldOverlap || selected.length + (candidates.length - selected.length) <= cap.min) {
        selected.push({ ...move, score: dynamicScore });
      }
    } else if (selected.length < cap.max) {
      // Above floor: only add high-scoring spread.
      if (!wouldOverlap) {
        selected.push({ ...move, score: dynamicScore });
      }
    }
    if (selected.length >= cap.max) break;
  }

  // Backfill: if we're still under floor (e.g. pillar overlap rule kept us low), top up greedily.
  if (selected.length < cap.min) {
    const selectedIds = new Set(selected.map((s) => s.id));
    for (const { move, staticScore } of staticScored) {
      if (selectedIds.has(move.id)) continue;
      selected.push({ ...move, score: staticScore });
      if (selected.length >= cap.min) break;
    }
  }

  // 3. Forced-rank pick for organisational lens — the lowest pillar with the
  // highest blocking weight, picked from the existing selection (not a new fetch).
  if (profile.lens === "organisational" && selected.length > 0) {
    const blocker = [...selected].sort((a, b) => {
      const ta = profile.pillar_tiers[a.pillar] ?? 5;
      const tb = profile.pillar_tiers[b.pillar] ?? 5;
      if (ta !== tb) return ta - tb;
      return (PILLAR_WEIGHTS[b.pillar] ?? 0) - (PILLAR_WEIGHTS[a.pillar] ?? 0);
    })[0];
    if (blocker) blocker.role = "forced_rank";
  }

  return selected;
}
