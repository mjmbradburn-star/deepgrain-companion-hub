// 8-question Quickscan — one prompt per pillar, per level.
// Answer rows persist in the same `responses` table as the deep set,
// against question IDs prefixed `qs-` (already seeded server-side).
//
// Function-level variants for P4 (workflow) + P7 (ROI) carry over from
// the deep set so the prompt sharpens once a respondent picks a function.

import type { PillarIndex } from "@/components/aioi/PillarChip";
import type { Level, BusinessFunction, Question, QuestionOption } from "@/lib/assessment";
import {
  COMPANY_QUESTIONS,
  FUNCTION_QUESTIONS,
  INDIVIDUAL_QUESTIONS,
  FUNCTION_VARIANTS,
} from "@/lib/assessment";

/** Map of (level, pillar) → the canonical deep-set question we re-use options from. */
const SOURCE_BY_LEVEL: Record<Level, Record<PillarIndex, string>> = {
  company: {
    1: "c-p1-mandate",
    2: "c-p2-data",
    3: "c-p3-tools",
    4: "c-p4-workflow",
    5: "c-p5-skills",
    6: "c-p6-governance",
    7: "c-p7-roi",
    8: "c-p8-culture",
  },
  function: {
    1: "f-p1-owner",
    2: "f-p2-data",
    3: "f-p3-tools",
    4: "f-p4-workflow",
    5: "f-p5-fluency",
    6: "f-p6-policy",
    7: "f-p7-roi",
    8: "f-p8-talk",
  },
  individual: {
    1: "i-p1-intent",
    2: "i-p2-context",
    3: "i-p3-tools",
    4: "i-p4-workflow",
    5: "i-p5-fluency",
    6: "i-p6-hygiene",
    7: "i-p7-time",
    8: "i-p8-share",
  },
};

const QSCAN_ID_PREFIX: Record<Level, string> = {
  company: "qs-c-p",
  function: "qs-f-p",
  individual: "qs-i-p",
};

function poolFor(level: Level): Question[] {
  if (level === "company") return COMPANY_QUESTIONS;
  if (level === "individual") return INDIVIDUAL_QUESTIONS;
  return FUNCTION_QUESTIONS;
}

/** All 8 quickscan questions for the level, with optional function-variant swap. */
export function getQuickscanQuestions(level: Level, fn?: BusinessFunction): Question[] {
  const pool = poolFor(level);
  const sourceMap = SOURCE_BY_LEVEL[level];
  const out: Question[] = [];
  for (let p = 1 as PillarIndex; p <= 8; p = ((p as number) + 1) as PillarIndex) {
    const sourceId = sourceMap[p];
    const source = pool.find((q) => q.id === sourceId);
    if (!source) continue;
    const variant = level === "function" && fn ? FUNCTION_VARIANTS[sourceId]?.[fn] : undefined;
    out.push({
      id: `${QSCAN_ID_PREFIX[level]}${p}`,
      pillar: p,
      prompt: variant?.prompt ?? source.prompt,
      options: variant?.options ?? source.options,
    });
  }
  if (level === "company") {
    const insertAt = out.findIndex((q) => q.pillar === 4);
    out.splice(insertAt === -1 ? out.length : insertAt, 0, COMPANY_AGENT_QUESTION);
  }
  return out;
}


const COMPANY_AGENT_QUESTION: Question = {
  id: "qs-c-p3-agents",
  pillar: 3,
  prompt: "How many AI agents are live in production with a named owner?",
  options: [
    { tier: 0, label: "None. We haven't built any." },
    { tier: 1, label: "We've piloted something. Nothing in production." },
    { tier: 2, label: "One or two agents live. Ownership is informal." },
    { tier: 3, label: "Several live agents, each with a named owner, scope, and guardrails." },
    { tier: 4, label: "Agents sit in the critical path of core workflows, with supervision and evals." },
    { tier: 5, label: "Multi-agent orchestration is standard. Agents are reviewed weekly like any production system." },
  ],
  detail: {
    rationale: "Named owner is the gate between Tier 2 and Tier 3 because an unowned agent is a liability, not an asset.",
    trap: "Copilot is assistive autocomplete, not an agent. Tier 3+ needs a named agent and owner.",
    crosscheck: "Agent tier cannot exceed Tooling infrastructure tier by more than 1.",
  },
  version: "v1.1",
  flow: "quickscan",
  status: "active",
};

const SCAN_KEY = "aioi:scan:v1";

export interface QuickscanDraft {
  level?: Level;
  function?: BusinessFunction;
  region?: string;
  /** questionId -> tier index (0..5) */
  answers: Record<string, number>;
  startedAt?: string;
  /** Set after submit — used for resuming the report and the deep-dive flow. */
  slug?: string;
}

export function loadScan(): QuickscanDraft {
  if (typeof window === "undefined") return { answers: {} };
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return { answers: {} };
    return { answers: {}, ...(JSON.parse(raw) as QuickscanDraft) };
  } catch {
    return { answers: {} };
  }
}

export function saveScan(d: QuickscanDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCAN_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearScan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SCAN_KEY);
}

export type { QuestionOption };
