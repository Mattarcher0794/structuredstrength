import { supabase } from "@/integrations/supabase/client";
import type { AIPlan } from "@/components/AIPlanSuggestionCard";

interface UserHistory {
  isReturningUser: boolean;
  lastTwoPhases: unknown[];
  recentSessions: unknown[];
}

export async function fetchUserHistory(userId: string): Promise<UserHistory> {
  const { count } = await supabase
    .from("phases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  const isReturningUser = (count ?? 0) > 0;
  let lastTwoPhases: unknown[] = [];
  let recentSessions: unknown[] = [];

  if (isReturningUser) {
    const { data: phases } = await supabase
      .from("phases")
      .select("id, name, length_weeks")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(2);

    if (phases && phases.length > 0) {
      const phaseIds = phases.map((p) => p.id);
      const { data: phaseDays } = await supabase
        .from("phase_days")
        .select("id, day_of_week, day_type, workout_name, phase_id")
        .in("phase_id", phaseIds);

      const dayIds = (phaseDays ?? []).map((d) => d.id);
      const { data: dayExercises } = await supabase
        .from("phase_day_exercises")
        .select("phase_day_id, num_sets, min_reps, max_reps, exercise_id, exercises(name)")
        .in("phase_day_id", dayIds);

      lastTwoPhases = phases.map((p) => ({
        name: p.name,
        length_weeks: p.length_weeks,
        days: (phaseDays ?? [])
          .filter((d) => d.phase_id === p.id)
          .map((d) => ({
            day_of_week: d.day_of_week,
            day_type: d.day_type,
            workout_name: d.workout_name,
            exercises: (dayExercises ?? [])
              .filter((e) => e.phase_day_id === d.id)
              .map((e) => ({
                name: (e.exercises as any)?.name ?? "Unknown",
                num_sets: e.num_sets,
                min_reps: e.min_reps,
                max_reps: e.max_reps,
              })),
          })),
      }));
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSets } = await supabase
      .from("session_sets")
      .select("exercise_name_snapshot, workout_session_id, workout_sessions!inner(user_id, date)")
      .gte("workout_sessions.date", thirtyDaysAgo.toISOString().split("T")[0])
      .eq("workout_sessions.user_id", userId);

    if (recentSets && recentSets.length > 0) {
      const grouped: Record<string, number> = {};
      for (const s of recentSets) {
        grouped[s.exercise_name_snapshot] = (grouped[s.exercise_name_snapshot] || 0) + 1;
      }
      recentSessions = Object.entries(grouped).map(([name, sets]) => ({ name, setsCompleted: sets }));
    }
  }

  return { isReturningUser, lastTwoPhases, recentSessions };
}

export async function callSuggestPlan(params: {
  lengthWeeks: number;
  isReturningUser: boolean;
  lastTwoPhases: unknown[];
  recentSessions: unknown[];
  phaseName?: string;
}): Promise<AIPlan> {
  const { data, error } = await supabase.functions.invoke("suggest-plan", {
    body: params,
  });
  if (error) throw error;
  if (!data?.plan?.planName || !Array.isArray(data.plan.days)) {
    throw new Error("Invalid plan structure");
  }
  return data.plan as AIPlan;
}
