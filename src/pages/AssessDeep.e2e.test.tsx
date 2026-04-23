import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessDeep from "./AssessDeep";
import { getDeepDiveQuestions, type Level } from "@/lib/assessment";
import { getQuickscanQuestions } from "@/lib/quickscan";

type MockLevel = Extract<Level, "company" | "function" | "individual">;

const supabaseMocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
}));
const insertedResponses: Array<{ respondent_id: string; question_id: string; tier: number }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession, onAuthStateChange: supabaseMocks.onAuthStateChange, signInWithOtp: supabaseMocks.signInWithOtp },
    rpc: supabaseMocks.rpc,
    functions: { invoke: supabaseMocks.invoke },
    from: supabaseMocks.from,
  },
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: {
    auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) },
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderDeep(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/assess/deep/${slug}`]}>
      <Routes>
        <Route path="/assess/deep/:slug" element={<><AssessDeep /><LocationProbe /></>} />
        <Route path="/assess/r/:slug" element={<><h1>Returned report</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockReport(level: MockLevel) {
  const slug = `${level}-deep-flow`;
  const respondentId = `${level}-respondent-id`;
  supabaseMocks.rpc.mockImplementation((name: string) => {
    if (name === "claim_report_by_slug") {
      return Promise.resolve({ data: { ok: true, status: "claimed", respondent_id: respondentId, slug }, error: null });
    }
    return Promise.resolve({
      data: {
        respondent: {
          id: respondentId,
          slug,
          level,
          function: level === "function" ? "sales" : null,
          is_anonymous: true,
        },
      },
      error: null,
    });
  });
  return { slug, respondentId };
}

function mockTables(existingQuestionIds: string[]) {
  const upsert = vi.fn((rows) => {
    insertedResponses.push(...rows);
    return Promise.resolve({ error: null });
  });
  supabaseMocks.from.mockImplementation((table: string) => {
    if (table === "responses") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: existingQuestionIds.map((question_id) => ({ question_id })), error: null }),
        })),
        upsert,
      };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });
  return { upsert };
}

async function sendClaimLink(slug: string) {
  expect(await screen.findByRole("heading", { name: /save this report/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "lead@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: /send secure sign-in link/i }));
  await waitFor(() => expect(supabaseMocks.signInWithOtp).toHaveBeenCalledWith({
    email: "lead@example.com",
    options: expect.objectContaining({
      shouldCreateUser: true,
      emailRedirectTo: expect.stringContaining(`/auth/callback?next=%2Fassess%2Fdeep%2F${slug}`),
    }),
  }));
}

async function completeDeepDive(level: MockLevel) {
  const questions = getDeepDiveQuestions(level, level === "function" ? "sales" : undefined);
  for (const question of questions) {
    expect(await screen.findByText(question.prompt)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(question.options[0].label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }));
  }
}

describe("Deep Dive claim and scoring flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedResponses.length = 0;
    supabaseMocks.signInWithOtp.mockResolvedValue({ error: null });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.invoke.mockImplementation((name: string) => {
      if (name === "auth-email-status") return Promise.resolve({ data: { ok: true, state: "no_account" }, error: null });
      return Promise.resolve({ error: null });
    });
  });

  it.each<MockLevel>(["company", "function"])("claims an anonymous %s report by magic link and completes every final Deep Dive step", async (level) => {
    const { slug, respondentId } = mockReport(level);
    mockTables(getQuickscanQuestions(level, level === "function" ? "sales" : undefined).map((question) => question.id));

    supabaseMocks.getSession.mockResolvedValueOnce({ data: { session: null } });
    const firstRender = renderDeep(slug);
    await sendClaimLink(slug);
    firstRender.unmount();

    supabaseMocks.getSession.mockResolvedValue({ data: { session: { access_token: `${level}-token`, user: { id: `${level}-user-id`, email: "lead@example.com" } } } });
    renderDeep(slug);

    await completeDeepDive(level);

    const expectedQuestions = getDeepDiveQuestions(level, level === "function" ? "sales" : undefined);
    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledWith("rescore-respondent", {
      body: { slug },
      headers: { Authorization: `Bearer ${level}-token` },
    }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/assess/r/${slug}`));
    expect(insertedResponses).toHaveLength(expectedQuestions.length);
    expect(insertedResponses.map((row) => row.question_id)).toEqual(expectedQuestions.map((question) => question.id));
    expect(insertedResponses.every((row) => row.respondent_id === respondentId)).toBe(true);
  }, 15_000);

  it.each<MockLevel>(["individual", "function", "company"])("claims a %s report after OAuth sign-in and lands back on the report", async (level) => {
    const { slug, respondentId } = mockReport(level);
    mockTables(getQuickscanQuestions(level, level === "function" ? "sales" : undefined).map((question) => question.id));
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { access_token: `${level}-oauth-token`, user: { id: `${level}-user-id`, email: "lead@example.com" } } } });

    renderDeep(slug);

    await waitFor(() => expect(supabaseMocks.rpc).toHaveBeenCalledWith("claim_report_by_slug", {
      _slug: slug,
      _consent_marketing: false,
    }));
    expect(screen.queryByRole("heading", { name: /save this report/i })).not.toBeInTheDocument();

    await completeDeepDive(level);

    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledWith("rescore-respondent", {
      body: { slug },
      headers: { Authorization: `Bearer ${level}-oauth-token` },
    }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/assess/r/${slug}`));
    expect(insertedResponses.every((row) => row.respondent_id === respondentId)).toBe(true);
  }, 15_000);

  it("keeps saved Deep Dive answers and retries only scoring when re-score fails", async () => {
    const { slug } = mockReport("company");
    const { upsert } = mockTables(getQuickscanQuestions("company").map((question) => question.id));
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { access_token: "company-token", user: { id: "company-user-id", email: "lead@example.com" } } } });
    supabaseMocks.invoke.mockImplementation((name: string) => {
      if (name === "rescore-respondent") return Promise.resolve({ error: { message: "gateway rejected scoring" } });
      return Promise.resolve({ error: null });
    });

    renderDeep(slug);
    await completeDeepDive("company");

    await screen.findByText(/Your answers are saved\. Re-scoring needs another try\./i);
    expect(screen.getByRole("button", { name: /finish scoring/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view report while scoring retries/i })).toBeInTheDocument();
    expect(upsert).toHaveBeenCalledTimes(1);
    const savedRows = [...insertedResponses];

    fireEvent.click(screen.getByRole("button", { name: /finish scoring/i }));

    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledTimes(2));
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(insertedResponses).toEqual(savedRows);
    expect(screen.getByTestId("location")).toHaveTextContent(`/assess/deep/${slug}`);
  }, 15_000);
});