import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessProcessing from "./AssessProcessing";
import { LocationProbe, testSession } from "@/test/auth-flow-harness";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  invoke: vi.fn(),
}));
const syncMocks = vi.hoisted(() => ({
  finaliseAssessment: vi.fn(),
  sendMagicLink: vi.fn(),
  SyncError: class SyncError extends Error {},
}));
const authReadyMock = vi.hoisted(() => vi.fn());
const assessmentMocks = vi.hoisted(() => ({ loadDraft: vi.fn() }));
const lovableMocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    functions: { invoke: supabaseMocks.invoke },
  },
}));
vi.mock("@/lib/sync", () => syncMocks);
vi.mock("@/hooks/use-auth-ready", () => ({ useAuthReady: authReadyMock }));
vi.mock("@/lib/assessment", () => assessmentMocks);
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: lovableMocks.signInWithOAuth } } }));

function renderProcessing(strict = false) {
  const ui = (
    <MemoryRouter initialEntries={["/assess/processing"]}>
      <Routes>
        <Route path="/assess/processing" element={<><AssessProcessing /><LocationProbe /></>} />
        <Route path="/assess/r/:slug" element={<><h1>Report ready</h1><LocationProbe /></>} />
        <Route path="/assess/start" element={<><h1>Start</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

describe("AssessProcessing auth and finalise flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assessmentMocks.loadDraft.mockReturnValue({
      level: "function",
      qualifier: { email: "lead@example.com" },
      answers: { "f-p1-owner": 3 },
    });
    authReadyMock.mockReturnValue({ isReady: true, session: null, user: null });
    syncMocks.finaliseAssessment.mockResolvedValue({ respondentId: "respondent-1", slug: "report-1", inserted: 1 });
    syncMocks.sendMagicLink.mockResolvedValue({ email: "lead@example.com", state: "confirmed", emailType: "magic_link" });
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { email: "lead@example.com" } } });
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    lovableMocks.signInWithOAuth.mockResolvedValue({ redirected: true });
  });

  it("shows OAuth options and resends the email backup for signed-out users", async () => {
    renderProcessing();

    expect(await screen.findByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => expect(syncMocks.sendMagicLink).toHaveBeenCalledWith(
      "lead@example.com",
      expect.stringContaining("/auth/callback?next=%2Fassess%2Fprocessing"),
    ));
  });

  it("preserves processing as the OAuth return route", async () => {
    renderProcessing();

    fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(lovableMocks.signInWithOAuth).toHaveBeenCalledWith("google", expect.objectContaining({
      redirect_uri: expect.stringContaining("/auth/callback?next=%2Fassess%2Fprocessing"),
    })));
  });

  it("finalises once for signed-in users, even under StrictMode", async () => {
    authReadyMock.mockReturnValue({ isReady: true, session: testSession, user: testSession.user });

    renderProcessing(true);

    await waitFor(() => expect(syncMocks.finaliseAssessment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledWith("email-report-pdf", {
      body: { slug: "report-1", email: "lead@example.com" },
    }));
  });

  it("offers retry and start-over recovery when finalise fails", async () => {
    authReadyMock.mockReturnValue({ isReady: true, session: testSession, user: testSession.user });
    syncMocks.finaliseAssessment.mockRejectedValue(new Error("Could not save answers"));

    renderProcessing();

    expect(await screen.findByText(/Could not save answers/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });
});