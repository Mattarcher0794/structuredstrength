import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import ExerciseSearch from "@/components/ExerciseSearch";

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
      <button onClick={() => navigate(`/phases/${phaseId}`)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to phase
      </button>

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
      <div className="space-y-2 mb-6">
        {dayExercises.map((pde: any) => (
          <div key={pde.id} className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/30" />
              <span className="flex-1 text-sm font-medium">{pde.exercises?.name}</span>
              <button onClick={() => removeExercise.mutate(pde.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <div className="flex gap-2 ml-6">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">Sets</span>
                <Input
                  type="number"
                  min="1"
                  value={pde.num_sets}
                  onChange={(e) => updateExercise.mutate({ pdeId: pde.id, field: "num_sets", value: parseInt(e.target.value) || 1 })}
                  className="h-7 w-14 rounded-lg text-center text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">Reps</span>
                <Input
                  type="number"
                  min="1"
                  value={pde.min_reps}
                  onChange={(e) => updateExercise.mutate({ pdeId: pde.id, field: "min_reps", value: parseInt(e.target.value) || 1 })}
                  className="h-7 w-14 rounded-lg text-center text-xs"
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                  type="number"
                  min="1"
                  value={pde.max_reps}
                  onChange={(e) => updateExercise.mutate({ pdeId: pde.id, field: "max_reps", value: parseInt(e.target.value) || 1 })}
                  className="h-7 w-14 rounded-lg text-center text-xs"
                />
              </div>
            </div>
          </div>
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
