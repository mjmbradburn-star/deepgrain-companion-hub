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
});