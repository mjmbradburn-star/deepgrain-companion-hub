import { supabase } from "@/integrations/supabase/client";
import type { ArchetypeIndex } from "@/lib/archetypes";

export interface ArchetypeResult {
  id?: string;
  user_id?: string;
  archetype_index: ArchetypeIndex;
  answers: Record<string, number>;
  level: "company" | "function" | "individual";
  created_at?: string;
}

export async function saveArchetypeResult(result: Omit<ArchetypeResult, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("archetype_results")
    .insert({
      user_id: result.user_id,
      archetype_index: result.archetype_index,
      answers: result.answers,
      level: result.level,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id;
}

export async function getUserResults(userId: string) {
  const { data, error } = await supabase
    .from("archetype_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ArchetypeResult[];
}
