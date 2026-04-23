import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessStart from "./AssessStart";
import { saveDraft } from "@/lib/assessment";
import { LocationProbe } from "@/test/auth-flow-harness";

const supabaseMocks = vi.hoisted(() => ({ from: vi.fn() }));
const syncMocks = vi.hoisted(() => ({
  sendMagicLink: vi.fn(),
  SyncError: class SyncError extends Error {},
}));
const lovableMocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: supabaseMocks.from } }));
vi.mock("@/lib/sync", async () => syncMocks);
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: lovableMocks.signInWithOAuth } } }));

function renderStart() {
  return render(
    <MemoryRouter initialEntries={["/assess/start"]}>
      <Routes>
        <Route path="/assess/start" element={<><AssessStart /><LocationProbe /></>} />
        <Route path="/assess/q/1" element={<><h1>First question</h1><LocationProbe /></>} />
        <Route path="/assess" element={<><h1>Assess</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function reachEmailStep() {
  fireEvent.click(await screen.findByRole("button", { name: /Founder \/ CEO/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Early-stage/i }));
  fireEvent.click(await screen.findByRole("button", { name: /behind and we know it/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Europe/i }));
  expect(await screen.findByText(/Where should the/i)).toBeInTheDocument();
}

describe("AssessStart auth handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    saveDraft({ level: "company", answers: {} });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    syncMocks.sendMagicLink.mockResolvedValue({ email: "lead@example.com", state: "confirmed", emailType: "magic_link" });
    lovableMocks.signInWithOAuth.mockResolvedValue({ redirected: true });
  });

  it("blocks OAuth until benchmark consent is checked", async () => {
    renderStart();
    await reachEmailStep();

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Required to receive your report/i);
    expect(lovableMocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("starts OAuth with the centralized callback URL after consent", async () => {
    renderStart();
    await reachEmailStep();
    fireEvent.click(screen.getByLabelText(/Use my anonymised answers/i));

    fireEvent.click(screen.getByRole("button", { name: /continue with apple/i }));

    await waitFor(() => expect(lovableMocks.signInWithOAuth).toHaveBeenCalledWith("apple", expect.objectContaining({
      redirect_uri: expect.stringContaining("/auth/callback?next=%2Fassess%2Fq%2F1"),
    })));
  });

  it("sends the email backup and routes into questions", async () => {
    renderStart();
    await reachEmailStep();
    fireEvent.click(screen.getByLabelText(/Use my anonymised answers/i));
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: "lead@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /send link & begin/i }));

    await waitFor(() => expect(syncMocks.sendMagicLink).toHaveBeenCalledWith(
      "lead@example.com",
      expect.stringContaining("/auth/callback?next=%2Fassess%2Fq%2F1"),
    ));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/q/1"));
  });
});