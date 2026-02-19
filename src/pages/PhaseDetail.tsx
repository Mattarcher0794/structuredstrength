import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ConfirmBottomSheet from "@/components/ConfirmBottomSheet";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayTypes = ["rest", "cardio", "strength"] as const;
const typeStyles: Record<string, string> = {
  rest: "bg-muted text-muted-foreground",
  cardio: "bg-accent text-accent-foreground",
  strength: "bg-primary/15 text-primary",
};

export default function PhaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const { data: phase } = useQuery({
    queryKey: ["phase", id],
    queryFn: async () => {
      const { data } = await supabase.from("phases").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: days = [] } = useQuery({
    queryKey: ["phase-days", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_days")
        .select("*, phase_day_exercises(id)")
        .eq("phase_id", id!)
        .order("day_of_week");
      return data ?? [];
    },
    enabled: !!id,
  });

  const toggleDayType = useMutation({
    mutationFn: async ({ dayId, currentType }: { dayId: string; currentType: string }) => {
      const idx = dayTypes.indexOf(currentType as any);
      const next = dayTypes[(idx + 1) % dayTypes.length];
      await supabase.from("phase_days").update({ day_type: next }).eq("id", dayId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase-days", id] }),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("phases").update({ status: "completed" }).eq("user_id", user!.id).eq("status", "active");
      await supabase.from("phases").update({ status: "active", start_date: new Date().toISOString().split("T")[0] }).eq("id", id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["active-phase"] });
      queryClient.invalidateQueries({ queryKey: ["phase", id] });
      toast({ title: "Phase activated!" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      // Get phase_days
      const { data: phaseDays } = await supabase.from("phase_days").select("id").eq("phase_id", id!);
      const dayIds = (phaseDays ?? []).map((d: any) => d.id);

      // Get workout_sessions
      const { data: sessions } = await supabase.from("workout_sessions").select("id").eq("phase_id", id!);
      const sessionIds = (sessions ?? []).map((s: any) => s.id);

      // Delete session_exercise_swaps & session_sets for those sessions
      if (sessionIds.length > 0) {
        await supabase.from("session_exercise_swaps").delete().in("workout_session_id", sessionIds);
        await supabase.from("session_sets").delete().in("workout_session_id", sessionIds);
      }

      // Delete workout_sessions
      if (sessionIds.length > 0) {
        await supabase.from("workout_sessions").delete().in("id", sessionIds);
      }

      // Delete phase_day_exercises
      if (dayIds.length > 0) {
        await supabase.from("phase_day_exercises").delete().in("phase_day_id", dayIds);
      }

      // Delete phase_days
      if (dayIds.length > 0) {
        await supabase.from("phase_days").delete().in("id", dayIds);
      }

      // Delete the phase
      const { error } = await supabase.from("phases").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["active-phase"] });
      queryClient.invalidateQueries({ queryKey: ["phase", id] });
      queryClient.invalidateQueries({ queryKey: ["phase-days", id] });
      toast({ title: "Phase removed" });
      navigate("/phases");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't remove phase", description: err?.message || "Something went wrong", variant: "destructive" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      // Create new phase
      const { data: newPhase, error: phaseErr } = await supabase
        .from("phases")
        .insert({ user_id: user!.id, name: `${phase!.name} (v2)`, length_weeks: phase!.length_weeks, status: "draft" })
        .select("id")
        .single();
      if (phaseErr || !newPhase) throw phaseErr || new Error("Failed to create phase");

      // Copy phase_days
      const { data: origDays } = await supabase.from("phase_days").select("*").eq("phase_id", id!).order("day_of_week");
      if (origDays && origDays.length > 0) {
        const newDaysInsert = origDays.map((d: any) => ({
          phase_id: newPhase.id,
          day_of_week: d.day_of_week,
          day_type: d.day_type,
          workout_name: d.workout_name,
        }));
        const { data: newDays, error: daysErr } = await supabase.from("phase_days").insert(newDaysInsert).select("id, day_of_week");
        if (daysErr) throw daysErr;

        // Map original day_of_week → new day id
        const dayMap = new Map<number, string>();
        (newDays ?? []).forEach((nd: any) => dayMap.set(nd.day_of_week, nd.id));

        // Copy exercises for each day
        const origDayIds = origDays.map((d: any) => d.id);
        const { data: origExercises } = await supabase.from("phase_day_exercises").select("*").in("phase_day_id", origDayIds);
        if (origExercises && origExercises.length > 0) {
          // Need to map original phase_day_id → day_of_week
          const origDayIdToWeek = new Map<string, number>();
          origDays.forEach((d: any) => origDayIdToWeek.set(d.id, d.day_of_week));

          const exInsert = origExercises.map((ex: any) => ({
            phase_day_id: dayMap.get(origDayIdToWeek.get(ex.phase_day_id)!)!,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            num_sets: ex.num_sets,
            min_reps: ex.min_reps,
            max_reps: ex.max_reps,
            notes: ex.notes,
            rest_seconds: ex.rest_seconds,
          }));
          const { error: exErr } = await supabase.from("phase_day_exercises").insert(exInsert);
          if (exErr) throw exErr;
        }
      }
      return newPhase.id;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      toast({ title: 'Phase copied to draft (v2)' });
      navigate(`/phases/${newId}`);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't copy phase", description: err?.message, variant: "destructive" });
    },
  });

  if (!phase) return null;

  const isActive = phase.status === "active";

  return (
    <div className="mx-auto max-w-lg px-5 pt-6">
      <button onClick={() => navigate("/phases")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Phases
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">{phase.name}</h1>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", typeStyles[phase.status] || "bg-muted text-muted-foreground")}>
          {phase.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{phase.length_weeks} weeks · Tap a day to cycle its type</p>

      <div className="space-y-2 mb-6">
        {days.map((day: any, i: number) => (
          <div key={day.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3">
            <span className="w-10 text-xs font-medium text-muted-foreground">{dayNames[i]}</span>
            <button
              onClick={() => toggleDayType.mutate({ dayId: day.id, currentType: day.day_type })}
              className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors", typeStyles[day.day_type])}
            >
              {day.day_type}
            </button>
            <div className="flex-1" />
            {day.day_type === "strength" && (
              <button
                onClick={() => navigate(`/phases/${id}/day/${day.id}`)}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                {day.phase_day_exercises?.length || 0} exercises
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {phase.status === "draft" && (
        <Button onClick={() => activateMutation.mutate()} className="w-full rounded-2xl py-5" disabled={activateMutation.isPending}>
          Activate phase
        </Button>
      )}

      {phase.status === "completed" && (
        <Button
          onClick={() => copyMutation.mutate()}
          className="w-full rounded-2xl py-5 gap-2"
          variant="outline"
          disabled={copyMutation.isPending}
        >
          {copyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          Copy as new draft (v2)
        </Button>
      )}

      <div className="mt-10 pt-6">
        <Button
          variant="destructive"
          className="w-full rounded-2xl py-5"
          disabled={isActive || removeMutation.isPending}
          onClick={() => {
            if (isActive) {
              toast({ title: "Active phases can't be removed. Activate another phase first." });
              return;
            }
            setShowRemoveDialog(true);
          }}
        >
          {removeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Remove phase
        </Button>
      </div>

      <ConfirmBottomSheet
        open={showRemoveDialog}
        title="Remove phase?"
        description="This will permanently remove this phase and its workouts. This can't be undone."
        confirmLabel="Remove phase"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => removeMutation.mutate()}
        onCancel={() => setShowRemoveDialog(false)}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
