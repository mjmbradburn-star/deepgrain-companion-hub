import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureRespondent } from "./sync";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession },
    from: supabaseMocks.from,
  },
}));

describe("ensureRespondent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("trusts an explicit draft respondent instead of looking up by level", async () => {
    const result = await ensureRespondent({ level: "individual", answers: {}, respondentId: "respondent-1", respondentSlug: "slug-1" });

    expect(result).toEqual({ respondentId: "respondent-1", slug: "slug-1" });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it("creates a new respondent for a new draft instead of reusing latest user-level respondent", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "respondent-2", slug: "slug-2" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseMocks.from.mockReturnValue({ insert });

    const result = await ensureRespondent({ level: "individual", answers: {}, qualifier: { consentMarketing: true } });

    expect(result).toEqual({ respondentId: "respondent-2", slug: "slug-2" });
    expect(supabaseMocks.from).toHaveBeenCalledWith("respondents");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", level: "individual", consent_marketing: true }));
  });
});