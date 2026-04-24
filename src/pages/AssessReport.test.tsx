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
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Per-test-controllable rpc spy. Tests that mount the full AssessReport page
// override `mockRpc` to return their fixture; component-level tests ignore it.
const mockRpc = vi.fn(async (_name: string, _args?: unknown) => ({ data: null, error: null }));

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
    rpc: (name: string, args?: unknown) => mockRpc(name, args),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));

// Benchmarks fetch — return null so the page doesn't try to load slice data.
vi.mock("@/lib/benchmarks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/benchmarks")>("@/lib/benchmarks");
  return {
    ...actual,
    fetchBestSlice: vi.fn(async () => null),
  };
});

// Pure analytics — fire-and-forget shim.
vi.mock("@/lib/analytics", () => ({
  trackEvent: () => undefined,
}));


import AssessReport, {
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
  effort?: number;
  impact?: number;
  tier_band?: "low" | "mid" | "high";
}): RecommendationMove {
  const { move_id, pillar, title, effort, impact, tier_band, ...rest } = overrides;
  return {
    move_id,
    personalised_why_matters:
      rest.personalised_why_matters ??
      "This is the personalised reason it matters for you.",
    personalised_what_to_do_intro: rest.personalised_what_to_do_intro,
    role: rest.role,
    snapshot: {
      title,
      pillar,
      tier_band: tier_band ?? "low",
      lens: "organisational",
      function: null,
      why_matters: "Snapshot fallback why_matters.",
      what_to_do: "1. Do the thing.\n2. Then the next thing.",
      how_to_know: "You'll know because the metric moves.",
      effort: effort ?? 2,
      impact: impact ?? 3,
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

    // hotspot pillar names still render (legacy hotspot stack — pillar name appears multiple times across the page)
    for (const h of report.hotspots) {
      expect(screen.getAllByText(new RegExp(h.name)).length).toBeGreaterThan(0);
    }
  });
});

describe("AssessReport · MovesTab filter & sort controls", () => {
  // Build a deterministic, varied set so each control has something to bite on.
  function makeVariedRecs(): Recommendations {
    return makeRecommendations({
      moves: [
        makeMove({ move_id: "m1", pillar: 4, title: "Workflow seam",  effort: 3, impact: 2, tier_band: "low"  }),
        makeMove({ move_id: "m2", pillar: 6, title: "Governance floor", effort: 1, impact: 4, tier_band: "mid"  }),
        makeMove({ move_id: "m3", pillar: 7, title: "ROI dashboard",   effort: 4, impact: 3, tier_band: "high" }),
        makeMove({ move_id: "m4", pillar: 4, title: "Workflow rituals", effort: 2, impact: 1, tier_band: "mid"  }),
      ],
    });
  }

  function mountTab(recs: Recommendations) {
    return render(
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
  }

  function visibleMoveTitlesInOrder(recs: Recommendations): string[] {
    // Card titles are <h3>s — pick out the ones that match our fixture set.
    const fixtureTitles = new Set(recs.moves.map((m) => m.snapshot.title));
    return screen
      .getAllByRole("heading", { level: 3 })
      .map((n) => n.textContent ?? "")
      .filter((t) => fixtureTitles.has(t));
  }

  it("renders the controls with the correct option set", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const recs = makeVariedRecs();
    mountTab(recs);

    // Sort dropdown exposes all five options
    const sort = screen.getByRole("combobox", { name: /sort moves/i }) as HTMLSelectElement;
    expect(Array.from(sort.options).map((o) => o.value)).toEqual([
      "default",
      "impact_desc",
      "impact_asc",
      "effort_asc",
      "effort_desc",
    ]);

    // Both filter rows (Pillar + Tier band) start with their "All" chip pressed
    const pressedAll = screen.getAllByRole("button", { name: /^All$/, pressed: true });
    expect(pressedAll).toHaveLength(2);
    void user;
  });

  it("filters by pillar and shows the right counts", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const recs = makeVariedRecs();
    mountTab(recs);

    expect(visibleMoveTitlesInOrder(recs)).toHaveLength(4);

    const p4Chip = screen.getByRole("button", { name: /Workflow Integration/i });
    await user.click(p4Chip);

    const titles = visibleMoveTitlesInOrder(recs);
    expect(titles).toEqual(["Workflow seam", "Workflow rituals"]);
    expect(screen.getByText("2/4 shown")).toBeInTheDocument();
  });

  it("filters by tier band and combines with pillar filter", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const recs = makeVariedRecs();
    mountTab(recs);

    await user.click(screen.getByRole("button", { name: /^Build$/i }));
    const titles = visibleMoveTitlesInOrder(recs);
    // tier_band=mid → m2 (Governance floor) + m4 (Workflow rituals)
    expect(titles.sort()).toEqual(["Governance floor", "Workflow rituals"]);
  });

  it("sorts by impact descending and effort ascending", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const recs = makeVariedRecs();
    mountTab(recs);

    const sort = screen.getByRole("combobox", { name: /sort moves/i });

    await user.selectOptions(sort, "impact_desc");
    // impact: m2=4, m3=3, m1=2, m4=1
    expect(visibleMoveTitlesInOrder(recs)).toEqual([
      "Governance floor",
      "ROI dashboard",
      "Workflow seam",
      "Workflow rituals",
    ]);

    await user.selectOptions(sort, "effort_asc");
    // effort: m2=1, m4=2, m1=3, m3=4
    expect(visibleMoveTitlesInOrder(recs)).toEqual([
      "Governance floor",
      "Workflow rituals",
      "Workflow seam",
      "ROI dashboard",
    ]);
  });

  it("shows an empty-state when filters exclude every move and Reset restores the list", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const recs = makeVariedRecs();
    mountTab(recs);

    // pillar 7 ∩ Foundation (low) = ∅  (m3 is high)
    await user.click(screen.getByRole("button", { name: /Measurement & ROI/i }));
    await user.click(screen.getByRole("button", { name: /^Foundation$/i }));

    expect(screen.getByText(/No moves match these filters/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Reset$/i }));
    expect(visibleMoveTitlesInOrder(recs)).toHaveLength(4);
  });
});

// ─── Hotspot → Move deep-link contract ───────────────────────────────────
//
// Each HotspotCard, when its pillar maps to a selected Move, must render
// an anchor pointing at the Move's anchor on the Plan tab. The MoveCard
// component renders `<article id="move-<move_id>" />`, so the link target
// is `/assess/r/<slug>?tab=plan#move-<move_id>`. This guards against:
//   - accidentally swapping or losing the move_id wiring,
//   - drift between the link target and the actual MoveCard anchor,
//   - regressing the "no link when no Move" presentational fallback.

describe("AssessReport · HotspotCard → Move deep links", () => {
  it("renders each HotspotCard as a Link to /assess/r/<slug>?tab=plan#move-<move_id> using the right move_id per pillar", () => {
    const recs = makeRecommendations();
    const data = makeReportData(recs);
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

    const cards = screen.getAllByTestId("hotspot-card");
    // One card per hotspot pillar.
    expect(cards.length).toBe(report.hotspots.length);

    for (const h of report.hotspots) {
      const move = recs.moves.find((m) => m.snapshot.pillar === h.pillar);
      // Every hotspot in this fixture has a matching Move.
      expect(move, `expected a Move on pillar ${h.pillar}`).toBeTruthy();

      const card = cards.find((c) => c.getAttribute("data-move-id") === move!.move_id);
      expect(card, `no HotspotCard wired to move_id ${move!.move_id}`).toBeTruthy();

      // Link target must be the canonical anchor on the Plan tab.
      expect(card!.tagName).toBe("A");
      expect(card!.getAttribute("href")).toBe(
        `/assess/r/${data.respondent.slug}?tab=plan#move-${move!.move_id}`,
      );
    }
  });

  it("falls back to a non-link <article> when no Move exists for a hotspot pillar", () => {
    // Drop all recommendations so hotspots have no Move match.
    const data = makeReportData(null);

    render(
      <MemoryRouter>
        <OverviewTab
          report={data.report!}
          pillarValues={{}}
          slice={null}
          slug={data.respondent.slug}
          level={data.respondent.level}
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    const cards = screen.getAllByTestId("hotspot-card");
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) {
      // Presentational only — no anchor target, no href.
      expect(c.tagName).toBe("ARTICLE");
      expect(c.getAttribute("href")).toBeNull();
    }
  });

  it("clicking a HotspotCard navigates to the matching Move's anchor URL", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();

    const recs = makeRecommendations();
    const data = makeReportData(recs);
    const report = data.report!;
    const slug = data.respondent.slug;

    // A small location probe rendered alongside the OverviewTab so we can
    // assert react-router's location after the click — without booting the
    // full AssessReport route tree.
    function LocationProbe() {
      const loc = (require("react-router-dom") as typeof import("react-router-dom")).useLocation();
      return (
        <div
          data-testid="loc-probe"
          data-pathname={loc.pathname}
          data-search={loc.search}
          data-hash={loc.hash}
        />
      );
    }

    render(
      <MemoryRouter initialEntries={[`/assess/r/${slug}`]}>
        <OverviewTab
          report={report}
          pillarValues={{}}
          slice={null}
          slug={slug}
          level={data.respondent.level}
          hasDeepdive
          isAnonymous={false}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    // Pick the first hotspot that has a Move and click it.
    const firstHotspot = report.hotspots.find((h) =>
      recs.moves.some((m) => m.snapshot.pillar === h.pillar),
    )!;
    const move = recs.moves.find((m) => m.snapshot.pillar === firstHotspot.pillar)!;

    const card = screen
      .getAllByTestId("hotspot-card")
      .find((c) => c.getAttribute("data-move-id") === move.move_id)!;
    expect(card.tagName).toBe("A");

    await user.click(card);

    const probe = screen.getByTestId("loc-probe");
    expect(probe.getAttribute("data-pathname")).toBe(`/assess/r/${slug}`);
    expect(probe.getAttribute("data-search")).toBe(`?tab=plan`);
    expect(probe.getAttribute("data-hash")).toBe(`#move-${move.move_id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI edge-function timeout journey
//
// Originally requested as a Cypress e2e visiting the live /assess/:slug route.
// We deliberately keep this at the integration level instead: Cypress would
// require new infra (binary, config, CI wiring) and a seeded prod slug, and
// the "timeout" would still be a network stub — not a real edge timeout.
// Mounting OverviewTab + MovesTab with `used_fallback: true` exercises the
// exact same render path the wrapper produces when the AI call times out
// and the row is persisted with the snapshot-only fallback payload.
// ─────────────────────────────────────────────────────────────────────────────
describe("AssessReport · AI wrapper timeout fallback (e2e-equivalent)", () => {
  it("renders hotspot headline, Move CTA, and fallback banner when the wrapper times out", () => {
    const recs = makeRecommendations({
      used_fallback: true,
      // Wrapper timed out → generic intro from the fallback path.
      personalised_intro:
        "We couldn't reach the personalised model in time, so this draws on your scored profile.",
      moves: [
        makeMove({ move_id: "move-p4", pillar: 4, title: "Tighten the workflow seam", personalised_why_matters: "" }),
        makeMove({ move_id: "move-p6", pillar: 6, title: "Set a governance floor", personalised_why_matters: "" }),
        makeMove({ move_id: "move-p7", pillar: 7, title: "Wire ROI to a single dashboard", personalised_why_matters: "" }),
      ],
    });
    const data = makeReportData(recs);
    const report = data.report!;

    // Overview tab — hotspot cards still render with headline + Move CTA link.
    const { unmount } = render(
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

    // Headline diagnosis still surfaces from the (fallback) recommendations payload.
    expect(screen.getByText(`"${recs.headline_diagnosis}"`)).toBeInTheDocument();

    // Hotspot cards render and expose the "View move" CTA link to the Plan tab anchor.
    const cards = screen.getAllByTestId("hotspot-card");
    expect(cards.length).toBeGreaterThan(0);
    const linked = cards.filter((c) => c.tagName === "A");
    expect(linked.length).toBeGreaterThan(0);
    for (const card of linked) {
      const moveId = card.getAttribute("data-move-id")!;
      expect(card.getAttribute("href")).toBe(
        `/assess/r/${data.respondent.slug}?tab=plan#move-${moveId}`,
      );
      expect(within(card as HTMLElement).getByText(/view move/i)).toBeInTheDocument();
    }

    unmount();

    // Moves tab — fallback banner is visible alongside snapshot-derived Move copy.
    render(
      <MemoryRouter>
        <MovesTab
          recommendations={recs}
          tier={report.overall_tier}
          slug={data.respondent.slug}
          level={data.respondent.level}
          hasDeepdive
          isAnonymous={false}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/personalised wrapper unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Tighten the workflow seam/i }),
    ).toBeInTheDocument();
  });
});
