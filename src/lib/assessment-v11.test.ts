import { describe, expect, it } from "vitest";

import { getDeepDiveQuestions } from "./assessment";
import { getQuickscanQuestions } from "./quickscan";

const companyAdditions = [
  "c-p2-corpus",
  "c-p2-memory",
  "c-p3-orchestration",
  "c-p3-observability",
  "c-p3-toolconnect",
  "c-p5-prompts",
  "c-p5-evals",
];

describe("AIOI v1.1 question catalogue", () => {
  it("adds the PDF-driven company quickscan agent question", () => {
    const questions = getQuickscanQuestions("company");

    expect(questions).toHaveLength(9);
    expect(questions.map((q) => q.id).slice(2, 4)).toEqual(["qs-c-p3", "qs-c-p3-agents"]);
    expect(questions.find((q) => q.id === "qs-c-p3-agents")?.options).toHaveLength(6);
  });

  it("keeps company deep dive unique and ordered per v1.1", () => {
    const questions = getDeepDiveQuestions("company");
    const ids = questions.map((q) => q.id);

    expect(ids).not.toContain("c-p1-mandate");
    expect(ids).not.toContain("c-p3-tools");
    expect(ids).toEqual([
      "c-p1-strategy",
      "c-p2-quality",
      "c-p2-corpus",
      "c-p2-memory",
      "c-p3-infra",
      "c-p3-orchestration",
      "c-p3-observability",
      "c-p3-toolconnect",
      "c-p4-redesign",
      "c-p5-training",
      "c-p5-prompts",
      "c-p5-evals",
      "c-p6-review",
      "c-p7-baseline",
      "c-p8-leadership",
    ]);
  });

  it("stamps every v1.1 addition with six options and detail metadata", () => {
    const questions = [
      ...getDeepDiveQuestions("company").filter((q) => companyAdditions.includes(q.id)),
      ...getDeepDiveQuestions("function").filter((q) => ["f-p3-agents", "f-p5-prompts"].includes(q.id)),
      ...getDeepDiveQuestions("individual").filter((q) => q.id === "i-p3-agents"),
    ];

    expect(questions).toHaveLength(10);
    for (const question of questions) {
      expect(question.version).toBe("v1.1");
      expect(question.status).toBe("active");
      expect(question.flow).toBe("deep");
      expect(question.options).toHaveLength(6);
      expect(question.detail?.rationale).toBeTruthy();
      expect(question.detail?.trap).toBeTruthy();
      expect(question.detail?.crosscheck).toBeTruthy();
    }
  });

  it("keeps duplicate quickscan questions out of every live deep dive", () => {
    const duplicateIds = [
      "c-p1-mandate", "c-p2-data", "c-p3-tools", "c-p4-workflow", "c-p5-skills", "c-p6-governance", "c-p7-roi", "c-p8-culture",
      "f-p1-owner", "f-p2-data", "f-p3-tools", "f-p4-workflow", "f-p5-fluency", "f-p6-policy", "f-p7-roi", "f-p8-talk",
      "i-p1-intent", "i-p2-context", "i-p3-tools", "i-p4-workflow", "i-p5-fluency", "i-p6-hygiene", "i-p7-time", "i-p8-share",
    ];

    const liveIds = [
      ...getDeepDiveQuestions("company"),
      ...getDeepDiveQuestions("function"),
      ...getDeepDiveQuestions("individual"),
    ].map((question) => question.id);

    for (const id of duplicateIds) {
      expect(liveIds).not.toContain(id);
    }
  });

  it("gives every active live question six options and rationale metadata", () => {
    const liveQuestions = [
      ...getQuickscanQuestions("company"),
      ...getQuickscanQuestions("function"),
      ...getQuickscanQuestions("individual"),
      ...getDeepDiveQuestions("company"),
      ...getDeepDiveQuestions("function"),
      ...getDeepDiveQuestions("individual"),
    ];

    for (const question of liveQuestions) {
      expect(question.options).toHaveLength(6);
      if (question.flow === "deep" || question.id === "qs-c-p3-agents") {
        expect(question.detail?.rationale).toBeTruthy();
      }
    }
  });
});