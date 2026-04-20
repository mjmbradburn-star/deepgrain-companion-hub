// Shared content + types for the AIOI diagnostic flow.
// Function-level pillar question bank (v2 — 19 questions across 8 pillars).

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

// 2–3 questions per pillar. Order matters: the diagnostic walks pillar by pillar.
export const FUNCTION_QUESTIONS: Question[] = [
  // ─── P1 Strategy & Mandate ──────────────────────────────────────────────
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
    id: "p1-strategy",
    pillar: 1,
    prompt: "Is there a written AI strategy for the function?",
    options: [
      { tier: 0, label: "No, and nobody has asked for one." },
      { tier: 1, label: "A few slides someone made for an offsite." },
      { tier: 2, label: "A draft document, never finalised." },
      { tier: 3, label: "A one-pager with goals, owned by the lead." },
      { tier: 4, label: "Strategy with quarterly milestones tied to OKRs." },
      { tier: 5, label: "AI is the operating model — the strategy is the strategy." },
    ],
  },

  // ─── P2 Data Foundations ────────────────────────────────────────────────
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
    id: "p2-quality",
    pillar: 2,
    prompt: "How confident are you in the quality of that data?",
    options: [
      { tier: 0, label: "We don't really know what's in there." },
      { tier: 1, label: "We know it's messy; nobody has time to fix it." },
      { tier: 2, label: "We trust one or two reports, not the rest." },
      { tier: 3, label: "Core entities are clean; we audit occasionally." },
      { tier: 4, label: "Quality SLAs exist; owners are named." },
      { tier: 5, label: "Continuous monitoring; data quality is a tracked KPI." },
    ],
  },
  {
    id: "p2-access",
    pillar: 2,
    prompt: "How easily can the team get the data they need?",
    options: [
      { tier: 0, label: "They ask in Slack and hope." },
      { tier: 1, label: "Someone in BI runs it on request, eventually." },
      { tier: 2, label: "Self-serve dashboards for the obvious questions." },
      { tier: 3, label: "Self-serve for most, BI for the long tail." },
      { tier: 4, label: "Natural-language queries on a governed warehouse." },
      { tier: 5, label: "Agents pull and join data across systems autonomously." },
    ],
  },

  // ─── P3 Tooling & Infrastructure ────────────────────────────────────────
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
    id: "p3-integration",
    pillar: 3,
    prompt: "How well does AI tooling connect to the rest of your stack?",
    options: [
      { tier: 0, label: "It doesn't. Copy-paste is the integration." },
      { tier: 1, label: "Browser extensions and clipboard." },
      { tier: 2, label: "A handful of off-the-shelf integrations." },
      { tier: 3, label: "Sanctioned connectors for the systems that matter." },
      { tier: 4, label: "API-level integration with our core systems." },
      { tier: 5, label: "Models and tools share a unified context layer." },
    ],
  },

  // ─── P4 Workflow Integration ────────────────────────────────────────────
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
    id: "p4-redesign",
    pillar: 4,
    prompt: "Have you redesigned any workflows around AI, rather than bolting it on?",
    options: [
      { tier: 0, label: "No — workflows are exactly as they were." },
      { tier: 1, label: "We've talked about it. Nothing changed." },
      { tier: 2, label: "One workflow has been tweaked to include AI steps." },
      { tier: 3, label: "Two or three workflows were redesigned around AI." },
      { tier: 4, label: "Most core workflows have been rebuilt model-first." },
      { tier: 5, label: "New work is designed for AI by default; humans escalate." },
    ],
  },

  // ─── P5 Skills & Fluency ────────────────────────────────────────────────
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
    id: "p5-training",
    pillar: 5,
    prompt: "What's in place to grow that fluency?",
    options: [
      { tier: 0, label: "Nothing. People figure it out alone." },
      { tier: 1, label: "An optional Lunch & Learn happened once." },
      { tier: 2, label: "A self-serve library of links and recordings." },
      { tier: 3, label: "Structured onboarding and a shared prompt library." },
      { tier: 4, label: "Role-specific training with ongoing peer review." },
      { tier: 5, label: "AI fluency is a hiring and promotion criterion." },
    ],
  },

  // ─── P6 Governance & Risk ───────────────────────────────────────────────
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
    id: "p6-review",
    pillar: 6,
    prompt: "How are AI outputs reviewed before they reach a customer or decision?",
    options: [
      { tier: 0, label: "They aren't. Whatever the model said, ships." },
      { tier: 1, label: "The author eyeballs it." },
      { tier: 2, label: "Peer review for anything customer-facing." },
      { tier: 3, label: "Documented review steps for risky outputs." },
      { tier: 4, label: "Tiered review with sign-off thresholds by risk." },
      { tier: 5, label: "Automated evals plus human-in-the-loop for high-stakes." },
    ],
  },

  // ─── P7 Measurement & ROI ───────────────────────────────────────────────
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
    id: "p7-baseline",
    pillar: 7,
    prompt: "Do you have a baseline you measure improvements against?",
    options: [
      { tier: 0, label: "No baseline. No measurement." },
      { tier: 1, label: "Gut feel from before vs after." },
      { tier: 2, label: "Rough baseline for one workflow." },
      { tier: 3, label: "Baselines for the workflows we've automated." },
      { tier: 4, label: "Baselines plus quarterly re-measurement." },
      { tier: 5, label: "Continuous baselines feeding a live ROI dashboard." },
    ],
  },

  // ─── P8 Culture & Adoption ──────────────────────────────────────────────
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
  {
    id: "p8-leadership",
    pillar: 8,
    prompt: "How visibly does leadership use AI themselves?",
    options: [
      { tier: 0, label: "They don't, and don't pretend to." },
      { tier: 1, label: "A curious exec or two in private." },
      { tier: 2, label: "The function head dabbles, talks about it sometimes." },
      { tier: 3, label: "Leadership demos AI use in team meetings." },
      { tier: 4, label: "Leaders ship AI-built artefacts as a matter of course." },
      { tier: 5, label: "Leadership operates AI-first; the team follows the example." },
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
  /** Set once the user has signed in and the respondent row exists. */
  respondentId?: string;
  respondentSlug?: string;
  /** True once we've fired signInWithOtp for this draft's email. */
  magicLinkSent?: boolean;
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
