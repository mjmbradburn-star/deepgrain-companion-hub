import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthCallback from "./AuthCallback";
import { LocationProbe, testSession } from "@/test/auth-flow-harness";
import { persistAuthCallbackContext } from "@/lib/auth-callback-url";

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

const claimMocks = vi.hoisted(() => ({ claimReportBySlug: vi.fn() }));
const assessmentMocks = vi.hoisted(() => ({ loadDraft: vi.fn(), getQuestions: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession, onAuthStateChange: supabaseMocks.onAuthStateChange },
    from: supabaseMocks.from,
  },
}));
vi.mock("@/lib/sync", () => syncMocks);
vi.mock("@/lib/report-claim", () => claimMocks);
vi.mock("@/lib/assessment", () => assessmentMocks);
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) } } }));

function renderCallback(path = "/auth/callback", strict = false) {
  const ui = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<><AuthCallback /><LocationProbe /></>} />
        <Route path="/reports" element={<><h1>Reports</h1><LocationProbe /></>} />
        <Route path="/assess/processing" element={<><h1>Processing</h1><LocationProbe /></>} />
        <Route path="/assess/deep/:slug" element={<><h1>Deep Dive</h1><LocationProbe /></>} />
        <Route path="/assess/r/:slug" element={<><h1>Report end</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

describe("AuthCallback routing and loop guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: testSession } });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    syncMocks.ensureRespondent.mockResolvedValue({ respondentId: "respondent-1", slug: "report-1" });
    syncMocks.flushAnswers.mockResolvedValue(1);
    syncMocks.sendMagicLink.mockResolvedValue({ email: "lead@example.com", state: "confirmed", emailType: "magic_link" });
    claimMocks.claimReportBySlug.mockResolvedValue({ ok: true, status: "claimed", slug: "report-1" });
    assessmentMocks.loadDraft.mockReturnValue({ answers: {} });
    assessmentMocks.getQuestions.mockReturnValue([]);
  });

  it("defaults safely to /reports when no next or draft route exists", async () => {
    renderCallback();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/reports"));
  });

  it.each([
    ["/assess/processing", "/assess/processing"],
    ["/assess/r/report-1", "/assess/r/report-1"],
  ])("preserves next=%s after OAuth", async (next, expectedPath) => {
    renderCallback(`/auth/callback?next=${encodeURIComponent(next)}`);

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(expectedPath));
  });

  it("uses persisted OAuth context when the provider drops query parameters", async () => {
    persistAuthCallbackContext({ next: "/assess/deep/report-1", claim: "report-1", consentMarketing: true, authMethod: "google" });

    renderCallback();

    await waitFor(() => expect(claimMocks.claimReportBySlug).toHaveBeenCalledWith("report-1", true));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/deep/report-1"));
  });

  it("lets URL params override stale persisted OAuth context", async () => {
    persistAuthCallbackContext({ next: "/assess/deep/stale", claim: "stale", consentMarketing: false });

    renderCallback("/auth/callback?next=%2Fassess%2Fdeep%2Ffresh&claim=fresh&consent_marketing=1");

    await waitFor(() => expect(claimMocks.claimReportBySlug).toHaveBeenCalledWith("fresh", true));
    expect(claimMocks.claimReportBySlug).not.toHaveBeenCalledWith("stale", false);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/deep/fresh"));
  });

  it("shows wrong-account recovery when report claim fails", async () => {
    claimMocks.claimReportBySlug.mockResolvedValue({ ok: false, status: "already_claimed" });

    renderCallback("/auth/callback?next=%2Fassess%2Fdeep%2Freport-1&claim=report-1");

    expect(await screen.findByText(/already linked to another email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to report/i })).toHaveAttribute("href", "/assess/r/report-1");
  });

  it("times out instead of spinning forever when no session appears", async () => {
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });

    renderCallback("/auth/callback?email=lead%40example.com");

    expect(await screen.findByText(/We couldn't verify/i, {}, { timeout: 4_000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend link|request a new link/i })).toBeInTheDocument();
  }, 5_000);

  it("does not duplicate draft syncing under StrictMode", async () => {
    assessmentMocks.loadDraft.mockReturnValue({ level: "function", qualifier: { function: "sales" }, answers: { "f-p1-owner": 3 } });
    assessmentMocks.getQuestions.mockReturnValue([{ id: "f-p1-owner" }]);

    renderCallback("/auth/callback", true);

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/processing"));
    expect(syncMocks.ensureRespondent).toHaveBeenCalledTimes(1);
    expect(syncMocks.flushAnswers).toHaveBeenCalledTimes(1);
  });
});