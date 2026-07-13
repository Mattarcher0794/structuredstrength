import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { BackBar } from "@/components/BackBar";
import ExerciseSearch from "@/components/ExerciseSearch";
import ExerciseConfigCard from "@/components/ExerciseConfigCard";

export default function WorkoutBuilder() {
  const { phaseId, dayId } = useParams<{ phaseId: string; dayId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const { data: day } = useQuery({
    queryKey: ["phase-day", dayId],
    queryFn: async () => {
      const { data } = await supabase.from("phase_days").select("*").eq("id", dayId!).single();
      return data;
    },
  });

  const { data: dayExercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ["phase-day-exercises", dayId],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_day_exercises")
        .select("*, exercises(*)")
        .eq("phase_day_id", dayId!)
        .order("order_index");
      return data ?? [];
    },
  });

  const addedExerciseIds = dayExercises.map((de: any) => de.exercise_id);

  const addExercise = useMutation({
    mutationFn: async (exerciseId: string) => {
      await supabase.from("phase_day_exercises").insert({
        phase_day_id: dayId!,
        exercise_id: exerciseId,
        order_index: dayExercises.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-day-exercises", dayId] });
    },
  });

  const removeExercise = useMutation({
    mutationFn: async (pdeId: string) => {
      await supabase.from("phase_day_exercises").delete().eq("id", pdeId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase-day-exercises", dayId] }),
  });

  const updateExercise = useMutation({
    mutationFn: async ({ pdeId, field, value }: { pdeId: string; field: string; value: number }) => {
      await supabase.from("phase_day_exercises").update({ [field]: value }).eq("id", pdeId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase-day-exercises", dayId] }),
  });

  const updateWorkoutName = useMutation({
    mutationFn: async (name: string) => {
      await supabase.from("phase_days").update({ workout_name: name }).eq("id", dayId!);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase-day", dayId] }),
  });

  const [workoutName, setWorkoutName] = useState("");

  useEffect(() => {
    setWorkoutName(day?.workout_name ?? "");
  }, [day?.workout_name]);

  

  return (
    <div className="mx-auto max-w-lg px-5 pt-6 pb-24">
      <BackBar label="Phase" onClick={() => navigate(`/phases/${phaseId}`)} />

      <div className="mb-6">
        <Input
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          onBlur={() => {
            const trimmed = workoutName.trim();
            if (trimmed !== (day?.workout_name ?? "").trim()) {
              updateWorkoutName.mutate(trimmed);
            }
          }}
          placeholder="Workout name (e.g. Upper Pull)"
          autoCorrect="off"
          spellCheck={false}
          className="rounded-2xl text-lg font-medium border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Current exercises */}
      <div className="space-y-3 mb-6">
        {dayExercises.map((pde: any) => (
          <ExerciseConfigCard
            key={pde.id}
            id={pde.id}
            name={pde.exercises?.name ?? ""}
            numSets={pde.num_sets}
            minReps={pde.min_reps}
            maxReps={pde.max_reps}
            onRemove={(pdeId) => removeExercise.mutate(pdeId)}
            onUpdate={(pdeId, field, value) => updateExercise.mutate({ pdeId, field, value })}
          />
        ))}
      </div>

      {/* Add exercises */}
      <Button onClick={() => setShowPicker(true)} variant="outline" className="w-full rounded-2xl gap-1 border-dashed">
        <Plus className="h-4 w-4" /> Add exercise
      </Button>

      <ExerciseSearch
        open={showPicker}
        onClose={() => setShowPicker(false)}
        title="Add to workout"
        excludeIds={addedExerciseIds}
        onSelect={(ex) => {
          addExercise.mutate(ex.id);
          setShowPicker(false);
        }}
      />
    </div>
  );
}
