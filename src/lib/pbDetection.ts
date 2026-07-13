import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for ranking sets. A "better" set is the heavier one;
 * ties at the same weight are broken by more reps. Used by both the live
 * in-workout PB trophies and the exercise history sheet.
 */

export interface SetLike {
  weight: number | null;
  reps: number | null;
}

/** True if `candidate` ranks strictly above `incumbent` (heavier, then more reps). */
export function isBetterSet(candidate: SetLike, incumbent: SetLike): boolean {
  const cW = candidate.weight ?? 0;
  const iW = incumbent.weight ?? 0;
  if (cW !== iW) return cW > iW;
  return (candidate.reps ?? 0) > (incumbent.reps ?? 0);
}

/** The single best set (heaviest, then most reps), or null when the list is empty. */
export function pickBestSet<T extends SetLike>(sets: T[]): T | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) => (isBetterSet(s, best) ? s : best), sets[0]);
}

/**
 * The best set ever logged for an exercise, EXCLUDING the current session.
 * Null when there is no prior history (so the first-ever session is not a PB).
 */
export async function getPreviousBestSet(
  exerciseId: string,
  currentSessionId: string,
): Promise<{ weight: number; reps: number } | null> {
  const { data, error } = await supabase
    .from("session_sets")
    .select("weight, reps")
    .eq("exercise_id", exerciseId)
    .neq("workout_session_id", currentSessionId)
    .not("weight", "is", null);

  if (error || !data || data.length === 0) return null;
  const best = pickBestSet(data);
  return best ? { weight: best.weight ?? 0, reps: best.reps ?? 0 } : null;
}
