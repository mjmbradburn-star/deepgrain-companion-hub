// Pure scoring helpers — no Deno/Supabase deps so they're trivially testable.

export const PILLAR_NAMES: Record<number, string> = {
  1: "Strategy & Mandate",
  2: "Data Foundations",
  3: "Tooling & Infrastructure",
  4: "Workflow Integration",
  5: "Skills & Fluency",
  6: "Governance & Risk",
  7: "Measurement & ROI",
  8: "Culture & Adoption",
};

// Causal weighting — Strategy / Data / Workflow upstream of the rest.
export const PILLAR_WEIGHTS: Record<number, number> = {
  1: 0.14, 2: 0.14, 3: 0.12, 4: 0.14,
  5: 0.12, 6: 0.12, 7: 0.12, 8: 0.10,
};

export const TIER_LABELS = [
  "Dormant",
  "Reactive",
  "Exploratory",
  "Operational",
  "Integrated",
  "AI-Native",
] as const;

export type TierLabel = (typeof TIER_LABELS)[number];

export const SCORE_BANDS: Array<{ max: number; tier: TierLabel }> = [
  { max: 14, tier: "Dormant" },
  { max: 29, tier: "Reactive" },
  { max: 49, tier: "Exploratory" },
  { max: 69, tier: "Operational" },
  { max: 87, tier: "Integrated" },
  { max: 100, tier: "AI-Native" },
];

export function tierForScore(score: number): TierLabel {
  return SCORE_BANDS.find((b) => score <= b.max)!.tier;
}

export function tierLabel(idx: number): TierLabel {
  return TIER_LABELS[Math.max(0, Math.min(5, idx))];
}

export interface Response { question_id: string; tier: number }
export interface Hotspot {
  pillar: number;
  name: string;
  tier: number;
  tierLabel: TierLabel;
}

/** Mean tier per pillar, rounded to 1dp. Pillars with no answers report 0. */
export function pillarTiers(
  responses: Response[],
  pillarOf: Map<string, number>,
): { tiers: Record<number, number>; answered: Set<number> } {
  const sums: Record<number, { sum: number; n: number }> = {};
  for (const r of responses) {
    const p = pillarOf.get(r.question_id);
    if (!p) continue;
    sums[p] ??= { sum: 0, n: 0 };
    sums[p].sum += r.tier;
    sums[p].n += 1;
  }
  const tiers: Record<number, number> = {};
  const answered = new Set<number>();
  for (let p = 1; p <= 8; p++) {
    const agg = sums[p];
    tiers[p] = agg ? Math.round((agg.sum / agg.n) * 10) / 10 : 0;
    if (agg) answered.add(p);
  }
  return { tiers, answered };
}

/** Weighted 0–100 AIOI. Only counts pillars the respondent actually answered. */
export function aioiScore(
  tiers: Record<number, number>,
  answered: Set<number>,
  weights: Record<number, number> = PILLAR_WEIGHTS,
): number {
  let weighted = 0;
  let weightUsed = 0;
  for (let p = 1; p <= 8; p++) {
    if (answered.has(p)) {
      weighted += (tiers[p] / 5) * 100 * weights[p];
      weightUsed += weights[p];
    }
  }
  return Math.round(weightUsed > 0 ? weighted / weightUsed : 0);
}

/** Up to 3 weakest pillars; ties at the cutoff are included (then trimmed). */
export function topHotspots(tiers: Record<number, number>, max = 3): Hotspot[] {
  const ranked = Object.entries(tiers)
    .map(([p, t]) => ({ pillar: Number(p), tier: t }))
    .sort((a, b) => a.tier - b.tier);
  if (ranked.length === 0) return [];
  const cutoff = ranked[Math.min(max - 1, ranked.length - 1)].tier;
  return ranked
    .filter((r) => r.tier <= cutoff)
    .slice(0, max)
    .map((r) => ({
      pillar: r.pillar,
      name: PILLAR_NAMES[r.pillar],
      tier: r.tier,
      tierLabel: tierLabel(Math.round(r.tier)),
    }));
}

export function fallbackDiagnosis(
  tier: TierLabel,
  hotspots: Array<{ name: string }>,
): string {
  const weakest = hotspots[0]?.name ?? "the operating model";
  return `Operating at ${tier}. The drag is in ${weakest} — that's where the next quarter has to land.`;
}

export interface Outcome {
  id: string;
  pillar: number;
  applies_to_tier: number;
  title: string;
}

export interface PlanMonth {
  month: number;
  title: string;
  rationale: string;
  outcome_ids: string[];
}

export function fallbackPlan(
  hotspots: Array<{ pillar: number; tier: number }>,
  outcomes: Outcome[],
): PlanMonth[] {
  const months: PlanMonth[] = [];
  for (let m = 1; m <= 3; m++) {
    const target = hotspots.length
      ? hotspots[(m - 1) % hotspots.length]
      : { pillar: 1, tier: 0 };
    const candidates = outcomes
      .filter((o) => o.pillar === target.pillar && o.applies_to_tier >= Math.floor(target.tier))
      .slice(0, 2);
    months.push({
      month: m,
      title: candidates[0]?.title ?? `Month ${m}`,
      rationale:
        "Foundations first, then leverage. This month tackles the lowest-scoring pillar.",
      outcome_ids: candidates.map((c) => c.id),
    });
  }
  return months;
}
