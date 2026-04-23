import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthEmailState, sendAccessLink } from "./auth-access";

const supabaseMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  signInWithOtp: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: supabaseMocks.invoke },
    auth: { signInWithOtp: supabaseMocks.signInWithOtp },
    from: supabaseMocks.from,
  },
}));

describe("auth access email backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.signInWithOtp.mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
  });

  it("reads backend email status before choosing the email flow", async () => {
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true, state: "unconfirmed" }, error: null });

    await expect(getAuthEmailState("lead@example.com")).resolves.toBe("unconfirmed");
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("auth-email-status", {
      body: { email: "lead@example.com" },
    });
  });

  it.each([
    ["no_account", true, "confirmation"],
    ["unconfirmed", true, "confirmation"],
    ["confirmed", false, "signin"],
  ] as const)("sends the correct backup link for %s", async (state, shouldCreateUser, emailType) => {
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true, state }, error: null });

    const outcome = await sendAccessLink("lead@example.com", "https://app.test/auth/callback");

    expect(outcome).toEqual({ email: "lead@example.com", state, emailType });
    expect(supabaseMocks.signInWithOtp).toHaveBeenCalledWith({
      email: "lead@example.com",
      options: {
        emailRedirectTo: "https://app.test/auth/callback",
        shouldCreateUser,
      },
    });
  });
});