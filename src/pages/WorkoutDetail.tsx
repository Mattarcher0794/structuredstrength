import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function WorkoutDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

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

  if (!session) return null;

  const duration = session.completed_at && session.started_at
    ? differenceInMinutes(new Date(session.completed_at), new Date(session.started_at))
    : null;

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
      <p className="text-sm text-muted-foreground mb-2">
        {format(new Date(session.date), "EEEE, MMMM d, yyyy")}
        {duration !== null && ` · ${duration} min`}
      </p>

      {(session as any).is_schedule_override && (
        <p className="text-xs text-muted-foreground italic mb-6">
          Scheduled as {(session as any).scheduled_day_type === "rest" ? "Rest Day" : "Cardio Day"} — trained anyway
        </p>
      )}
      {!(session as any).is_schedule_override && <div className="mb-6" />}

      <div className="space-y-4">
        {Array.from(exerciseMap.entries()).map(([exId, { name, sets: exSets }]) => (
          <div key={exId} className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-medium mb-2">{name}</h3>
            <div className="space-y-1">
              {exSets.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Set {s.set_number}: {s.weight}kg × {s.reps}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
