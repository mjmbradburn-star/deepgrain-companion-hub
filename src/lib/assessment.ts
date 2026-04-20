// Shared content + types for the AIOI diagnostic flow.
// Function-level pillar question seed (subset for v1 — 8 questions across 8 pillars).

import type { PillarIndex } from "@/components/aioi/PillarChip";
import type { Tier } from "@/components/aioi/TierBadge";

export type Level = "company" | "function" | "individual";

export const LEVELS: Record<Level, { title: string; tagline: string; time: string; audience: string }> = {
  company:    { title: "Company",    tagline: "The whole organisation.", time: "~22 min", audience: "Exec / Board" },
  function:   { title: "Function",   tagline: "One team, deeply.",       time: "~18 min", audience: "Function lead" },
  individual: { title: "Individual", tagline: "Your personal stack.",    time: "~12 min", audience: "IC / Operator" },
};

export const PILLAR_NAMES: Record<PillarIndex, string> = {
  1: "Strategy & Mandate",
  2: "Data Foundations",
  3: "Tooling & Infrastructure",
  4: "Workflow Integration",
  5: "Skills & Fluency",
  6: "Governance & Risk",
  7: "Measurement & ROI",
  8: "Culture & Adoption",
};

export const TIER_BY_INDEX: Tier[] = ["Dormant", "Reactive", "Exploratory", "Operational", "Integrated", "AI-Native"];

export interface QuestionOption {
  /** 0..5 maps to Tier index */
  tier: number;
  label: string;
  detail?: string;
}

export interface Question {
  id: string;
  pillar: PillarIndex;
  prompt: string;
  options: QuestionOption[]; // length 6, ordered Dormant..AI-Native
}

// One question per pillar — enough to wire the flow end-to-end before the full bank is seeded server-side.
export const FUNCTION_QUESTIONS: Question[] = [
  {
    id: "p1-mandate",
    pillar: 1,
    prompt: "Who actually owns AI in your function?",
    options: [
      { tier: 0, label: "Nobody. It hasn't come up." },
      { tier: 1, label: "Whoever shouts loudest in a given week." },
      { tier: 2, label: "An interested deputy, on the side of their desk." },
      { tier: 3, label: "A named lead with a remit, no budget." },
      { tier: 4, label: "A named lead with a remit and a budget." },
      { tier: 5, label: "It's the function head's first agenda item, every week." },
    ],
  },
  {
    id: "p2-data",
    pillar: 2,
    prompt: "If a model needed to read your function's data tomorrow, what would it find?",
    options: [
      { tier: 0, label: "PDFs, inboxes and Slack threads." },
      { tier: 1, label: "A few shared drives and one battered spreadsheet." },
      { tier: 2, label: "A CRM or warehouse, half-populated." },
      { tier: 3, label: "Clean tables for the core entities, gaps elsewhere." },
      { tier: 4, label: "A documented schema that engineering trusts." },
      { tier: 5, label: "Versioned, governed, and queryable by an agent today." },
    ],
  },
  {
    id: "p3-tools",
    pillar: 3,
    prompt: "What AI tooling is actually deployed in the function?",
    options: [
      { tier: 0, label: "None." },
      { tier: 1, label: "Personal ChatGPT accounts on company cards." },
      { tier: 2, label: "One team licence to Copilot or similar." },
      { tier: 3, label: "An approved stack with SSO and data controls." },
      { tier: 4, label: "Approved stack plus internal copilots for two workflows." },
      { tier: 5, label: "Bespoke agents in production, monitored, with fallbacks." },
    ],
  },
  {
    id: "p4-workflow",
    pillar: 4,
    prompt: "Where does AI sit in the actual day-to-day?",
    options: [
      { tier: 0, label: "Nowhere. It's a separate tab people open occasionally." },
      { tier: 1, label: "A few people use it for first drafts, off-process." },
      { tier: 2, label: "It's part of one named workflow, owned by one team." },
      { tier: 3, label: "Embedded in 2–3 workflows, with playbooks." },
      { tier: 4, label: "Default for most production work, with humans on review." },
      { tier: 5, label: "Workflows are designed model-first; humans escalate." },
    ],
  },
  {
    id: "p5-skills",
    pillar: 5,
    prompt: "How fluent is the median person in your function?",
    options: [
      { tier: 0, label: "Hasn't tried it." },
      { tier: 1, label: "Has typed into ChatGPT once or twice." },
      { tier: 2, label: "Uses it weekly for ad-hoc tasks." },
      { tier: 3, label: "Uses it daily, can iterate on prompts." },
      { tier: 4, label: "Builds reusable assets — prompts, templates, mini-tools." },
      { tier: 5, label: "Composes agents and ships them to colleagues." },
    ],
  },
  {
    id: "p6-governance",
    pillar: 6,
    prompt: "What governance is in place?",
    options: [
      { tier: 0, label: "None. We hope for the best." },
      { tier: 1, label: "An informal 'don't paste customer data' rule." },
      { tier: 2, label: "A written policy nobody has read." },
      { tier: 3, label: "Policy plus an approved-tools list, lightly enforced." },
      { tier: 4, label: "Policy, tooling, audit trails, periodic reviews." },
      { tier: 5, label: "Live monitoring, model risk register, board-level oversight." },
    ],
  },
  {
    id: "p7-roi",
    pillar: 7,
    prompt: "Can you point to the value AI has produced for this function?",
    options: [
      { tier: 0, label: "No, and we haven't tried to measure." },
      { tier: 1, label: "Anecdotes — 'it saves me an hour a week'." },
      { tier: 2, label: "One pilot with a rough time-saving figure." },
      { tier: 3, label: "Two or three named workflows with hours-saved tracked." },
      { tier: 4, label: "Hours, quality and cycle time, reported quarterly." },
      { tier: 5, label: "AI-attributable revenue or margin in the P&L." },
    ],
  },
  {
    id: "p8-culture",
    pillar: 8,
    prompt: "How do colleagues talk about using AI in their work?",
    options: [
      { tier: 0, label: "They don't." },
      { tier: 1, label: "Quietly, in case it looks like cheating." },
      { tier: 2, label: "Curiously, in 1:1s but not standups." },
      { tier: 3, label: "Openly, with the better users teaching the rest." },
      { tier: 4, label: "It's expected — 'have you tried with the model?' is normal." },
      { tier: 5, label: "Not using it for a task is the thing that needs explaining." },
    ],
  },
];

// ---- Local draft storage ---------------------------------------------------

const DRAFT_KEY = "aioi:draft:v1";

export interface AssessmentDraft {
  level?: Level;
  qualifier?: {
    role?: string;
    size?: string;
    pain?: string;
    email?: string;
    consentMarketing?: boolean;
    consentBenchmark?: boolean;
  };
  /** questionId -> selected tier index (0..5) */
  answers: Record<string, number>;
  startedAt?: string;
}

export function loadDraft(): AssessmentDraft {
  if (typeof window === "undefined") return { answers: {} };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { answers: {} };
    const parsed = JSON.parse(raw) as AssessmentDraft;
    return { answers: {}, ...parsed };
  } catch {
    return { answers: {} };
  }
}

export function saveDraft(draft: AssessmentDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}
