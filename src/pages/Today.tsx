import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, ChevronRight, Sun, CalendarOff, Zap } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function getDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Convert Sunday=0 to 7
}

const DAY_LABELS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const dow = getDayOfWeek();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: activePhase } = useQuery({
    queryKey: ["active-phase", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phases")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: todayDay } = useQuery({
    queryKey: ["today-day", activePhase?.id, dow],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_days")
        .select("*, phase_day_exercises(*, exercises(*))")
        .eq("phase_id", activePhase!.id)
        .eq("day_of_week", dow)
        .maybeSingle();
      return data;
    },
    enabled: !!activePhase,
  });

  const { data: activeSession } = useQuery({
    queryKey: ["active-session", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch strength days from active phase for override picker
  const { data: strengthDays = [] } = useQuery({
    queryKey: ["strength-days", activePhase?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_days")
        .select("id, day_of_week, workout_name")
        .eq("phase_id", activePhase!.id)
        .eq("day_type", "strength")
        .order("day_of_week");
      return data ?? [];
    },
    enabled: !!activePhase,
  });

  const greetingHour = today.getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  const startWorkout = async () => {
    if (activeSession) {
      navigate(`/workout/${activeSession.id}`);
      return;
    }
    if (!activePhase || !todayDay) return;
    const { data } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user!.id,
        phase_id: activePhase.id,
        phase_day_id: todayDay.id,
        date: format(today, "yyyy-MM-dd"),
        scheduled_day_type: "strength",
        is_schedule_override: false,
      })
      .select()
      .single();
    if (data) navigate(`/workout/${data.id}`);
  };

  const startOverrideWorkout = async (phaseDayId: string) => {
    if (!activePhase || !todayDay) return;
    setSheetOpen(false);
    const { data } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user!.id,
        phase_id: activePhase.id,
        phase_day_id: phaseDayId,
        date: format(today, "yyyy-MM-dd"),
        scheduled_day_type: todayDay.day_type,
        is_schedule_override: true,
      })
      .select()
      .single();
    if (data) navigate(`/workout/${data.id}`);
  };

  const isStrengthDay = todayDay?.day_type === "strength";
  const exerciseCount = todayDay?.phase_day_exercises?.length ?? 0;

  return (
    <div className="mx-auto max-w-lg px-5 pt-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Sun className="h-4 w-4" />
          {format(today, "EEEE, MMMM d")}
        </div>
        <h1 className="text-2xl font-semibold">{greeting}</h1>
      </div>

      {activeSession && (
        <button
          onClick={() => navigate(`/workout/${activeSession.id}`)}
          className="mb-6 w-full rounded-2xl border border-primary/30 bg-accent p-4 text-left"
        >
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Workout in progress</p>
          <p className="text-sm font-medium text-foreground">Tap to continue your session →</p>
        </button>
      )}

      {!activePhase ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <Dumbbell className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-lg font-display font-semibold mb-2">No active phase</h2>
          <p className="text-sm text-muted-foreground mb-6">Create a training phase to get your weekly plan rolling.</p>
          <Button onClick={() => navigate("/phases/new")} className="rounded-2xl">
            Create your first phase
          </Button>
        </div>
      ) : !todayDay ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workout scheduled for today in your current phase.</p>
        </div>
      ) : todayDay.day_type === "rest" || todayDay.day_type === "cardio" ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <CalendarOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <h2 className="text-lg font-display font-semibold mb-2">
              {todayDay.day_type === "rest" ? "Rest day" : "Cardio day"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {todayDay.day_type === "rest"
                ? "Your plan says to rest today — you can still train if you want."
                : "Get moving however feels good today."}
            </p>
          </div>

          {!activeSession && (
            <div className="rounded-2xl border border-dashed border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Train anyway (optional)
              </p>
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                onClick={() => setSheetOpen(true)}
              >
                <Zap className="mr-2 h-4 w-4" />
                Choose a workout
              </Button>
            </div>
          )}

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Pick a workout</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 pb-6">
                {strengthDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No strength workouts found in this phase yet.
                  </p>
                ) : (
                  strengthDays.map((sd: any) => (
                    <button
                      key={sd.id}
                      onClick={() => startOverrideWorkout(sd.id)}
                      className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{sd.workout_name || "Strength"}</p>
                        <p className="text-xs text-muted-foreground">{DAY_LABELS[sd.day_of_week]}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider">{activePhase.name}</p>
                <h2 className="text-lg font-display font-semibold">{todayDay.workout_name || "Strength"}</h2>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                {exerciseCount} exercises
              </span>
            </div>

            <div className="space-y-2">
              {todayDay.phase_day_exercises
                ?.sort((a: any, b: any) => a.order_index - b.order_index)
                .map((pde: any) => (
                  <div key={pde.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                    <span className="font-medium">{pde.exercises?.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {pde.num_sets} × {pde.min_reps}{pde.max_reps !== pde.min_reps ? `–${pde.max_reps}` : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {isStrengthDay && !activeSession && (
            <Button onClick={startWorkout} className="w-full rounded-2xl py-6 text-base font-medium" size="lg">
              Start workout
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
