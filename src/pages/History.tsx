import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock, Trophy } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { detectSessionPBs } from "@/lib/historyPBDetection";

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*, phase_days(workout_name), session_sets(id)")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pbSessionIds } = useQuery({
    queryKey: ["history-pbs", sessions.map((s: any) => s.id).join(",")],
    queryFn: () =>
      detectSessionPBs(
        sessions.map((s: any) => ({ id: s.id, started_at: s.started_at }))
      ),
    enabled: sessions.length > 0,
  });

  return (
    <div className="mx-auto max-w-lg px-5 pt-12">
      <h1 className="text-2xl font-semibold mb-6">History</h1>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <h2 className="text-lg font-display font-semibold mb-2">No workouts yet</h2>
          <p className="text-sm text-muted-foreground">Your completed workouts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s: any) => {
            const duration = s.completed_at && s.started_at
              ? differenceInMinutes(new Date(s.completed_at), new Date(s.started_at))
              : null;
            const hasPB = pbSessionIds?.has(s.id) ?? false;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/history/${s.id}`)}
                className="w-full rounded-2xl bg-card border border-border p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{s.phase_days?.workout_name || "Workout"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.date), "EEE, MMM d")}
                      {duration !== null && ` · ${duration} min`}
                      {` · ${s.session_sets?.length || 0} sets`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPB && <Trophy className="h-3.5 w-3.5" style={{ color: "#B8860B" }} />}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
