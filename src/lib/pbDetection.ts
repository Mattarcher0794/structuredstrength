import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the highest weight ever logged for a given exercise,
 * excluding the current active session.
 */
export async function getPreviousBest(
  exerciseId: string,
  currentSessionId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("session_sets")
    .select("weight")
    .eq("exercise_id", exerciseId)
    .neq("workout_session_id", currentSessionId)
    .order("weight", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.weight ?? null;
}

/**
 * Returns true if the given weight exceeds the previous best,
 * or if there is no previous best (first time logging).
 */
export function isPersonalBest(
  weight: number,
  previousBest: number | null
): boolean {
  if (weight <= 0) return false;
  if (previousBest === null) return true;
  return weight > previousBest;
}
