import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format, differenceInMinutes } from "date-fns";
import { detectSetPBs } from "@/lib/historyPBDetection";

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function WorkoutDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["workout-detail", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*, phase_days(workout_name)")
        .eq("id", sessionId!)
        .single();
      return data;
    },
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["workout-detail-sets", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_sets")
        .select("*")
        .eq("workout_session_id", sessionId!)
        .order("completed_at");
      return data ?? [];
    },
  });

  const { data: pbSetIds } = useQuery({
    queryKey: ["workout-detail-pbs", sessionId, sets.length],
    queryFn: () =>
      detectSetPBs(
        sessionId!,
        session!.started_at,
        sets.map((s: any) => ({ id: s.id, exercise_id: s.exercise_id, weight: s.weight }))
      ),
    enabled: !!session && sets.length > 0,
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error: setsError } = await supabase
        .from("session_sets")
        .delete()
        .eq("workout_session_id", sessionId!);
      if (setsError) throw setsError;

      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", sessionId!)
        .eq("user_id", user!.id);
      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completed-sessions"] });
      toast("Workout deleted");
      navigate("/history");
    },
    onError: () => {
      toast("Failed to delete workout");
    },
  });

  if (!session) return null;

  const duration = session.completed_at && session.started_at
    ? differenceInMinutes(new Date(session.completed_at), new Date(session.started_at))
    : null;

  const uniqueExercises = new Set(sets.map((s: any) => s.exercise_id)).size;
  const hasPBs = pbSetIds && pbSetIds.size > 0;

  // Group sets by exercise
  const exerciseMap = new Map<string, { name: string; sets: any[] }>();
  sets.forEach((s: any) => {
    if (!exerciseMap.has(s.exercise_id)) {
      exerciseMap.set(s.exercise_id, { name: s.exercise_name_snapshot, sets: [] });
    }
    exerciseMap.get(s.exercise_id)!.sets.push(s);
  });

  return (
    <div className="mx-auto max-w-lg px-5 pt-6 pb-24">
      <button onClick={() => navigate("/history")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> History
      </button>

      <h1 className="text-xl font-semibold">{session.phase_days?.workout_name || "Workout"}</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {format(new Date(session.date), "EEEE, MMMM d, yyyy")}
      </p>

      {(session as any).is_schedule_override && (
        <p className="text-xs text-muted-foreground italic mb-4">
          Scheduled as {(session as any).scheduled_day_type === "rest" ? "Rest Day" : "Cardio Day"} — trained anyway
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center rounded-2xl bg-card border border-border p-4 mb-3">
        <StatItem value={duration !== null ? String(duration) : "—"} label="mins" />
        <div className="w-px h-8 bg-border" />
        <StatItem value={String(sets.length)} label="sets" />
        <div className="w-px h-8 bg-border" />
        <StatItem value={String(uniqueExercises)} label="exercises" />
      </div>

      {/* PB callout */}
      {hasPBs && (
        <div className="flex items-center gap-2 mb-6 px-1">
          <Trophy className="h-3.5 w-3.5" style={{ color: "#B8860B" }} />
          <span className="text-xs" style={{ color: "#B8860B" }}>Personal bests in this session</span>
        </div>
      )}
      {!hasPBs && <div className="mb-6" />}

      <div className="space-y-4">
        {Array.from(exerciseMap.entries()).map(([exId, { name, sets: exSets }]) => (
          <div key={exId} className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-medium mb-2">{name}</h3>
            <div className="space-y-1">
              {exSets.map((s: any) => {
                const isPB = pbSetIds?.has(s.id) ?? false;
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isPB ? (
                      <Trophy className="h-3 w-3" style={{ color: "#B8860B" }} />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>Set {s.set_number}: {s.reps} × {s.weight}kg</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
