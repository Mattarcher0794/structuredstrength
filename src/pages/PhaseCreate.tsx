import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { BackBar } from "@/components/BackBar";
import { findMatchingExercise } from "@/lib/exerciseMatching";
import { insertAIExercise } from "@/lib/exerciseInsert";
import { fetchUserHistory, callSuggestPlan } from "@/lib/aiPlanService";
import AIPlanSuggestionCard, { type AIPlan } from "@/components/AIPlanSuggestionCard";

export default function PhaseCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("6");

  const [aiState, setAiState] = useState<"idle" | "loading" | "suggestion" | "error">("idle");
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [applyingPlan, setApplyingPlan] = useState(false);
  const autoTriggered = useRef(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: phase } = await supabase
        .from("phases")
        .insert({ user_id: user!.id, name, length_weeks: parseInt(weeks) })
        .select()
        .single();
      if (!phase) throw new Error("Failed to create phase");

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
      const history = await fetchUserHistory(user.id);
      const plan = await callSuggestPlan({
        lengthWeeks: parseInt(weeks),
        ...history,
      });

      setAiPlan(plan);
      setName(plan.planName);
      setAiState("suggestion");
    } catch (e) {
      console.error("AI suggest error:", e);
      setAiState("error");
    }
  };

  // Auto-trigger AI suggestion when ?agent=true
  useEffect(() => {
    if (searchParams.get("agent") === "true" && user && !autoTriggered.current && aiState === "idle") {
      autoTriggered.current = true;
      handleSuggest();
    }
  }, [user, searchParams]);

  const handleUsePlan = async () => {
    if (!aiPlan || !user) return;
    setApplyingPlan(true);

    try {
      const { data: phase } = await supabase
        .from("phases")
        .insert({ user_id: user.id, name, length_weeks: parseInt(weeks), start_date: new Date().toISOString().split("T")[0] })
        .select()
        .single();
      if (!phase) throw new Error("Failed to create phase");

      const dayRows = aiPlan.days.map((d) => ({
        phase_id: phase.id,
        day_of_week: d.dayOfWeek,
        day_type: d.dayType,
        workout_name: d.workoutName,
      }));
      const { data: insertedDays } = await supabase.from("phase_days").insert(dayRows).select();
      if (!insertedDays) throw new Error("Failed to create days");

      for (const day of aiPlan.days) {
        if (!day.exercises || day.exercises.length === 0) continue;
        const phaseDay = insertedDays.find((d) => d.day_of_week === day.dayOfWeek);
        if (!phaseDay) continue;

        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i];
          let exerciseId = await findMatchingExercise(ex.name);
          if (!exerciseId) {
            exerciseId = await insertAIExercise({
              name: ex.name,
              muscle_group: ex.muscleGroup as any,
              sub_muscle: ex.subMuscle,
              equipment: ex.equipment as any,
              movement_pattern: ex.movementPattern as any,
              is_unilateral: ex.isUnilateral,
            });
          }
          if (!exerciseId) continue;

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
      <BackBar label="Back" onClick={() => navigate(-1)} />

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

        {aiState === "idle" && (
          <button
            onClick={handleSuggest}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggest a plan for me
          </button>
        )}

        {aiState === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building your plan…
          </div>
        )}

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

        {aiState === "suggestion" && aiPlan && (
          <AIPlanSuggestionCard
            plan={aiPlan}
            applying={applyingPlan}
            onUsePlan={handleUsePlan}
            onDismiss={handleDismiss}
            dismissLabel="Start from scratch"
          />
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
