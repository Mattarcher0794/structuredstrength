import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { playRestTimerDing } from "@/lib/restTimerSound";
import { getPreviousBest } from "@/lib/pbDetection";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pause, RotateCcw, ArrowRightLeft, Check, Plus, Trophy } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import ExerciseSearch from "@/components/ExerciseSearch";

export default function ActiveWorkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Active exercise index
  const [activeIndex, setActiveIndex] = useState(0);

  // Rest timer
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restTarget, setRestTarget] = useState(90);
  const restStartRef = useRef<number>(0);
  const restTargetRef = useRef<number>(90);

  // Fetch user profile for default rest seconds
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("default_rest_seconds")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const defaultRest = profile?.default_rest_seconds ?? 90;

  // Swap
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapMuscleGroup, setSwapMuscleGroup] = useState("");
  const [swapMovementPattern, setSwapMovementPattern] = useState("");

  // Add exercise
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [adHocExercises, setAdHocExercises] = useState<Array<{
    id: string; exerciseId: string; exerciseName: string;
    numSets: number; minReps: number; maxReps: number;
  }>>([]);

  // PB tracking — maps exerciseId to best weight achieved this session
  const [sessionBests, setSessionBests] = useState<Record<string, {
    exerciseName: string;
    weight: number;
  }>>({});

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
    mutationFn: async ({ exerciseId, exerciseName, setNumber, reps, weight, exerciseRestSeconds }: any) => {
      await supabase.from("session_sets").insert({
        workout_session_id: sessionId!,
        exercise_id: exerciseId,
        exercise_name_snapshot: exerciseName,
        set_number: setNumber,
        reps: parseInt(reps),
        weight: parseFloat(weight) || 0,
      });
      return { exerciseRestSeconds, exerciseId, exerciseName, weight: parseFloat(weight) || 0 };
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["session-sets", sessionId] });
      const duration = variables.exerciseRestSeconds ?? defaultRest;
      restStartRef.current = Date.now();
      restTargetRef.current = duration;
      setRestTarget(duration);
      setRestTime(duration);
      setRestRunning(true);

      // PB detection
      if (data.weight > 0) {
        const previousBest = await getPreviousBest(data.exerciseId, sessionId!);
        if (previousBest === null) return; // no history — not a PB
        const currentSessionBest = sessionBests[data.exerciseId]?.weight ?? null;
        const effectiveBest = Math.max(previousBest ?? 0, currentSessionBest ?? 0);
        if (data.weight > effectiveBest) {
          setSessionBests(prev => ({
            ...prev,
            [data.exerciseId]: { exerciseName: data.exerciseName, weight: data.weight },
          }));
        }
      }
    },
  });

  const finishWorkout = useMutation({
    mutationFn: async () => {
      await supabase.from("workout_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      navigate(`/workout/${sessionId}/summary`, {
        replace: true,
        state: {
          sessionId,
          workoutName: session?.phase_days?.workout_name || "Workout",
          sessionPBs: Object.entries(sessionBests).map(([exerciseId, { exerciseName, weight }]) => ({ exerciseId, exerciseName, weight })),
          startedAt: session?.started_at,
        },
      });
    },
  });

  // Rest timer effect
  useEffect(() => {
    if (!restRunning) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      const remaining = restTargetRef.current - elapsed;
      if (remaining <= 0) {
        playRestTimerDing();
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

  const getEffectiveExercise = useCallback((pde: any) => {
    const swap = swaps.find((s: any) => s.original_exercise_id === pde.exercise_id);
    if (swap) return { id: swap.replacement_exercise_id, name: (swap as any).replacement?.name || "Swapped" };
    return { id: pde.exercise_id, name: pde.exercises?.name || "" };
  }, [swaps]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-lg pb-32">
      {/* Header */}
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
        <p className="text-xs text-muted-foreground mb-5">Log each set as you go</p>

        <div className="space-y-2">
          {exercises.map((pde: any, index: number) => {
            const eff = getEffectiveExercise(pde);
            const completedSets = sessionSets.filter((s: any) => s.exercise_id === eff.id);
            const isActive = activeIndex === index;

            return isActive ? (
              <ActiveExerciseCard
                key={pde.id}
                exerciseId={eff.id}
                exerciseName={eff.name}
                numSets={pde.num_sets}
                minReps={pde.min_reps}
                maxReps={pde.max_reps}
                completedSets={completedSets}
                onLogSet={(setNumber, reps, weight) =>
                  logSet.mutate({ exerciseId: eff.id, exerciseName: eff.name, setNumber, reps, weight, exerciseRestSeconds: pde.rest_seconds })
                }
                sessionId={sessionId!}
                sessionPBs={sessionBests}
                onSwap={() => {
                  setSwapExerciseId(pde.exercise_id);
                  setSwapMuscleGroup(pde.exercises?.muscle_group || "");
                  setSwapMovementPattern(pde.exercises?.movement_pattern || "");
                }}
                isSwapped={swaps.some((s: any) => s.original_exercise_id === pde.exercise_id)}
              />
            ) : (
              <InactiveExerciseCard
                key={pde.id}
                exerciseName={eff.name}
                numSets={pde.num_sets}
                completedCount={completedSets.length}
                onClick={() => setActiveIndex(index)}
              />
            );
          })}

          {/* Ad-hoc exercises */}
          {adHocExercises.map((adHoc, i) => {
            const globalIndex = exercises.length + i;
            const completedSets = sessionSets.filter((s: any) => s.exercise_id === adHoc.exerciseId);
            const isActive = activeIndex === globalIndex;

            return isActive ? (
              <ActiveExerciseCard
                key={adHoc.id}
                exerciseId={adHoc.exerciseId}
                exerciseName={adHoc.exerciseName}
                numSets={adHoc.numSets}
                minReps={adHoc.minReps}
                maxReps={adHoc.maxReps}
                completedSets={completedSets}
                onLogSet={(setNumber, reps, weight) =>
                  logSet.mutate({ exerciseId: adHoc.exerciseId, exerciseName: adHoc.exerciseName, setNumber, reps, weight, exerciseRestSeconds: null })
                }
                sessionId={sessionId!}
                sessionPBs={sessionBests}
                onSwap={() => {}}
                isSwapped={false}
              />
            ) : (
              <InactiveExerciseCard
                key={adHoc.id}
                exerciseName={adHoc.exerciseName}
                numSets={adHoc.numSets}
                completedCount={completedSets.length}
                onClick={() => setActiveIndex(globalIndex)}
              />
            );
          })}

          {/* Add exercise CTA */}
          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </button>
        </div>
      </div>

      {/* Rest Timer */}
      {restRunning && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150 p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="mx-auto max-w-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Rest</p>
              <p className="text-2xl font-display font-semibold tabular-nums">
                {formatTime(restTime)}
              </p>
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
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { playRestTimerDing(); setRestRunning(false); setRestTime(0); }}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {!restRunning && restTime === 0 && null}

      {/* Swap Exercise Overlay */}
      <ExerciseSearch
        open={!!swapExerciseId}
        onClose={() => setSwapExerciseId(null)}
        title="Swap exercise"
        defaultMuscleGroup={swapMuscleGroup || undefined}
        highlightMovementPattern={swapMovementPattern || undefined}
        excludeIds={swapExerciseId ? [swapExerciseId] : []}
        onSelect={async (ex) => {
          await supabase.from("session_exercise_swaps").upsert(
            { workout_session_id: sessionId!, original_exercise_id: swapExerciseId!, replacement_exercise_id: ex.id },
            { onConflict: "workout_session_id,original_exercise_id" }
          );
          queryClient.invalidateQueries({ queryKey: ["session-swaps", sessionId] });
          setSwapExerciseId(null);
        }}
      />

      {/* Add Exercise Overlay */}
      <ExerciseSearch
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="Add exercise"
        onSelect={(ex) => {
          const newIndex = exercises.length + adHocExercises.length;
          setAdHocExercises(prev => [...prev, {
            id: `adhoc-${Date.now()}`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            numSets: 3,
            minReps: 8,
            maxReps: 12,
          }]);
          setActiveIndex(newIndex);
          setAddSheetOpen(false);
        }}
      />
    </div>
  );
}

/* ── Editable Set Pill ── */
function EditableSetPill({
  set,
  isEditing,
  onStartEdit,
  onCancelEdit,
  sessionId,
  isPB,
}: {
  set: any;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  sessionId: string;
  isPB: boolean;
}) {
  const queryClient = useQueryClient();
  const [editReps, setEditReps] = useState(String(set.reps ?? ""));
  const [editWeight, setEditWeight] = useState(String(set.weight ?? ""));
  const [repsInvalid, setRepsInvalid] = useState(false);
  const [weightInvalid, setWeightInvalid] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset local state when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditReps(String(set.reps ?? ""));
      setEditWeight(String(set.weight ?? ""));
      setRepsInvalid(false);
      setWeightInvalid(false);
      setError(false);
    }
  }, [isEditing, set.reps, set.weight]);

  // Click-outside handler
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancelEdit();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing, onCancelEdit]);

  const updateSet = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("session_sets")
        .update({ reps: parseInt(editReps), weight: parseFloat(editWeight) })
        .eq("id", set.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-sets", sessionId] });
      onCancelEdit();
    },
    onError: () => setError(true),
  });

  const handleConfirm = () => {
    const repsValid = editReps.trim() !== "" && /^\d+$/.test(editReps.trim()) && parseInt(editReps) > 0;
    const weightValid = editWeight.trim() !== "" && /^\d*\.?\d+$/.test(editWeight.trim());
    setRepsInvalid(!repsValid);
    setWeightInvalid(!weightValid);
    if (repsValid && weightValid) {
      updateSet.mutate();
    }
  };

  if (!isEditing) {
    const pill = (
      <button
        onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          isPB
            ? "bg-[#FFFBEB] dark:bg-[#3D3400] text-secondary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60"
        )}
      >
        <span className="inline-flex items-center gap-1">
          {isPB && <Trophy className="h-3 w-3" style={{ color: "#B8860B" }} />}
          {set.reps} × {set.weight}kg
        </span>
      </button>
    );

    if (isPB) {
      return (
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {pill}
        </motion.div>
      );
    }

    return pill;
  }

  return (
    <div ref={containerRef} className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        inputMode="numeric"
        value={editReps}
        onChange={(e) => { setEditReps(e.target.value); setRepsInvalid(false); }}
        className={cn(
          "h-7 w-12 rounded-lg bg-secondary text-center text-xs font-medium text-secondary-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-ring",
          repsInvalid && "ring-2 ring-destructive"
        )}
        placeholder="reps"
        autoFocus
      />
      <span className="text-xs text-muted-foreground">×</span>
      <input
        type="text"
        inputMode="decimal"
        value={editWeight}
        onChange={(e) => { setEditWeight(e.target.value); setWeightInvalid(false); }}
        className={cn(
          "h-7 w-14 rounded-lg bg-secondary text-center text-xs font-medium text-secondary-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-ring",
          weightInvalid && "ring-2 ring-destructive"
        )}
        placeholder="kg"
      />
      <button
        onClick={handleConfirm}
        disabled={updateSet.isPending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25 active:bg-primary/30"
      >
        <Check className="h-4 w-4" />
      </button>
      {error && <span className="text-[10px] text-destructive">Couldn't save</span>}
    </div>
  );
}

/* ── Active Exercise Card ── */
function ActiveExerciseCard({
  exerciseId, exerciseName, numSets, minReps, maxReps,
  completedSets, onLogSet, onSwap, isSwapped, sessionId, sessionPBs,
}: {
  exerciseId: string; exerciseName: string; numSets: number;
  minReps: number; maxReps: number; completedSets: any[];
  onLogSet: (setNumber: number, reps: string, weight: string) => void;
  onSwap: () => void; isSwapped: boolean; sessionId: string;
  sessionPBs: Record<string, { exerciseName: string; weight: number }>;
}) {
  const { user } = useAuth();
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const nextSet = completedSets.length + 1;
  const allDone = completedSets.length >= numSets;

  // Fetch previous session weight for set #1
  const { data: prevWeight } = useQuery({
    queryKey: ["prev-weight", exerciseId, sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_sets")
        .select("weight")
        .eq("exercise_id", exerciseId)
        .neq("workout_session_id", sessionId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.weight ?? null;
    },
  });

  // Fetch all sets from the most recent previous session for this exercise
  const { data: prevSets = [] } = useQuery({
    queryKey: ["prev-session-sets", exerciseId, sessionId],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from("session_sets")
        .select("workout_session_id")
        .eq("exercise_id", exerciseId)
        .neq("workout_session_id", sessionId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) return [];
      const { data: sets } = await supabase
        .from("session_sets")
        .select("set_number, reps, weight")
        .eq("workout_session_id", latest.workout_session_id)
        .eq("exercise_id", exerciseId)
        .order("set_number", { ascending: true });
      return sets ?? [];
    },
  });

  // Full exercise history — only fetched when sheet is open
  const { data: historyData } = useQuery({
    queryKey: ["exercise-history", exerciseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_sets")
        .select(`
          id,
          set_number,
          reps,
          weight,
          completed_at,
          workout_session_id,
          workout_sessions!inner(
            id,
            completed_at,
            user_id
          )
        `)
        .eq("exercise_id", exerciseId)
        .eq("workout_sessions.user_id", user!.id)
        .not("weight", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isHistoryOpen && !!exerciseId && !!user?.id,
  });

  // Compute all-time best set and grouped sessions
  const bestSet = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;
    return historyData.reduce((best: any, s: any) =>
      (s.weight ?? 0) > (best.weight ?? 0) ? s : best
    , historyData[0]);
  }, [historyData]);

  const groupedSessions = useMemo(() => {
    if (!historyData) return [];
    const groups = new Map<string, { date: string; sets: any[] }>();
    historyData.forEach((s: any) => {
      const wsId = s.workout_session_id;
      if (!groups.has(wsId)) {
        const sessionDate = (s as any).workout_sessions?.completed_at || s.completed_at;
        groups.set(wsId, { date: sessionDate, sets: [] });
      }
      groups.get(wsId)!.sets.push(s);
    });
    // Sort groups by date descending
    const arr = Array.from(groups.values());
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Sort sets within each group
    arr.forEach(g => g.sets.sort((a: any, b: any) => a.set_number - b.set_number));
    return arr;
  }, [historyData]);

  // Pre-fill weight: within-session carry forward, or previous session for set #1
  useEffect(() => {
    if (completedSets.length > 0) {
      const last = completedSets[completedSets.length - 1];
      setWeight(String(last.weight || ""));
    } else if (prevWeight !== undefined && prevWeight !== null) {
      setWeight(String(prevWeight));
    }
  }, [completedSets.length, prevWeight]);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-border/60 p-5 shadow-md transition-all duration-250 ease-in-out",
        allDone && "opacity-60"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-lg font-semibold leading-tight">{exerciseName}</h3>
        <button onClick={onSwap} className="text-muted-foreground hover:text-primary transition-colors mt-0.5">
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Prescription */}
      <p className={cn("text-xs text-muted-foreground", prevSets.length > 0 ? "mb-1" : "mb-3")}>
        {numSets} sets × {minReps}{maxReps !== minReps ? `–${maxReps}` : ""} reps
        {isSwapped && <span className="ml-1 text-primary">(swapped)</span>}
      </p>

      {/* Set history CTA */}
      <button
        onClick={() => setIsHistoryOpen(true)}
        className="text-xs text-muted-foreground mb-3"
      >
        🕐 Set history
      </button>

      {/* Completed sets as pills */}
      {completedSets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {completedSets.map((s: any) => {
            const pbEntry = sessionPBs[exerciseId];
            const isPB = !!pbEntry && s.weight === pbEntry.weight;
            return (
              <EditableSetPill
                key={s.id}
                set={s}
                isEditing={editingSetId === s.id}
                onStartEdit={() => setEditingSetId(s.id)}
                onCancelEdit={() => setEditingSetId(null)}
                sessionId={sessionId}
                isPB={isPB}
              />
            );
          })}
        </div>
      )}

      {/* Next set input */}
      {!allDone && (
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium w-8 shrink-0">#{nextSet}</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="next"
              placeholder="reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  weightInputRef.current?.focus();
                }
              }}
              className="h-12 flex-1 rounded-xl text-center text-[16px] leading-tight"
              style={{ fontSize: "20px" }}
            />
            <span className="text-muted-foreground text-sm font-medium">×</span>
            <Input
              ref={weightInputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              enterKeyHint="done"
              placeholder="kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onFocus={() => weightInputRef.current?.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (reps) {
                    onLogSet(nextSet, reps, weight);
                    setReps("");
                  }
                }
              }}
              className="h-12 flex-1 rounded-xl text-center text-[16px] leading-tight"
              style={{ fontSize: "20px" }}
            />
          </div>
          <Button
            className="w-full mt-3 h-11 rounded-xl text-base font-semibold"
            disabled={!reps}
            onClick={() => {
              onLogSet(nextSet, reps, weight);
              setReps("");
            }}
          >
            Log set
          </Button>
        </div>
      )}

      {/* Exercise History Bottom Sheet */}
      <BottomSheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={exerciseName}
      >
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold -mt-1 mb-4">Exercise History</p>

        {/* All-time best set callout */}
        {bestSet ? (
          <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-200 p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🏆</span>
              <div>
                <p className="text-[#C4899A] text-xs uppercase tracking-wider font-semibold">All-Time Best Set</p>
                <p className="text-lg font-extrabold text-[#1a1714] mt-0.5">
                  {bestSet.reps} reps × {bestSet.weight}kg
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {bestSet.completed_at ? format(new Date(bestSet.completed_at), "d MMM yyyy") : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          historyData !== undefined && (
            <p className="text-sm text-muted-foreground text-center py-6">No history yet</p>
          )
        )}

        {/* Session history list */}
        {groupedSessions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Session History</p>
            <div className="max-h-[40vh] overflow-y-auto space-y-0">
              {groupedSessions.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <div className="border-t border-gray-100 my-3" />}
                  <p className="text-sm font-semibold text-gray-500 mb-1.5">
                    {format(new Date(group.date), "d MMM yyyy")}
                  </p>
                  <div className="space-y-1">
                    {group.sets.map((s: any) => {
                      const isBest = bestSet && s.weight === bestSet.weight && s.reps === bestSet.reps;
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 w-10">Set {s.set_number}</span>
                          <span className="text-gray-700">{s.reps} reps × {s.weight}kg</span>
                          {isBest && (
                            <span className="bg-yellow-50 border border-yellow-600 text-yellow-700 text-[10px] font-semibold rounded px-1.5 py-0.5">PB</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/* ── Inactive Exercise Card ── */
function InactiveExerciseCard({
  exerciseName, numSets, completedCount, onClick,
}: {
  exerciseName: string; numSets: number; completedCount: number;
  onClick: () => void;
}) {
  const allDone = completedCount >= numSets;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-left transition-all duration-200 hover:bg-secondary/80 active:scale-[0.98]",
        allDone && "opacity-50"
      )}
    >
      <span className="text-sm font-medium text-foreground truncate">{exerciseName}</span>
      <span className="text-xs text-muted-foreground shrink-0 ml-3">
        {completedCount > 0 ? `${completedCount} / ${numSets} sets` : `${numSets} sets`}
      </span>
    </button>
  );
}
