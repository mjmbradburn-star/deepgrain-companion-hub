import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyReports from "./MyReports";
import { LocationProbe, testSession } from "@/test/auth-flow-harness";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
      signOut: supabaseMocks.signOut,
    },
    from: supabaseMocks.from,
  },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

function mockReportsQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn(() => ({ order }));
  supabaseMocks.from.mockReturnValue({ select });
  return { select, order };
}

function renderMyReports() {
  return render(
    <MemoryRouter initialEntries={["/reports"]}>
      <Routes>
        <Route path="/reports" element={<><MyReports /><LocationProbe /></>} />
        <Route path="/signin" element={<><h1>Sign in</h1><LocationProbe /></>} />
        <Route path="/assess" element={<><h1>Assessment</h1><LocationProbe /></>} />
        <Route path="/assess/r/:slug" element={<><h1>Report detail</h1><LocationProbe /></>} />
        <Route path="/" element={<><h1>Home</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MyReports account report flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: testSession } });
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    supabaseMocks.signOut.mockResolvedValue({ error: null });
    mockReportsQuery([]);
  });

  it("redirects signed-out users to sign in and preserves the reports return path", async () => {
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });

    renderMyReports();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/signin?next=/reports"));
  });

  it("shows an empty state with a clear assessment start action", async () => {
    renderMyReports();

    expect(await screen.findByText(/No reports yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start the assessment/i })).toHaveAttribute("href", "/assess");
  });

  it("lists completed and in-progress reports with the correct actions", async () => {
    mockReportsQuery([
      {
        id: "respondent-1",
        slug: "ready-report",
        level: "company",
        function: null,
        region: "Europe",
        submitted_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        reports: { aioi_score: 72, overall_tier: "Leveraged" },
      },
      {
        id: "respondent-2",
        slug: "draft-report",
        level: "function",
        function: "Sales",
        region: "UK & Ireland",
        submitted_at: null,
        created_at: "2026-01-02T00:00:00.000Z",
        reports: null,
      },
    ]);

    renderMyReports();

    expect(await screen.findByText(/Signed in as lead@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/slug ready-report/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view report/i })).toHaveAttribute("href", "/assess/r/ready-report");
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resume/i })).toHaveAttribute("href", "/assess");
  });

  it("signs out from the reports page without leaving stale account controls", async () => {
    renderMyReports();

    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(supabaseMocks.signOut).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/"));
  });

  it("surfaces a load failure without hiding the account actions", async () => {
    mockReportsQuery(null, { message: "database unavailable" });

    renderMyReports();

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Could not load your reports",
      description: "database unavailable",
      variant: "destructive",
    })));
    expect(screen.getByRole("link", { name: /new assessment/i })).toHaveAttribute("href", "/assess");
  });
});