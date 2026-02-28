import { supabase } from "@/integrations/supabase/client";

/**
 * For a list of sessions, determine which ones contain at least one PB set.
 * Returns a Set of session IDs that have PBs.
 */
export async function detectSessionPBs(
  sessions: Array<{ id: string; started_at: string }>
): Promise<Set<string>> {
  if (sessions.length === 0) return new Set();

  const sessionIds = sessions.map((s) => s.id);

  // Fetch all sets for these sessions
  const { data: allSets } = await supabase
    .from("session_sets")
    .select("id, workout_session_id, exercise_id, weight")
    .in("workout_session_id", sessionIds);

  if (!allSets || allSets.length === 0) return new Set();

  // Build a map of session started_at
  const sessionStartMap = new Map(sessions.map((s) => [s.id, s.started_at]));

  // Collect unique exercise IDs
  const exerciseIds = [...new Set(allSets.map((s) => s.exercise_id))];

  // Fetch ALL sets for these exercises (to compare historical bests)
  const { data: historicalSets } = await supabase
    .from("session_sets")
    .select("exercise_id, weight, completed_at, workout_session_id")
    .in("exercise_id", exerciseIds);

  if (!historicalSets) return new Set();

  const pbSessionIds = new Set<string>();

  for (const set of allSets) {
    if (!set.weight || set.weight <= 0) continue;
    const sessionStartedAt = sessionStartMap.get(set.workout_session_id);
    if (!sessionStartedAt) continue;

    // Find max weight for this exercise in earlier sessions
    const maxPrevious = historicalSets
      .filter(
        (h) =>
          h.exercise_id === set.exercise_id &&
          h.workout_session_id !== set.workout_session_id &&
          h.completed_at &&
          h.completed_at < sessionStartedAt
      )
      .reduce((max, h) => Math.max(max, h.weight ?? 0), 0);

    if (set.weight > maxPrevious && maxPrevious > 0) {
      pbSessionIds.add(set.workout_session_id);
    }
  }

  return pbSessionIds;
}

/**
 * For a single session, returns a Set of set IDs that are PBs.
 */
export async function detectSetPBs(
  sessionId: string,
  sessionStartedAt: string,
  sets: Array<{ id: string; exercise_id: string; weight: number | null }>
): Promise<Set<string>> {
  if (sets.length === 0) return new Set();

  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];

  const { data: historicalSets } = await supabase
    .from("session_sets")
    .select("exercise_id, weight, completed_at, workout_session_id")
    .in("exercise_id", exerciseIds)
    .neq("workout_session_id", sessionId);

  if (!historicalSets) return new Set();

  // Build max weight per exercise from earlier sessions
  const maxWeightMap = new Map<string, number>();
  for (const h of historicalSets) {
    if (!h.completed_at || h.completed_at >= sessionStartedAt) continue;
    const current = maxWeightMap.get(h.exercise_id) ?? 0;
    maxWeightMap.set(h.exercise_id, Math.max(current, h.weight ?? 0));
  }

  const pbSetIds = new Set<string>();
  for (const set of sets) {
    if (!set.weight || set.weight <= 0) continue;
    const prev = maxWeightMap.get(set.exercise_id);
    if (prev !== undefined && prev > 0 && set.weight > prev) {
      pbSetIds.add(set.id);
    }
  }

  return pbSetIds;
}
