import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Pause, Play, RotateCcw, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ExerciseSwapSheet from "@/components/ExerciseSwapSheet";

export default function ActiveWorkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Rest timer
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restTarget, setRestTarget] = useState(90);
  const restStartRef = useRef<number>(0);
  const restTargetRef = useRef<number>(90);

  // Swap
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapMuscleGroup, setSwapMuscleGroup] = useState("");
  const [swapMovementPattern, setSwapMovementPattern] = useState("");

  const { data: session } = useQuery({
    queryKey: ["workout-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("workout_sessions").select("*, phase_days(*, phase_day_exercises(*, exercises(*)))").eq("id", sessionId!).single();
      return data;
    },
  });

  const { data: sessionSets = [] } = useQuery({
    queryKey: ["session-sets", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("session_sets").select("*").eq("workout_session_id", sessionId!).order("completed_at");
      return data ?? [];
    },
  });

  const { data: swaps = [] } = useQuery({
    queryKey: ["session-swaps", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("session_exercise_swaps").select("*, replacement:replacement_exercise_id(*)").eq("workout_session_id", sessionId!);
      return data ?? [];
    },
  });

  const logSet = useMutation({
    mutationFn: async ({ exerciseId, exerciseName, setNumber, reps, weight }: any) => {
      await supabase.from("session_sets").insert({
        workout_session_id: sessionId!,
        exercise_id: exerciseId,
        exercise_name_snapshot: exerciseName,
        set_number: setNumber,
        reps: parseInt(reps),
        weight: parseFloat(weight) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-sets", sessionId] });
      // Auto-start rest timer
      restStartRef.current = Date.now();
      restTargetRef.current = restTarget;
      setRestTime(restTarget);
      setRestRunning(true);
    },
  });

  const finishWorkout = useMutation({
    mutationFn: async () => {
      await supabase.from("workout_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      navigate("/");
    },
  });

  // Rest timer effect
  useEffect(() => {
    if (!restRunning) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      const remaining = restTargetRef.current - elapsed;
      if (remaining <= 0) {
        setRestTime(0);
        setRestRunning(false);
      } else {
        setRestTime(remaining);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [restRunning]);

  const exercises = session?.phase_days?.phase_day_exercises
    ?.sort((a: any, b: any) => a.order_index - b.order_index) ?? [];

  // Resolve swapped exercises
  const getEffectiveExercise = useCallback((pde: any) => {
    const swap = swaps.find((s: any) => s.original_exercise_id === pde.exercise_id);
    if (swap) return { id: swap.replacement_exercise_id, name: (swap as any).replacement?.name || "Swapped" };
    return { id: pde.exercise_id, name: pde.exercises?.name || "" };
  }, [swaps]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-lg pb-32">
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Button
          onClick={() => finishWorkout.mutate()}
          variant="outline"
          size="sm"
          className="rounded-2xl text-xs"
          disabled={finishWorkout.isPending}
        >
          Finish workout
        </Button>
      </div>
      <div className="px-5 pt-4">

      <h1 className="text-xl font-semibold mb-1">{session?.phase_days?.workout_name || "Workout"}</h1>
      <p className="text-xs text-muted-foreground mb-6">Log each set as you go</p>

      <div className="space-y-4">
        {exercises.map((pde: any) => {
          const eff = getEffectiveExercise(pde);
          const completedSets = sessionSets.filter((s: any) => s.exercise_id === eff.id);
          return (
            <ExerciseCard
              key={pde.id}
              exerciseId={eff.id}
              exerciseName={eff.name}
              numSets={pde.num_sets}
              minReps={pde.min_reps}
              maxReps={pde.max_reps}
              completedSets={completedSets}
              onLogSet={(setNumber, reps, weight) =>
                logSet.mutate({ exerciseId: eff.id, exerciseName: eff.name, setNumber, reps, weight })
              }
              onSwap={() => {
                setSwapExerciseId(pde.exercise_id);
                setSwapMuscleGroup(pde.exercises?.muscle_group || "");
                setSwapMovementPattern(pde.exercises?.movement_pattern || "");
              }}
              isSwapped={swaps.some((s: any) => s.original_exercise_id === pde.exercise_id)}
            />
          );
        })}
      </div>

      </div>{/* close inner px-5 wrapper */}

      {/* Rest Timer Overlay */}
      {restRunning && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150 p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="mx-auto max-w-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Rest</p>
              <p className="text-2xl font-display font-semibold tabular-nums">{formatTime(restTime)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setRestRunning(false)}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => {
                restStartRef.current = Date.now();
                restTargetRef.current = restTarget;
                setRestTime(restTarget);
              }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setRestRunning(false); setRestTime(0); }}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {!restRunning && restTime === 0 && null}

      {/* Swap Sheet */}
      <ExerciseSwapSheet
        open={!!swapExerciseId}
        onClose={() => setSwapExerciseId(null)}
        sessionId={sessionId!}
        originalExerciseId={swapExerciseId || ""}
        muscleGroup={swapMuscleGroup}
        movementPattern={swapMovementPattern}
      />
    </div>
  );
}

function ExerciseCard({
  exerciseId, exerciseName, numSets, minReps, maxReps,
  completedSets, onLogSet, onSwap, isSwapped,
}: {
  exerciseId: string; exerciseName: string; numSets: number;
  minReps: number; maxReps: number; completedSets: any[];
  onLogSet: (setNumber: number, reps: string, weight: string) => void;
  onSwap: () => void; isSwapped: boolean;
}) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const nextSet = completedSets.length + 1;
  const allDone = completedSets.length >= numSets;

  // Pre-fill from last completed set
  useEffect(() => {
    if (completedSets.length > 0) {
      const last = completedSets[completedSets.length - 1];
      setWeight(String(last.weight || ""));
    }
  }, [completedSets.length]);

  return (
    <div className={cn("rounded-2xl bg-card border border-border p-4", allDone && "opacity-60")}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">{exerciseName}</h3>
          <p className="text-xs text-muted-foreground">
            {numSets} sets × {minReps}{maxReps !== minReps ? `–${maxReps}` : ""} reps
            {isSwapped && <span className="ml-1 text-primary">(swapped)</span>}
          </p>
        </div>
        <button onClick={onSwap} className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Completed sets */}
      {completedSets.map((s: any) => (
        <div key={s.id} className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-primary" />
          <span>Set {s.set_number}: {s.weight}kg × {s.reps}</span>
        </div>
      ))}

      {/* Next set input */}
      {!allDone && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground w-8">#{nextSet}</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-8 w-20 rounded-lg text-center text-[16px] leading-tight"
          />
          <span className="text-muted-foreground text-xs">×</span>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-8 w-20 rounded-lg text-center text-[16px] leading-tight"
          />
          <Button
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={!reps}
            onClick={() => {
              onLogSet(nextSet, reps, weight);
              setReps("");
            }}
          >
            Log
          </Button>
        </div>
      )}
    </div>
  );
}
