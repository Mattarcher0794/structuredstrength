import { supabase } from "@/integrations/supabase/client";

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find a matching approved exercise by name.
 * Returns the exercise id if found, null otherwise.
 */
export async function findMatchingExercise(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("is_approved", true);

  if (error || !data) return null;

  const lower = name.toLowerCase().trim();

  // 1. Exact case-insensitive match
  const exact = data.find((e) => e.name.toLowerCase().trim() === lower);
  if (exact) return exact.id;

  // 2. Normalised match
  const norm = normalise(name);
  const normMatch = data.find((e) => normalise(e.name) === norm);
  if (normMatch) return normMatch.id;

  return null;
}
