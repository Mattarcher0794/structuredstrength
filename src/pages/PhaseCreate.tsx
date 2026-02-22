import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { findMatchingExercise } from "@/lib/exerciseMatching";
import { insertAIExercise } from "@/lib/exerciseInsert";

interface AIPlanExercise {
  name: string;
  muscleGroup: "Upper" | "Lower" | "Core" | "Full Body";
  subMuscle: string;
  equipment: string;
  movementPattern: "Push" | "Pull" | "Squat" | "Hinge" | "Lunge" | "Carry" | "Core";
  isUnilateral: boolean;
  sets: number;
  minReps: number;
  maxReps: number;
}

interface AIPlanDay {
  dayOfWeek: number;
  dayType: "strength" | "rest" | "cardio";
  workoutName: string | null;
  exercises: AIPlanExercise[];
}

interface AIPlan {
  planName: string;
  days: AIPlanDay[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayTypeBadge(type: string) {
  const styles: Record<string, string> = {
    strength: "bg-primary/10 text-primary border-primary/20",
    rest: "bg-muted text-muted-foreground border-border",
    cardio: "bg-accent/10 text-accent-foreground border-accent/20",
  };
  return styles[type] || styles.rest;
}

export default function PhaseCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("6");

  // AI suggestion state
  const [aiState, setAiState] = useState<"idle" | "loading" | "suggestion" | "error">("idle");
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [applyingPlan, setApplyingPlan] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: phase } = await supabase
        .from("phases")
        .insert({ user_id: user!.id, name, length_weeks: parseInt(weeks) })
        .select()
        .single();
      if (!phase) throw new Error("Failed to create phase");

      // Create 7 days (all rest by default)
      const days = Array.from({ length: 7 }, (_, i) => ({
        phase_id: phase.id,
        day_of_week: i + 1,
        day_type: "rest" as const,
      }));
      await supabase.from("phase_days").insert(days);
      return phase;
    },
    onSuccess: (phase) => {
      navigate(`/phases/${phase.id}`);
    },
  });

  const handleSuggest = async () => {
    if (!user) return;
    setAiState("loading");
    setAiPlan(null);

    try {
      // Detect user type
      const { count } = await supabase
        .from("phases")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      const isReturningUser = (count ?? 0) > 0;

      let lastTwoPhases: unknown[] = [];
      let recentSessions: unknown[] = [];

      if (isReturningUser) {
        // Fetch last 2 completed phases with full structure
        const { data: phases } = await supabase
          .from("phases")
          .select("id, name, length_weeks")
          .eq("user_id", user.id)
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

          lastTwoPhases = (phases ?? []).map((p) => ({
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

        // Recent session summary (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentSets } = await supabase
          .from("session_sets")
          .select("exercise_name_snapshot, workout_session_id, workout_sessions!inner(user_id, date)")
          .gte("workout_sessions.date", thirtyDaysAgo.toISOString().split("T")[0])
          .eq("workout_sessions.user_id", user.id);

        if (recentSets && recentSets.length > 0) {
          const grouped: Record<string, number> = {};
          for (const s of recentSets) {
            grouped[s.exercise_name_snapshot] = (grouped[s.exercise_name_snapshot] || 0) + 1;
          }
          recentSessions = Object.entries(grouped).map(([name, sets]) => ({ name, setsCompleted: sets }));
        }
      }

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke("suggest-plan", {
        body: {
          lengthWeeks: parseInt(weeks),
          isReturningUser,
          lastTwoPhases,
          recentSessions,
        },
      });

      if (error) throw error;
      if (!data?.plan?.planName || !Array.isArray(data.plan.days)) {
        throw new Error("Invalid plan structure");
      }

      setAiPlan(data.plan as AIPlan);
      setName(data.plan.planName);
      setAiState("suggestion");
    } catch (e) {
      console.error("AI suggest error:", e);
      setAiState("error");
    }
  };

  const handleUsePlan = async () => {
    if (!aiPlan || !user) return;
    setApplyingPlan(true);

    try {
      // 1. Create phase
      const { data: phase } = await supabase
        .from("phases")
        .insert({ user_id: user.id, name, length_weeks: parseInt(weeks) })
        .select()
        .single();
      if (!phase) throw new Error("Failed to create phase");

      // 2. Insert days
      const dayRows = aiPlan.days.map((d) => ({
        phase_id: phase.id,
        day_of_week: d.dayOfWeek,
        day_type: d.dayType,
        workout_name: d.workoutName,
      }));
      const { data: insertedDays } = await supabase.from("phase_days").insert(dayRows).select();
      if (!insertedDays) throw new Error("Failed to create days");

      // 3. For each strength/cardio day, resolve exercises and insert
      for (const day of aiPlan.days) {
        if (!day.exercises || day.exercises.length === 0) continue;

        const phaseDay = insertedDays.find((d) => d.day_of_week === day.dayOfWeek);
        if (!phaseDay) continue;

        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i];

          // a. Try matching
          let exerciseId = await findMatchingExercise(ex.name);

          // b. If no match, insert as AI-generated
          if (!exerciseId) {
            exerciseId = await insertAIExercise({
              name: ex.name,
              muscle_group: ex.muscleGroup,
              sub_muscle: ex.subMuscle,
              equipment: ex.equipment as any,
              movement_pattern: ex.movementPattern,
              is_unilateral: ex.isUnilateral,
            });
          }

          // c. Skip if still null
          if (!exerciseId) continue;

          // d. Insert phase_day_exercise
          await supabase.from("phase_day_exercises").insert({
            phase_day_id: phaseDay.id,
            exercise_id: exerciseId,
            order_index: i,
            num_sets: ex.sets,
            min_reps: ex.minReps,
            max_reps: ex.maxReps,
          });
        }
      }

      navigate(`/phases/${phase.id}`);
    } catch (e) {
      console.error("Apply plan error:", e);
      setApplyingPlan(false);
    }
  };

  const handleDismiss = () => {
    setAiState("idle");
    setAiPlan(null);
    setName("");
  };

  return (
    <div className="mx-auto max-w-lg px-5 pt-6 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-semibold mb-6">New phase</h1>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Phase name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Glute Focus Block"
            className="rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Length (weeks)</Label>
          <Input
            type="number"
            min="1"
            max="52"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="rounded-2xl w-24"
          />
        </div>

        {/* AI Suggestion Entry Point */}
        {aiState === "idle" && (
          <button
            onClick={handleSuggest}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggest a plan for me
          </button>
        )}

        {/* Loading State */}
        {aiState === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building your plan…
          </div>
        )}

        {/* Error State */}
        {aiState === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Couldn't generate a suggestion right now. You can still build your plan manually.
            </p>
            <button
              onClick={() => setAiState("idle")}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {/* Suggestion Card */}
        {aiState === "suggestion" && aiPlan && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            {/* Card label */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Suggested plan
              </span>
            </div>

            {/* Plan name */}
            <h2 className="text-xl font-semibold">{aiPlan.planName}</h2>

            {/* Day rows */}
            <div className="divide-y divide-border">
              {aiPlan.days
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((day) => (
                  <div key={day.dayOfWeek} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold w-10 shrink-0">{DAY_NAMES[day.dayOfWeek - 1]}</span>
                      <Badge variant="outline" className={`text-xs ${dayTypeBadge(day.dayType)}`}>
                        {day.dayType.charAt(0).toUpperCase() + day.dayType.slice(1)}
                      </Badge>
                      {day.workoutName && (
                        <span className="text-sm text-muted-foreground">{day.workoutName}</span>
                      )}
                    </div>
                    {day.exercises && day.exercises.length > 0 && (
                      <div className="ml-12 space-y-0.5">
                        {day.exercises.map((ex, i) => (
                          <p key={i} className="text-xs">
                            <span className="text-muted-foreground">{ex.name}</span>
                            <span className="text-muted-foreground/50"> — {ex.sets}×{ex.minReps}–{ex.maxReps} reps</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Footer note */}
            <div className="border-t border-border pt-4">
              <p className="text-xs italic text-muted-foreground/70">
                This is a starting point — you can edit everything after creating
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleUsePlan}
                disabled={applyingPlan}
                className="w-full rounded-2xl py-5"
              >
                {applyingPlan ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  "Use this plan"
                )}
              </Button>
              <button
                onClick={handleDismiss}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Start from scratch
              </button>
            </div>
          </div>
        )}

        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending || aiState === "suggestion"}
          className="w-full rounded-2xl py-5"
        >
          {createMutation.isPending ? "Creating…" : "Create phase"}
        </Button>
      </div>
    </div>
  );
}
