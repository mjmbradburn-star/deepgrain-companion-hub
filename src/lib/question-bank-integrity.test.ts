import { describe, expect, it } from "vitest";

import {
  fetchExistingQuestionIds,
  findMissingQuestionIds,
  getIndividualDeepDiveQuestionIds,
} from "./question-bank-integrity";

describe("individual Deep Dive question bank integrity", () => {
  it("has a public.questions row for every client-side individual Deep Dive question ID", async () => {
    const clientIds = getIndividualDeepDiveQuestionIds();
    const databaseIds = await fetchExistingQuestionIds(clientIds);

    expect(findMissingQuestionIds(clientIds, databaseIds)).toEqual([]);
  });
});