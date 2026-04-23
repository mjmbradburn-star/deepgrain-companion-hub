import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Assess from "./Assess";
import AssessScan from "./AssessScan";
import { getQuickscanQuestions, saveScan } from "@/lib/quickscan";
import { LocationProbe, type TestLevel } from "@/test/auth-flow-harness";

const supabaseMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: supabaseMocks.invoke },
    from: supabaseMocks.from,
  },
}));

function renderAssess() {
  return render(
    <MemoryRouter initialEntries={["/assess"]}>
      <Routes>
        <Route path="/assess" element={<><Assess /><LocationProbe /></>} />
        <Route path="/assess/scan" element={<><h1>Scan route</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderScan() {
  return render(
    <MemoryRouter initialEntries={["/assess/scan"]}>
      <Routes>
        <Route path="/assess/scan" element={<><AssessScan /><LocationProbe /></>} />
        <Route path="/assess/r/:slug" element={<><h1>Report ready</h1><LocationProbe /></>} />
        <Route path="/assess" element={<><h1>Choose level</h1><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("assessment entry and quickscan regression flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    supabaseMocks.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    supabaseMocks.invoke.mockResolvedValue({ data: { slug: "scan-report" }, error: null });
  });

  it.each<TestLevel>(["company", "function", "individual"])("starts the %s scan and persists the selected level", async (level) => {
    renderAssess();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${level}.*start scan`, "i") }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/assess/scan"));
    expect(JSON.parse(localStorage.getItem("aioi:draft:v1") || "{}").level).toBe(level);
    expect(JSON.parse(localStorage.getItem("aioi:scan:v1") || "{}").level).toBe(level);
  });

  it("renders the company-specific agent question", async () => {
    saveScan({ level: "company", answers: {} });
    renderScan();

    expect(await screen.findByText(/Question 1 of 9/i)).toBeInTheDocument();
    expect(getQuickscanQuestions("company").some((question) => /AI agents are live/i.test(question.prompt))).toBe(true);
  });

  it("prevents double-submit races on the final quickscan answer", async () => {
    const questions = getQuickscanQuestions("function");
    saveScan({
      level: "function",
      answers: Object.fromEntries(questions.slice(0, -1).map((question) => [question.id, 3])),
    });

    renderScan();
    fireEvent.click(await screen.findByRole("button", { name: /quietly, in case it looks like cheating/i }));
    fireEvent.click(screen.getByRole("button", { name: /quietly, in case it looks like cheating/i }));

    await waitFor(() => expect(supabaseMocks.invoke).toHaveBeenCalledTimes(1));
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("submit-quickscan", expect.objectContaining({
      body: expect.objectContaining({ level: "function" }),
    }));
  });

  it("shows safe retry and review actions when quickscan scoring fails", async () => {
    const questions = getQuickscanQuestions("individual");
    saveScan({
      level: "individual",
      answers: Object.fromEntries(questions.slice(0, -1).map((question) => [question.id, 2])),
    });
    const serverError = new Error("500 scoring error");
    serverError.name = "FunctionsHttpError";
    supabaseMocks.invoke.mockResolvedValueOnce({ data: null, error: serverError });

    renderScan();
    fireEvent.click(await screen.findByRole("button", { name: /not using it for a task/i }));

    expect(await screen.findByText(/Our scoring service hiccupped/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /review answers/i }));
    expect(await screen.findByText(/How do you share what you learn from AI/i)).toBeInTheDocument();
  });
});