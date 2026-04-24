/**
 * Integration test for the AIOI report's Moves tab + enriched HotspotCards.
 *
 * Asserts the live rendering paths used by AssessReport when the Voice
 * Wrapper has produced a `recommendations` payload, and the graceful
 * fallback path when the wrapper times out / fails (the row carries
 * `used_fallback: true` but moves still hydrate from snapshot copy).
 *
 * Mounts the exported `MovesTab` and `OverviewTab` directly to keep the
 * test focused, fast and free of network mocking.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Some descendants (DeepDiveUnlock, ReportCta) read the auth session.
// Stub the client at module level so they render harmlessly.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: null }),
      select: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));

// Pure analytics — fire-and-forget shim.
vi.mock("@/lib/analytics", () => ({
  trackEvent: () => undefined,
}));

import {
  MovesTab,
  OverviewTab,
  type Recommendations,
  type ReportData,
} from "@/pages/AssessReport";
import type { RecommendationMove } from "@/components/aioi/MoveCard";

// ─── fixtures ─────────────────────────────────────────────────────────────

function makeMove(overrides: Partial<RecommendationMove> & {
  move_id: string;
  pillar: number;
  title: string;
}): RecommendationMove {
  const { move_id, pillar, title, ...rest } = overrides;
  return {
    move_id,
    personalised_why_matters:
      rest.personalised_why_matters ??
      "This is the personalised reason it matters for you.",
    personalised_what_to_do_intro: rest.personalised_what_to_do_intro,
    role: rest.role,
    snapshot: {
      id: move_id,
      title,
      pillar,
      tier_band: "low",
      function: null,
      size_bands: null,
      why_matters: "Snapshot fallback why_matters.",
      what_to_do: "1. Do the thing.\n2. Then the next thing.",
      how_to_know: "You'll know because the metric moves.",
      effort: 2,
      tags: ["pilot", "ops"],
      cta_type: null,
      cta_url: null,
    },
  };
}

function makeRecommendations(
  overrides: Partial<Recommendations> = {},
): Recommendations {
  return {
    headline_diagnosis:
      "Your operating shape leans on isolated wins instead of a repeatable rhythm.",
    personalised_intro:
      "Here is the shortest path from your current shape to a compounding system.",
    closing_cta:
      "Start by sequencing pillar 4 before scaling pillar 6.",
    moves: [
      makeMove({ move_id: "move-p4", pillar: 4, title: "Tighten the workflow seam" }),
      makeMove({ move_id: "move-p6", pillar: 6, title: "Set a governance floor" }),
      makeMove({ move_id: "move-p7", pillar: 7, title: "Wire ROI to a single dashboard" }),
    ],
    used_fallback: false,
    ...overrides,
  };
}

function makeReportData(recs: Recommendations | null): ReportData {
  return {
    respondent: {
      id: "resp-1",
      slug: "test-slug-123",
      level: "company",
      function: null,
      region: "Europe",
      org_size: "101–200",
      submitted_at: new Date().toISOString(),
      is_anonymous: false,
      is_owned: true,
      is_owner: true,
    },
    report: {
      aioi_score: 58,
      overall_tier: "Deployed",
      pillar_tiers: {
        1: { tier: 3, label: "Deployed", name: "Strategy & Mandate" },
        2: { tier: 2, label: "Exploring", name: "Data Foundations" },
        3: { tier: 3, label: "Deployed", name: "Tooling & Infrastructure" },
        4: { tier: 1, label: "Exploring", name: "Workflow Integration" },
        5: { tier: 2, label: "Exploring", name: "Skills & Fluency" },
        6: { tier: 1, label: "Exploring", name: "Governance & Risk" },
        7: { tier: 1, label: "Exploring", name: "Measurement & ROI" },
        8: { tier: 3, label: "Deployed", name: "Culture & Adoption" },
      },
      hotspots: [
        { pillar: 4, name: "Workflow Integration", tier: 1, tierLabel: "Exploring" },
        { pillar: 6, name: "Governance & Risk",   tier: 1, tierLabel: "Exploring" },
        { pillar: 7, name: "Measurement & ROI",   tier: 1, tierLabel: "Exploring" },
      ],
      diagnosis: "Legacy diagnosis — should not appear when recs.headline_diagnosis is present.",
      plan: [],
      recommendations: recs,
      recommendations_generated_at: recs ? new Date().toISOString() : null,
      move_ids: recs ? recs.moves.map((m) => m.move_id) : null,
      generated_at: new Date().toISOString(),
      cap_flags: [],
      benchmark_excluded: false,
      score_audit: {},
    },
    outcomes: [],
    cohort: null,
    slice: null,
    hasDeepdive: true,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────

describe("AssessReport · MovesTab (Voice Wrapper output)", () => {
  it("renders headline, personalised intro, all enriched Move cards, and closing CTA", () => {
    const recs = makeRecommendations();

    render(
      <MemoryRouter>
        <MovesTab
          recommendations={recs}
          tier="Deployed"
          slug="test-slug-123"
          level="company"
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    // personalised intro
    expect(screen.getByText(recs.personalised_intro)).toBeInTheDocument();

    // every Move title appears
    for (const m of recs.moves) {
      expect(
        screen.getByRole("heading", { name: m.snapshot.title }),
      ).toBeInTheDocument();
    }

    // enriched body fields rendered
    expect(
      screen.getAllByText(/personalised reason it matters/i).length,
    ).toBe(recs.moves.length);
    expect(
      screen.getAllByText(/You'll know because the metric moves/i).length,
    ).toBe(recs.moves.length);
    expect(
      screen.getAllByText(/Do the thing/i).length,
    ).toBe(recs.moves.length);

    // closing CTA
    expect(screen.getByText(recs.closing_cta)).toBeInTheDocument();

    // fallback notice not shown when wrapper succeeded
    expect(
      screen.queryByText(/personalised wrapper unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("shows the fallback notice when used_fallback=true but still renders Moves with snapshot copy", () => {
    const recs = makeRecommendations({
      used_fallback: true,
      // wrapper failed → personalised_intro typically defaults to a generic line
      personalised_intro:
        "We couldn't reach the personalised model in time, so this draws on your scored profile.",
      moves: [
        makeMove({
          move_id: "move-fb",
          pillar: 4,
          title: "Snapshot-only Move",
          // wrapper omitted personalised_why_matters entirely
          personalised_why_matters: "",
        }),
      ],
    });

    render(
      <MemoryRouter>
        <MovesTab
          recommendations={recs}
          tier="Deployed"
          slug="test-slug-123"
          level="company"
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    // fallback banner
    expect(
      screen.getByText(/personalised wrapper unavailable/i),
    ).toBeInTheDocument();

    // Move still renders, falling back to snapshot why_matters
    expect(screen.getByRole("heading", { name: /Snapshot-only Move/i })).toBeInTheDocument();
    expect(screen.getByText(/Snapshot fallback why_matters/i)).toBeInTheDocument();
  });
});

describe("AssessReport · OverviewTab (HotspotCards mapped to Move IDs)", () => {
  it("renders a HotspotCard per hotspot pillar enriched with the matching Move's title, why and effort", () => {
    const recs = makeRecommendations();
    const data = makeReportData(recs);
    const report = data.report!;

    render(
      <MemoryRouter>
        <OverviewTab
          report={report}
          pillarValues={Object.fromEntries(
            Object.entries(report.pillar_tiers).map(([k, v]) => [Number(k), v.tier]),
          )}
          slice={null}
          slug={data.respondent.slug}
          level={data.respondent.level}
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    // headline diagnosis from recommendations beats the legacy diagnosis
    expect(screen.getByText(`"${recs.headline_diagnosis}"`)).toBeInTheDocument();
    expect(
      screen.queryByText(/Legacy diagnosis/i),
    ).not.toBeInTheDocument();

    // every hotspot pillar's matching Move title appears in the hotspot stack
    const watchSection = screen
      .getByText(/Three pillars to watch/i)
      .closest("div")!;
    const watchScope = within(watchSection.parentElement!);
    for (const h of report.hotspots) {
      const move = recs.moves.find((m) => m.snapshot.pillar === h.pillar)!;
      expect(watchScope.getByText(move.snapshot.title)).toBeInTheDocument();
    }

    // closing CTA also appears below the overview
    expect(screen.getByText(recs.closing_cta)).toBeInTheDocument();
  });

  it("falls back to the legacy diagnosis and renders hotspots without Move enrichment when no recommendations are present", () => {
    const data = makeReportData(null);
    const report = data.report!;

    render(
      <MemoryRouter>
        <OverviewTab
          report={report}
          pillarValues={{}}
          slice={null}
          slug={data.respondent.slug}
          level={data.respondent.level}
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(`"${report.diagnosis}"`)).toBeInTheDocument();

    // hotspot pillar names still render as before
    for (const h of report.hotspots) {
      expect(screen.getByText(new RegExp(h.name))).toBeInTheDocument();
    }
  });
});
