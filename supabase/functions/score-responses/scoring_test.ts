// Unit tests for the pure scoring helpers used by the score-responses edge fn.
// Run with: deno test supabase/functions/score-responses/scoring_test.ts
import {
  assertEquals,
  assertAlmostEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  PILLAR_NAMES,
  PILLAR_WEIGHTS,
  SCORE_BANDS,
  aioiScore,
  fallbackDiagnosis,
  fallbackPlan,
  pillarTiers,
  tierForScore,
  tierLabel,
  topHotspots,
  type Outcome,
} from "./scoring.ts";

// Helper: build a pillarOf map from a flat (id -> pillar) record.
function mapOf(rec: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(rec));
}

// ─── tierForScore ───────────────────────────────────────────────────────────
Deno.test("tierForScore — band boundaries map to the correct label", () => {
  assertEquals(tierForScore(0), "Dormant");
  assertEquals(tierForScore(14), "Dormant");
  assertEquals(tierForScore(15), "Exploring");
  assertEquals(tierForScore(32), "Exploring");
  assertEquals(tierForScore(33), "Deployed");
  assertEquals(tierForScore(54), "Deployed");
  assertEquals(tierForScore(55), "Integrated");
  assertEquals(tierForScore(74), "Integrated");
  assertEquals(tierForScore(75), "Leveraged");
  assertEquals(tierForScore(89), "Leveraged");
  assertEquals(tierForScore(90), "AI-Native");
  assertEquals(tierForScore(100), "AI-Native");
});

Deno.test("tierLabel — clamps out-of-range tier indices", () => {
  assertEquals(tierLabel(-3), "Dormant");
  assertEquals(tierLabel(0), "Dormant");
  assertEquals(tierLabel(2), "Deployed");
  assertEquals(tierLabel(5), "AI-Native");
  assertEquals(tierLabel(99), "AI-Native");
});

// ─── pillarTiers (averaging) ────────────────────────────────────────────────
Deno.test("pillarTiers — averages answers within each pillar to 1dp", () => {
  const pillarOf = mapOf({
    "p1-a": 1, "p1-b": 1,        // 2 + 4 → 3.0
    "p2-a": 2, "p2-b": 2, "p2-c": 2, // 1 + 2 + 5 → 2.7 (rounded)
    "p3-a": 3,                    // single answer → 4.0
  });
  const responses = [
    { question_id: "p1-a", tier: 2 },
    { question_id: "p1-b", tier: 4 },
    { question_id: "p2-a", tier: 1 },
    { question_id: "p2-b", tier: 2 },
    { question_id: "p2-c", tier: 5 },
    { question_id: "p3-a", tier: 4 },
  ];
  const { tiers, answered } = pillarTiers(responses, pillarOf);
  assertEquals(tiers[1], 3);
  assertEquals(tiers[2], 2.7);
  assertEquals(tiers[3], 4);
  // Unanswered pillars report 0 and are NOT in the answered set.
  assertEquals(tiers[4], 0);
  assertEquals(answered.has(1), true);
  assertEquals(answered.has(4), false);
  assertEquals(answered.size, 3);
});

Deno.test("pillarTiers — ignores responses for unknown question ids", () => {
  const pillarOf = mapOf({ "p1-a": 1 });
  const { tiers, answered } = pillarTiers(
    [
      { question_id: "p1-a", tier: 3 },
      { question_id: "ghost", tier: 5 }, // not in map → skipped
    ],
    pillarOf,
  );
  assertEquals(tiers[1], 3);
  assertEquals(answered.size, 1);
});

// ─── aioiScore (weighted) ───────────────────────────────────────────────────
Deno.test("aioiScore — all pillars at tier 5 yields 100", () => {
  const tiers: Record<number, number> = {};
  const answered = new Set<number>();
  for (let p = 1; p <= 8; p++) { tiers[p] = 5; answered.add(p); }
  assertEquals(aioiScore(tiers, answered), 100);
});

Deno.test("aioiScore — all pillars at tier 0 yields 0", () => {
  const tiers: Record<number, number> = {};
  const answered = new Set<number>();
  for (let p = 1; p <= 8; p++) { tiers[p] = 0; answered.add(p); }
  assertEquals(aioiScore(tiers, answered), 0);
});

Deno.test("aioiScore — uniform tier 3 across all 8 pillars yields 60", () => {
  // 3/5 * 100 = 60, weights normalise to 1.
  const tiers: Record<number, number> = {};
  const answered = new Set<number>();
  for (let p = 1; p <= 8; p++) { tiers[p] = 3; answered.add(p); }
  assertEquals(aioiScore(tiers, answered), 60);
});

Deno.test("aioiScore — only weights answered pillars (partial fill)", () => {
  // Answer just P1 and P8 at tier 4 → expected 80 (weight-normalised).
  const tiers: Record<number, number> = { 1: 4, 8: 4 };
  for (let p = 2; p <= 7; p++) tiers[p] = 0;
  const answered = new Set<number>([1, 8]);
  // (4/5)*100 = 80 for both pillars; weighted average = 80 regardless of weights.
  assertEquals(aioiScore(tiers, answered), 80);
});

Deno.test("aioiScore — heavier weights pull score toward upstream pillars", () => {
  // P1 (weight .14) at tier 5; P8 (weight .10) at tier 0 — partial fill.
  const tiers: Record<number, number> = { 1: 5, 8: 0 };
  const answered = new Set<number>([1, 8]);
  const score = aioiScore(tiers, answered);
  // Expected: (5/5)*100*.14 + (0/5)*100*.10 = 14, weight used = .24
  // → 14 / .24 ≈ 58.3 → rounds to 58.
  assertEquals(score, 58);
});

Deno.test("aioiScore — empty answered set returns 0", () => {
  assertEquals(aioiScore({}, new Set()), 0);
});

Deno.test("aioiScore — accepts custom weight overrides", () => {
  const tiers: Record<number, number> = { 1: 5, 2: 0 };
  const answered = new Set([1, 2]);
  // Equal weights → 50; weight P1 4× → closer to 80.
  assertEquals(
    aioiScore(tiers, answered, { 1: 0.5, 2: 0.5, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }),
    50,
  );
  assertEquals(
    aioiScore(tiers, answered, { 1: 0.8, 2: 0.2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }),
    80,
  );
});

// ─── topHotspots ────────────────────────────────────────────────────────────
Deno.test("topHotspots — returns the 3 weakest pillars in ascending order", () => {
  const tiers: Record<number, number> = {
    1: 4, 2: 1, 3: 3, 4: 0, 5: 5, 6: 2, 7: 4, 8: 3,
  };
  const hs = topHotspots(tiers, 3);
  assertEquals(hs.length, 3);
  assertEquals(hs.map((h) => h.pillar), [4, 2, 6]); // tiers 0, 1, 2
  assertEquals(hs[0].name, PILLAR_NAMES[4]);
  assertEquals(hs[0].tierLabel, "Dormant");
  assertEquals(hs[1].tierLabel, "Exploring");
});

Deno.test("topHotspots — ties at the cutoff are trimmed to max", () => {
  // Five pillars all tied at the lowest tier; we still cap at 3.
  const tiers: Record<number, number> = {
    1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 5, 7: 5, 8: 5,
  };
  const hs = topHotspots(tiers, 3);
  assertEquals(hs.length, 3);
  for (const h of hs) assertEquals(h.tier, 1);
});

Deno.test("topHotspots — empty tiers map returns empty array", () => {
  assertEquals(topHotspots({}, 3), []);
});

// ─── fallback copy ──────────────────────────────────────────────────────────
Deno.test("fallbackDiagnosis — names tier and weakest pillar", () => {
  const txt = fallbackDiagnosis("Exploring", [{ name: "Data Foundations" }]);
  assertStringIncludes(txt, "Exploring");
  assertStringIncludes(txt, "Data Foundations");
});

Deno.test("fallbackDiagnosis — survives when there are no hotspots", () => {
  const txt = fallbackDiagnosis("Dormant", []);
  assertStringIncludes(txt, "Dormant");
  assertStringIncludes(txt, "the operating model");
});

Deno.test("fallbackPlan — produces 3 months and only picks valid outcomes", () => {
  const hotspots = [
    { pillar: 2, tier: 1 },
    { pillar: 4, tier: 0 },
    { pillar: 6, tier: 2 },
  ];
  const outcomes: Outcome[] = [
    { id: "o-p2-1", pillar: 2, applies_to_tier: 1, title: "Clean the warehouse" },
    { id: "o-p2-2", pillar: 2, applies_to_tier: 2, title: "Stand up data SLAs" },
    { id: "o-p2-low", pillar: 2, applies_to_tier: 0, title: "Too low — should be skipped" },
    { id: "o-p4-1", pillar: 4, applies_to_tier: 0, title: "Wire AI into one workflow" },
    { id: "o-p6-1", pillar: 6, applies_to_tier: 2, title: "Ship a written AI policy" },
    { id: "o-p1-1", pillar: 1, applies_to_tier: 0, title: "Wrong pillar" },
  ];
  const plan = fallbackPlan(hotspots, outcomes);
  assertEquals(plan.length, 3);
  assertEquals(plan.map((m) => m.month), [1, 2, 3]);

  // Month 1 → P2 hotspot, picks the two qualifying P2 outcomes (skips the < tier one).
  assertEquals(plan[0].outcome_ids, ["o-p2-1", "o-p2-2"]);
  // Month 2 → P4 hotspot.
  assertEquals(plan[1].outcome_ids, ["o-p4-1"]);
  // Month 3 → P6 hotspot.
  assertEquals(plan[2].outcome_ids, ["o-p6-1"]);

  // Title falls back to the first candidate's title.
  assertEquals(plan[0].title, "Clean the warehouse");
});

Deno.test("fallbackPlan — empty hotspots default to pillar 1 and degrade gracefully", () => {
  const plan = fallbackPlan([], []);
  assertEquals(plan.length, 3);
  for (const m of plan) {
    assertEquals(m.outcome_ids, []);
    assertStringIncludes(m.title, "Month");
  }
});

// ─── invariants ─────────────────────────────────────────────────────────────
Deno.test("PILLAR_WEIGHTS — sum to ~1.0", () => {
  const sum = Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0);
  assertAlmostEquals(sum, 1.0, 0.001);
});

Deno.test("SCORE_BANDS — final band ends at 100", () => {
  assertEquals(SCORE_BANDS[SCORE_BANDS.length - 1].max, 100);
});
