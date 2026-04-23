import { supabase } from "@/integrations/supabase/client";
import { getDeepDiveQuestions } from "@/lib/assessment";

export function getIndividualDeepDiveQuestionIds() {
  return getDeepDiveQuestions("individual").map((question) => question.id);
}

export function findMissingQuestionIds(clientIds: string[], databaseIds: string[]) {
  const databaseIdSet = new Set(databaseIds);
  return clientIds.filter((id) => !databaseIdSet.has(id));
}

export async function fetchExistingQuestionIds(questionIds: string[]) {
  if (questionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .in("id", questionIds);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export async function checkIndividualDeepDiveQuestionBank() {
  const clientIds = getIndividualDeepDiveQuestionIds();
  const databaseIds = await fetchExistingQuestionIds(clientIds);
  return findMissingQuestionIds(clientIds, databaseIds);
}

export function runDevQuestionBankIntegrityCheck() {
  if (!import.meta.env.DEV) return;

  void checkIndividualDeepDiveQuestionBank()
    .then((missingIds) => {
      if (missingIds.length > 0) {
        console.error(
          `[question-bank] Missing individual Deep Dive question rows in public.questions: ${missingIds.join(", ")}`,
        );
      }
    })
    .catch((error) => {
      console.error("[question-bank] Could not verify individual Deep Dive question rows", error);
    });
}