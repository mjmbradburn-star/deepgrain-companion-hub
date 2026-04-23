import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthCallback from "./AuthCallback";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}));

const syncMocks = vi.hoisted(() => ({
  ensureRespondent: vi.fn(),
  flushAnswers: vi.fn(),
  sendMagicLink: vi.fn(),
  SyncError: class SyncError extends Error {},
}));

const claimMocks = vi.hoisted(() => ({
  claimReportBySlug: vi.fn(),
}));

const assessmentMocks = vi.hoisted(() => ({
  loadDraft: vi.fn(),
  getQuestions: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
    },
    from: supabaseMocks.from,
  },
}));

vi.mock("@/lib/sync", () => syncMocks);
vi.mock("@/lib/report-claim", () => claimMocks);
vi.mock("@/lib/assessment", () => assessmentMocks);
vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) } },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderCallback(path = "/auth/callback") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<><AuthCallback /><LocationProbe /></>} />
        <Route path="/assess/processing" element={<><h1>Processing</h1><LocationProbe /></>} />
        <Route path="/assess/deep/:slug" element={<><h1>Deep Dive</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallback email backup resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1", email: "lead@example.com" } } } });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    syncMocks.ensureRespondent.mockResolvedValue({ respondentId: "respondent-1", slug: "report-1" });
    syncMocks.flushAnswers.mockResolvedValue(2);
    claimMocks.claimReportBySlug.mockResolvedValue({ ok: true, status: "claimed", slug: "report-1" });
  });

  it("resumes an email-link session and flushes the local assessment draft", async () => {
    const draft = {
      level: "function",
      qualifier: { function: "sales", email: "lead@example.com" },
      answers: { "f-p1-owner": 4, "f-p1-strategy": 3 },
    };
    assessmentMocks.loadDraft.mockReturnValue(draft);
    assessmentMocks.getQuestions.mockReturnValue([{ id: "f-p1-owner" }, { id: "f-p1-strategy" }]);

    renderCallback("/auth/callback?email=lead%40example.com");

    await waitFor(() => expect(syncMocks.ensureRespondent).toHaveBeenCalledWith(draft));
    expect(syncMocks.flushAnswers).toHaveBeenCalledWith("respondent-1", draft);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/processing"));
  });

  it("claims a Deep Dive report after email-link session creation", async () => {
    assessmentMocks.loadDraft.mockReturnValue({ answers: {} });
    assessmentMocks.getQuestions.mockReturnValue([]);

    renderCallback("/auth/callback?next=%2Fassess%2Fdeep%2Freport-1&claim=report-1&consent_marketing=1&email=lead%40example.com");

    await waitFor(() => expect(claimMocks.claimReportBySlug).toHaveBeenCalledWith("report-1", true));
    expect(syncMocks.ensureRespondent).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/deep/report-1"));
  });
});