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
  "Exploring",
  "Deployed",
  "Integrated",
  "Leveraged",
  "AI-Native",
] as const;

export type TierLabel = (typeof TIER_LABELS)[number];

export const SCORE_BANDS: Array<{ max: number; tier: TierLabel }> = [
  { max: 14, tier: "Dormant" },
  { max: 32, tier: "Exploring" },
  { max: 54, tier: "Deployed" },
  { max: 74, tier: "Integrated" },
  { max: 89, tier: "Leveraged" },
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


export interface CapFlag {
  code: string;
  label: string;
  from: number;
  to: number;
  basis: string;
}

export interface CappedScore {
  tiers: Record<number, number>;
  capFlags: CapFlag[];
  benchmarkExcluded: boolean;
}

function answerMap(responses: Response[]): Map<string, number> {
  return new Map(responses.map((r) => [r.question_id, r.tier]));
}

function capQuestion(
  flags: CapFlag[],
  answers: Map<string, number>,
  targetId: string,
  basisId: string,
  maxDelta: number,
  code: string,
  label: string,
): void {
  const target = answers.get(targetId);
  const basis = answers.get(basisId);
  if (target === undefined || basis === undefined) return;
  const max = basis + maxDelta;
  if (target > max) {
    flags.push({ code, label, from: target, to: max, basis: `${targetId} capped by ${basisId}` });
  }
}

export function applyConsistencyCaps(
  tiers: Record<number, number>,
  responses: Response[],
): CappedScore {
  const adjusted: Record<number, number> = { ...tiers };
  const capFlags: CapFlag[] = [];
  const answers = answerMap(responses);

  const capPillar = (pillar: number, max: number, code: string, label: string, basis: string) => {
    if ((adjusted[pillar] ?? 0) > max) {
      capFlags.push({ code, label, from: adjusted[pillar], to: max, basis });
      adjusted[pillar] = Math.round(max * 10) / 10;
    }
  };

  capPillar(3, (adjusted[2] ?? 0) + 1, "tooling_data_cap", "Tooling capped by Data Foundations", "Tooling cannot outrun usable data by more than one tier.");
  capPillar(4, (adjusted[3] ?? 0) + 1, "workflow_tooling_cap", "Workflow capped by Tooling", "Workflow integration requires matching tooling infrastructure.");
  capPillar(4, (adjusted[5] ?? 0) + 1, "workflow_skills_cap", "Workflow capped by Skills", "Model-first workflows require operators who can run them.");
  capPillar(7, (adjusted[4] ?? 0) + 1, "measurement_workflow_cap", "Measurement capped by Workflow", "Reliable ROI depends on stable workflows.");
  capPillar(8, (adjusted[5] ?? 0) + 1, "culture_skills_cap", "Culture capped by Skills", "Adoption cannot outrun fluency by more than one tier.");

  const operatingReality = Math.max(0, Math.round(((adjusted[2] ?? 0) + (adjusted[3] ?? 0) + (adjusted[4] ?? 0) + (adjusted[5] ?? 0)) / 4));
  capPillar(6, operatingReality + 1, "governance_reality_cap", "Governance capped by operating reality", "Governance claims need matching data, tooling, workflow and skills maturity.");

  capQuestion(capFlags, answers, "qs-c-p3-agents", "qs-c-p3", 1, "agents_tooling_cap", "Agents capped by tooling");
  capQuestion(capFlags, answers, "c-p3-observability", "c-p3-orchestration", 0, "observability_orchestration_cap", "Observability capped by orchestration");
  capQuestion(capFlags, answers, "c-p3-toolconnect", "qs-c-p3-agents", 1, "toolconnect_agents_cap", "Tool connection capped by agents");
  capQuestion(capFlags, answers, "c-p2-corpus", "qs-c-p2", 1, "corpus_data_cap", "Corpus capped by data foundations");
  capQuestion(capFlags, answers, "c-p2-memory", "qs-c-p3-agents", 0, "memory_agents_cap", "Memory capped by agents");
  capQuestion(capFlags, answers, "c-p5-prompts", "qs-c-p5", 1, "prompts_skills_cap", "Prompts capped by skills");
  capQuestion(capFlags, answers, "c-p5-evals", "c-p3-observability", 1, "evals_observability_cap", "Evals capped by observability");
  capQuestion(capFlags, answers, "i-p3-agents", "qs-i-p5", 1, "personal_agents_skills_cap", "Personal agents capped by skills");

  return { tiers: adjusted, capFlags, benchmarkExcluded: capFlags.length >= 3 };
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
