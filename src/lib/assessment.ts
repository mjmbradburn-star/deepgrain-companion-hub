export type Level = "company" | "function" | "individual";

export const LEVELS: Record<Level, { title: string; tagline: string; time: string; audience: string }> = {
  company: { title: "Company", tagline: "How the whole organisation works with AI.", time: "~60 sec", audience: "Founders, C-suite, board members" },
  function: { title: "Function", tagline: "How a single team or department operates.", time: "~60 sec", audience: "Department heads, team leads, senior managers" },
  individual: { title: "Individual", tagline: "Your personal operating model with AI.", time: "~60 sec", audience: "Solo operators, consultants, specialists" },
};

const DRAFT_KEY = "dg:assessment:draft";

export interface AssessmentDraft {
  level?: Level;
  answers?: Record<string, number>;
  startedAt?: string;
  slug?: string;
}

export function loadDraft(): AssessmentDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AssessmentDraft;
  } catch {
    return {};
  }
}

export function saveDraft(draft: AssessmentDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}
