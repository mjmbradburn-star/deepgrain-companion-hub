import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessReport from "./AssessReport";
import { deferred, reportPayload } from "@/test/auth-flow-harness";
import { fetchBestSlice } from "@/lib/benchmarks";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
}));

const syncMocks = vi.hoisted(() => ({
  sendMagicLink: vi.fn(),
  SyncError: class SyncError extends Error {},
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession, onAuthStateChange: supabaseMocks.onAuthStateChange, signOut: supabaseMocks.signOut },
    rpc: supabaseMocks.rpc,
    functions: { invoke: supabaseMocks.invoke },
    from: supabaseMocks.from,
  },
}));

vi.mock("@/lib/sync", () => syncMocks);
vi.mock("@/lib/benchmarks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/benchmarks")>("@/lib/benchmarks");
  return {
    ...actual,
    fetchBestSlice: vi.fn().mockResolvedValue(null),
    pillarsFromRow: vi.fn().mockReturnValue({}),
  };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

function renderReport(slug = "report-1") {
  return render(
    <MemoryRouter initialEntries={[`/assess/r/${slug}`]}>
      <Routes>
        <Route path="/assess/r/:slug" element={<AssessReport />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AssessReport production controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    supabaseMocks.invoke.mockResolvedValue({ data: { ok: true, pdfUrl: "https://example.com/report.pdf" }, error: null });
    syncMocks.sendMagicLink.mockResolvedValue({ email: "lead@example.com", state: "confirmed", emailType: "magic_link" });
    supabaseMocks.rpc.mockImplementation((name: string) => {
      if (name === "get_report_by_slug") return Promise.resolve({ data: reportPayload(), error: null });
      if (name === "get_outcomes_for_report") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("renders loading, missing, and report-building states", async () => {
    const pending = deferred<{ data: unknown; error: null }>();
    supabaseMocks.rpc.mockReturnValueOnce(pending.promise);
    const loadingRender = renderReport();
    expect(screen.getByText(/Pulling your report/i)).toBeInTheDocument();
    pending.resolve({ data: null, error: null });
    loadingRender.unmount();

    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    renderReport("missing");
    expect(await screen.findByText(/No report at this address/i)).toBeInTheDocument();

    supabaseMocks.rpc.mockResolvedValueOnce({ data: { ...reportPayload(), report: null }, error: null });
    renderReport("building");
    expect(await screen.findByText(/report is still building/i)).toBeInTheDocument();
  });

  it("keeps share, PDF, Deep Dive, and resend controls available in the ready state", async () => {
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { email: "lead@example.com" } } } });
    renderReport();

    fireEvent.click(await screen.findByRole("button", { name: /share link/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /email executive pdf/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /deep dive/i }).some((link) => link.getAttribute("href") === "/assess/deep/report-1")).toBe(true);
    expect(screen.getByRole("button", { name: /resend report link/i })).toBeInTheDocument();
  });

  it("emails the executive PDF and surfaces a direct link if email handoff fails", async () => {
    renderReport();
    fireEvent.click(await screen.findByRole("button", { name: /email executive pdf/i }));
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: "lead@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));

    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledWith("email-report-pdf", {
      body: { slug: "report-1", email: "lead@example.com" },
    }));
    expect(await screen.findByRole("link", { name: /download the pdf directly/i })).toHaveAttribute("href", "https://example.com/report.pdf");

    supabaseMocks.invoke.mockResolvedValueOnce({ data: { ok: false, pdfUrl: "https://example.com/fallback.pdf", error: "Queue failed" }, error: null });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));
    expect(await screen.findByRole("link", { name: /download the pdf directly/i })).toHaveAttribute("href", "https://example.com/fallback.pdf");
  });

  it("uses the centralized auth callback URL when resending a report link", async () => {
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { user: { email: "lead@example.com" } } } });
    renderReport();

    fireEvent.click(await screen.findByRole("button", { name: /resend report link/i }));

    await waitFor(() => expect(syncMocks.sendMagicLink).toHaveBeenCalledWith(
      "lead@example.com",
      expect.stringContaining("/auth/callback?next=%2Fassess%2Fr%2Freport-1"),
    ));
  });

  it("shows the auth gate for anonymous Deep Dive reports", async () => {
    supabaseMocks.rpc.mockImplementation((name: string) => {
      if (name === "get_report_by_slug") return Promise.resolve({ data: reportPayload({ isAnonymous: true }), error: null });
      if (name === "get_outcomes_for_report") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    renderReport();

    expect(await screen.findByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send secure sign-in link/i })).toBeInTheDocument();
  });

  it("keeps shared quickscan reports public but locks Deep Dive behind the claim gate", async () => {
    supabaseMocks.rpc.mockImplementation((name: string) => {
      if (name === "get_report_by_slug") return Promise.resolve({ data: reportPayload({ slug: "shared-lock", isAnonymous: true, hasDeepdive: false }), error: null });
      if (name === "get_outcomes_for_report") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    renderReport("shared-lock");

    expect(await screen.findByText(/Your operating shape, in one picture/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /continue deep dive/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send secure sign-in link/i }));

    await waitFor(() => expect(syncMocks.sendMagicLink).toHaveBeenCalledWith(
      "owner@example.com",
      expect.stringContaining("/auth/callback?next=%2Fassess%2Fdeep%2Fshared-lock&claim=shared-lock"),
    ));
  });

  it("places the individual Deep Dive capture before the benchmark cohort card", async () => {
    vi.mocked(fetchBestSlice).mockResolvedValueOnce({
      label: "All individual-level respondents",
      specificity: 1,
      matchType: "broad",
      row: {
        id: "benchmark-individual",
        level: "individual",
        function: null,
        region: null,
        sector: null,
        size_band: null,
        median_score: 58,
        pillar_medians: {},
        sample_size: 128,
        refreshed_at: "2026-01-01T00:00:00.000Z",
      },
    });
    supabaseMocks.rpc.mockImplementation((name: string) => {
      if (name === "get_report_by_slug") return Promise.resolve({ data: reportPayload({ level: "individual", isAnonymous: true, hasDeepdive: false }), error: null });
      if (name === "get_outcomes_for_report") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    renderReport();

    const unlock = await screen.findByText(/Unlock your full personal profile/i);
    const benchmark = await screen.findByText(/All individual-level respondents/i);

    expect(unlock.compareDocumentPosition(benchmark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send secure sign-in link/i })).toBeInTheDocument();
  });

  it("shows unlocked shared report CTAs when Deep Dive is already complete", async () => {
    supabaseMocks.rpc.mockImplementation((name: string) => {
      if (name === "get_report_by_slug") return Promise.resolve({ data: reportPayload({ slug: "shared-unlocked", isAnonymous: false, hasDeepdive: true }), error: null });
      if (name === "get_outcomes_for_report") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    renderReport("shared-unlocked");

    expect(await screen.findByText(/High confidence · Deep Dive complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /continue deep dive/i })).not.toBeInTheDocument();
  });
});