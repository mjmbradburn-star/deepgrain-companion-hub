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
  const { error } = await supabase.from("archetype_results").insert({
    user_id: result.user_id,
    archetype_index: result.archetype_index,
    answers: result.answers,
    level: result.level,
  });
  if (error) throw error;
}

export async function fetchMyResults(): Promise<ArchetypeResult[]> {
  const { data, error } = await supabase
    .from("archetype_results")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ArchetypeResult[];
}

export async function saveEmailCapture(params: {
  email: string;
  archetype_index: ArchetypeIndex;
  answers: Record<string, number>;
  level: "company" | "function" | "individual";
}) {
  const { error } = await supabase.from("email_captures").insert({
    email: params.email,
    archetype_index: params.archetype_index,
    answers: params.answers,
    level: params.level,
  });
  if (error) throw error;
}
