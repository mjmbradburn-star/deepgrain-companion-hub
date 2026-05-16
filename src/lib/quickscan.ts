// 3-question Archetype Quickscan — client-side scoring, no server round-trip.
// Uses the question bank and scoring from assessment.ts.

import {
  QUESTIONS,
  calculateArchetype,
  type ArchetypeDraft,
} from "@/lib/assessment";

const SCAN_KEY = "dg:archetype:scan";

export function getQuickscanQuestions() {
  return QUESTIONS;
}

export function loadScan(): ArchetypeDraft {
  if (typeof window === "undefined") return { answers: {} };
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return { answers: {} };
    return { answers: {}, ...(JSON.parse(raw) as ArchetypeDraft) };
  } catch {
    return { answers: {} };
  }
}

export function saveScan(d: ArchetypeDraft) {
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

export { calculateArchetype };
