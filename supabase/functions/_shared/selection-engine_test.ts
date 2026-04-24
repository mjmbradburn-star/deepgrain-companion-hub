import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  bandify,
  lensFromLevel,
  topHotspotsForSelection,
  selectMoves,
  type Move,
} from "./selection-engine.ts";

function move(overrides: Partial<Move>): Move {
  return {
    id: crypto.randomUUID(),
    lens: "individual",
    pillar: 5,
    tier_band: "low",
    function: null,
    size_bands: null,
    title: "Test move",
    why_matters: "because",
    what_to_do: "do x",
    how_to_know: "you used it",
    effort: 1,
    impact: 2,
    tags: null,
    cta_type: null,
    cta_url: null,
    active: true,
    last_reviewed_at: null,
    ...overrides,
  };
}

Deno.test("bandify: low/mid/high boundaries", () => {
  assertEquals(bandify(0), "low");
  assertEquals(bandify(1.4), "low");
  assertEquals(bandify(1.5), "mid");
  assertEquals(bandify(3.4), "mid");
  assertEquals(bandify(3.5), "high");
  assertEquals(bandify(5), "high");
});

Deno.test("lensFromLevel maps correctly", () => {
  assertEquals(lensFromLevel("individual"), "individual");
  assertEquals(lensFromLevel("function"), "functional");
  assertEquals(lensFromLevel("company"), "organisational");
  assertEquals(lensFromLevel(undefined), "organisational");
});

Deno.test("topHotspotsForSelection ignores zero-tier pillars", () => {
  const got = topHotspotsForSelection({ 1: 0, 2: 1.5, 3: 2.5, 4: 4 }, 3);
  assertEquals(got.map((h) => h.pillar), [2, 3, 4]);
});

Deno.test("selectMoves: individual respects floor (3) and cap (5)", () => {
  const playbook: Move[] = [
    ...[5, 5, 5, 5].map(() => move({ pillar: 5, tier_band: "low", lens: "individual" })),
    ...[3, 3, 3, 3].map(() => move({ pillar: 3, tier_band: "low", lens: "individual" })),
    ...[6, 6].map(() => move({ pillar: 6, tier_band: "low", lens: "individual" })),
  ];
  const selected = selectMoves(
    {
      lens: "individual",
      function: null,
      size_band: "M2",
      pillar_tiers: { 1: 4, 2: 4, 3: 1, 4: 4, 5: 1, 6: 1, 7: 4, 8: 4 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  assert(selected.length >= 3, `expected >=3 moves, got ${selected.length}`);
  assert(selected.length <= 5, `expected <=5 moves, got ${selected.length}`);
});

Deno.test("selectMoves: functional respects floor (5) and cap (7) and prefers function match", () => {
  const playbook: Move[] = [
    ...Array.from({ length: 4 }, () => move({ lens: "functional", pillar: 4, tier_band: "low", function: "revops" })),
    ...Array.from({ length: 4 }, () => move({ lens: "functional", pillar: 5, tier_band: "low", function: "revops" })),
    ...Array.from({ length: 4 }, () => move({ lens: "functional", pillar: 3, tier_band: "low", function: "revops" })),
    ...Array.from({ length: 2 }, () => move({ lens: "functional", pillar: 4, tier_band: "low", function: "marketing" })),
  ];
  const selected = selectMoves(
    {
      lens: "functional",
      function: "revops",
      size_band: "M2",
      pillar_tiers: { 3: 1, 4: 1, 5: 1 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  assert(selected.length >= 5, `expected >=5, got ${selected.length}`);
  assert(selected.length <= 7, `expected <=7, got ${selected.length}`);
  for (const s of selected) {
    assert(s.function === "revops" || s.function === null, `unexpected function ${s.function}`);
  }
});

Deno.test("selectMoves: organisational gets a forced_rank pick", () => {
  const playbook: Move[] = [
    ...Array.from({ length: 4 }, () => move({ lens: "organisational", pillar: 6, tier_band: "low" })),
    ...Array.from({ length: 4 }, () => move({ lens: "organisational", pillar: 1, tier_band: "low" })),
    ...Array.from({ length: 4 }, () => move({ lens: "organisational", pillar: 4, tier_band: "low" })),
  ];
  const selected = selectMoves(
    {
      lens: "organisational",
      function: null,
      size_band: "L1",
      pillar_tiers: { 1: 1, 2: 4, 3: 4, 4: 1.5, 5: 4, 6: 0.5, 7: 4, 8: 4 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  const forced = selected.filter((s) => s.role === "forced_rank");
  assertEquals(forced.length, 1, "expected exactly one forced_rank pick");
  // Lowest pillar (6 @ 0.5) should be the forced rank
  assertEquals(forced[0]!.pillar, 6);
});

Deno.test("selectMoves: cap_flag_pillars boost surfaces prerequisite-pillar moves", () => {
  const playbook: Move[] = [
    move({ lens: "individual", pillar: 3, tier_band: "low", title: "Prereq move", id: "prereq" }),
    ...Array.from({ length: 5 }, (_, i) =>
      move({ lens: "individual", pillar: 5, tier_band: "low", title: `Other ${i}` }),
    ),
  ];
  const selected = selectMoves(
    {
      lens: "individual",
      function: null,
      size_band: null,
      pillar_tiers: { 3: 1, 5: 1, 7: 1 },
      cap_flag_pillars: [3],
    },
    playbook,
  );
  assert(selected.some((s) => s.id === "prereq"), "prerequisite-pillar move should be selected");
});

Deno.test("selectMoves: respects size_bands gating", () => {
  const playbook: Move[] = [
    move({ lens: "organisational", pillar: 1, tier_band: "mid", size_bands: ["XL"] }),
    move({ lens: "organisational", pillar: 1, tier_band: "mid", size_bands: ["S", "M1"] }),
    move({ lens: "organisational", pillar: 4, tier_band: "mid", size_bands: null }),
  ];
  const selected = selectMoves(
    {
      lens: "organisational",
      function: null,
      size_band: "S",
      pillar_tiers: { 1: 2.5, 4: 2.5, 7: 2.5 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  for (const s of selected) {
    if (s.size_bands) assert(s.size_bands.includes("S"), `size band mismatch on ${s.id}`);
  }
});

Deno.test("selectMoves: empty playbook returns empty selection", () => {
  const selected = selectMoves(
    {
      lens: "individual",
      function: null,
      size_band: "M2",
      pillar_tiers: { 5: 1 },
      cap_flag_pillars: [],
    },
    [],
  );
  assertEquals(selected.length, 0);
});

// G6 — Functional lens falls back to function-base Moves (function = null)
// when no function-specific Move exists for the hotspot.
Deno.test("selectMoves: functional lens falls back to function-base moves", () => {
  const playbook: Move[] = [
    // No revops-specific moves — only base (function = null) coverage.
    move({ lens: "functional", pillar: 4, tier_band: "low", function: null, title: "Base workflow" }),
    move({ lens: "functional", pillar: 4, tier_band: "low", function: null, title: "Base measurement" }),
    move({ lens: "functional", pillar: 5, tier_band: "low", function: null, title: "Base skills" }),
    move({ lens: "functional", pillar: 6, tier_band: "low", function: null, title: "Base governance" }),
    move({ lens: "functional", pillar: 7, tier_band: "low", function: null, title: "Base measurement 2" }),
    // Distractor: marketing-specific move (different function) should NOT match.
    move({ lens: "functional", pillar: 4, tier_band: "low", function: "marketing", title: "Marketing-only" }),
  ];
  const selected = selectMoves(
    {
      lens: "functional",
      function: "revops",
      size_band: "M2",
      pillar_tiers: { 4: 1, 5: 1, 6: 1, 7: 1 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  assert(selected.length >= 5, `expected functional floor of 5, got ${selected.length}`);
  for (const s of selected) {
    assert(s.function === null, `revops respondent should not receive marketing-only move ${s.title}`);
  }
});

// G3 — Forced-rank pick may come from outside the top-3 hotspots when a
// lower-tier pillar exists in the broader top-4 pool.
Deno.test("selectMoves: organisational forced_rank prefers lowest-tier pillar in top-4", () => {
  const playbook: Move[] = [
    move({ lens: "organisational", pillar: 1, tier_band: "mid", title: "P1 mid" }),
    move({ lens: "organisational", pillar: 2, tier_band: "mid", title: "P2 mid" }),
    move({ lens: "organisational", pillar: 3, tier_band: "mid", title: "P3 mid" }),
    move({ lens: "organisational", pillar: 6, tier_band: "low", title: "P6 LOW (true blocker)" }),
    move({ lens: "organisational", pillar: 6, tier_band: "low", title: "P6 LOW alt" }),
  ];
  const selected = selectMoves(
    {
      lens: "organisational",
      function: null,
      size_band: "M2",
      // P6 has the lowest tier; P1/P2/P3 are slightly higher but still hotspots.
      pillar_tiers: { 1: 2, 2: 2, 3: 2, 6: 1, 7: 4, 8: 4 },
      cap_flag_pillars: [],
    },
    playbook,
  );
  const forced = selected.find((s) => s.role === "forced_rank");
  assert(forced, "expected a forced_rank move on organisational lens");
  assertEquals(forced!.pillar, 6, `forced_rank should be the lowest-tier pillar (6), got ${forced!.pillar}`);
});
