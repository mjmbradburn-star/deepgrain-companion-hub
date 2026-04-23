import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeepDiveEmailGate } from "@/components/aioi/DeepDiveEmailGate";
import type { AuthEmailState } from "@/lib/auth-access";
import SignIn from "./SignIn";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
      signInWithOtp: supabaseMocks.signInWithOtp,
    },
    functions: { invoke: supabaseMocks.invoke },
    from: supabaseMocks.from,
  },
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) } },
}));

vi.mock("@/lib/assessment", async () => {
  const actual = await vi.importActual<typeof import("@/lib/assessment")>("@/lib/assessment");
  return {
    ...actual,
    loadDraft: vi.fn(() => ({ qualifier: { email: "" }, answers: {} })),
  };
});

const states: AuthEmailState[] = ["no_account", "new", "unconfirmed", "confirmed", "invalid_email", "unknown"];

function renderSignIn() {
  return render(
    <MemoryRouter initialEntries={["/signin?next=/assess/deep/report-1&claim=report-1&consent_marketing=1"]}>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderDeepDiveGate() {
  return render(
    <MemoryRouter>
      <DeepDiveEmailGate slug="report-1" level="company" />
    </MemoryRouter>,
  );
}

async function requestEmailBackup(email = "lead@example.com") {
  fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: email } });
  const consent = screen.queryByLabelText(/occasional AI operating-model notes/i);
  if (consent) fireEvent.click(consent);
  fireEvent.click(screen.getByRole("button", { name: /send secure/i }));
}

function expectStatusLookupAndOtp(state: AuthEmailState, shouldCreateUser: boolean) {
  expect(supabaseMocks.invoke).toHaveBeenCalledWith("auth-email-status", {
    body: { email: "lead@example.com" },
  });
  expect(supabaseMocks.signInWithOtp).toHaveBeenCalledWith({
    email: "lead@example.com",
    options: expect.objectContaining({
      shouldCreateUser,
      emailRedirectTo: expect.stringContaining("/auth/callback?next=%2Fassess%2Fdeep%2Freport-1"),
    }),
  });
  const redirect = supabaseMocks.signInWithOtp.mock.calls[0][0].options.emailRedirectTo as string;
  expect(redirect).toContain("claim=report-1");
  expect(redirect).toContain("consent_marketing=1");
}

function expectedTitle(state: AuthEmailState) {
  return state === "confirmed" ? /sign-in link sent/i : /confirmation email sent/i;
}

describe("auth-email-status backed email fallback flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.signInWithOtp.mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
  });

  it.each(states)("routes /signin email backup correctly for auth-email-status=%s", async (state) => {
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true, state }, error: null });
    renderSignIn();

    await requestEmailBackup();

    await waitFor(() => expect(supabaseMocks.signInWithOtp).toHaveBeenCalledTimes(1));
    expectStatusLookupAndOtp(state, state !== "confirmed");
    expect(await screen.findByText(expectedTitle(state))).toBeInTheDocument();
    if (state === "unconfirmed") {
      expect(screen.getByText(/already has an account/i)).toBeInTheDocument();
    }
  });

  it.each(states)("routes Deep Dive email fallback correctly for auth-email-status=%s", async (state) => {
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true, state }, error: null });
    renderDeepDiveGate();

    await requestEmailBackup();

    await waitFor(() => expect(supabaseMocks.signInWithOtp).toHaveBeenCalledTimes(1));
    expectStatusLookupAndOtp(state, state !== "confirmed");
    expect(await screen.findByText(expectedTitle(state))).toBeInTheDocument();
    expect(screen.getByText(/continue the Deep Dive/i)).toBeInTheDocument();
  });

  it("treats an auth-email-status endpoint failure as the unknown confirmation path", async () => {
    supabaseMocks.invoke.mockResolvedValue({ data: null, error: { message: "temporarily unavailable" } });
    renderSignIn();

    await requestEmailBackup();

    await waitFor(() => expect(supabaseMocks.signInWithOtp).toHaveBeenCalledTimes(1));
    expectStatusLookupAndOtp("unknown", true);
    expect(await screen.findByText(/confirmation email sent/i)).toBeInTheDocument();
  });
});