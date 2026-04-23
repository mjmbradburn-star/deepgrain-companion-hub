import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import type { Level } from "@/lib/assessment";

export type TestLevel = Extract<Level, "company" | "function" | "individual">;

export const testUser = {
  id: "user-1",
  email: "lead@example.com",
};

export const testSession = {
  access_token: "session-token",
  user: testUser,
};

export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

export function renderWithRoutes(initialEntry: string, routes: Array<{ path: string; element: React.ReactNode }>) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function reportPayload({
  slug = "report-1",
  level = "function",
  isAnonymous = false,
  hasDeepdive = false,
}: {
  slug?: string;
  level?: TestLevel;
  isAnonymous?: boolean;
  hasDeepdive?: boolean;
} = {}) {
  return {
    respondent: {
      id: `${slug}-respondent`,
      slug,
      level,
      function: level === "function" ? "sales" : null,
      region: "Europe",
      org_size: "Early-stage (1–50 people)",
      submitted_at: "2026-01-01T00:00:00.000Z",
      is_anonymous: isAnonymous,
    },
    report: {
      aioi_score: 64,
      overall_tier: "Integrated",
      pillar_tiers: Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [
          String(index + 1),
          { tier: 3, label: "Integrated", name: `Pillar ${index + 1}` },
        ]),
      ),
      hotspots: [{ pillar: 1, name: "Strategy & Mandate", tier: 2, tierLabel: "Deployed" }],
      diagnosis: "A focused regression fixture diagnosis.",
      plan: [
        { month: 1, title: "Stabilise", rationale: "Start with ownership.", outcome_ids: [] },
        { month: 2, title: "Instrument", rationale: "Add measurement.", outcome_ids: [] },
        { month: 3, title: "Scale", rationale: "Repeat the pattern.", outcome_ids: [] },
      ],
      generated_at: "2026-01-01T00:00:00.000Z",
      cap_flags: [],
      benchmark_excluded: false,
      score_audit: {},
    },
    response_count: hasDeepdive ? 12 : 8,
    has_deepdive: hasDeepdive,
  };
}