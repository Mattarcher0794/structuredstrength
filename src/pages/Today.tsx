import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, ChevronRight, ChevronDown, Sun, Zap, CalendarHeart, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useState, useRef, useCallback } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { NutritionCard } from "@/components/NutritionCard";
import { FEATURES } from "@/config/features";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle } from
"@/components/ui/sheet";

function getDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

const DAY_LABELS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();
  const dow = getDayOfWeek();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exercisesOpen, setExercisesOpen] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!pulling.current) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    pulling.current = false;
    if (diff > 80) {
      setIsRefreshing(true);
      const todayStr = format(new Date(), "yyyy-MM-dd");
      await queryClient.invalidateQueries({ queryKey: ["active-phase"] });
      await queryClient.invalidateQueries({ queryKey: ["today-day"] });
      await queryClient.invalidateQueries({ queryKey: ["active-session"] });
      await queryClient.invalidateQueries({ queryKey: ["strength-days"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly-completed"] });
      await queryClient.invalidateQueries({ queryKey: ["nutrition-today"] });
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const { data: activePhase } = useQuery({
    queryKey: ["active-phase", user?.id],
    queryFn: async () => {
      const { data } = await supabase.
      from("phases").
      select("*").
      eq("user_id", user!.id).
      eq("status", "active").
      maybeSingle();
      return data;
    },
    enabled: !!user
  });

  const { data: todayDay } = useQuery({
    queryKey: ["today-day", activePhase?.id, dow],
    queryFn: async () => {
      const { data } = await supabase.
      from("phase_days").
      select("*, phase_day_exercises(*, exercises(*))").
      eq("phase_id", activePhase!.id).
      eq("day_of_week", dow).
      maybeSingle();
      return data;
    },
    enabled: !!activePhase
  });

  const { data: activeSession } = useQuery({
    queryKey: ["active-session", user?.id],
    queryFn: async () => {
      const { data } = await supabase.
      from("workout_sessions").
      select("*").
      eq("user_id", user!.id).
      eq("status", "in_progress").
      maybeSingle();
      return data;
    },
    enabled: !!user
  });

  // Fetch strength days from active phase for override picker
  const { data: strengthDays = [] } = useQuery({
    queryKey: ["strength-days", activePhase?.id],
    queryFn: async () => {
      const { data } = await supabase.
      from("phase_days").
      select("id, day_of_week, workout_name").
      eq("phase_id", activePhase!.id).
      eq("day_type", "strength").
      order("day_of_week");
      return data ?? [];
    },
    enabled: !!activePhase
  });

  // Weekly progress: completed sessions this calendar week
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: weeklyCompletedCount = 0 } = useQuery({
    queryKey: ["weekly-completed", user?.id, activePhase?.id, weekStart],
    queryFn: async () => {
      const { count } = await supabase.
      from("workout_sessions").
      select("id", { count: "exact", head: true }).
      eq("user_id", user!.id).
      eq("phase_id", activePhase!.id).
      eq("status", "completed").
      gte("date", weekStart).
      lte("date", weekEnd);
      return count ?? 0;
    },
    enabled: !!user && !!activePhase
  });

  // Check if today's workout is already completed
  const todayStr = format(today, "yyyy-MM-dd");
  const { data: completedToday } = useQuery({
    queryKey: ["completed-today", user?.id, activePhase?.id, todayDay?.id, todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("phase_day_id", todayDay!.id)
        .eq("status", "completed")
        .eq("date", todayStr)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!activePhase && !!todayDay
  });

  const isCompletedToday = !!completedToday;

  const plannedStrengthCount = strengthDays.length;
  const remainingCount = Math.max(plannedStrengthCount - weeklyCompletedCount, 0);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const greetingHour = today.getHours();
  const timeGreeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || null;
  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

  const startWorkout = async () => {
    if (activeSession) {
      navigate(`/workout/${activeSession.id}`);
      return;
    }
    if (!activePhase || !todayDay) return;
    const { data } = await supabase.
    from("workout_sessions").
    insert({
      user_id: user!.id,
      phase_id: activePhase.id,
      phase_day_id: todayDay.id,
      date: format(today, "yyyy-MM-dd"),
      scheduled_day_type: "strength",
      is_schedule_override: false
    }).
    select().
    single();
    if (data) navigate(`/workout/${data.id}`);
  };

  const startOverrideWorkout = async (phaseDayId: string) => {
    if (!activePhase || !todayDay) return;
    setSheetOpen(false);
    const { data } = await supabase.
    from("workout_sessions").
    insert({
      user_id: user!.id,
      phase_id: activePhase.id,
      phase_day_id: phaseDayId,
      date: format(today, "yyyy-MM-dd"),
      scheduled_day_type: todayDay.day_type,
      is_schedule_override: true
    }).
    select().
    single();
    if (data) navigate(`/workout/${data.id}`);
  };

  const isStrengthDay = todayDay?.day_type === "strength";
  const exerciseCount = todayDay?.phase_day_exercises?.length ?? 0;

  // Phase week progress
  const currentWeek = activePhase?.start_date
    ? Math.min(
        Math.floor((today.getTime() - new Date(activePhase.start_date + "T00:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
        activePhase.length_weeks
      )
    : null;

  const WeekProgressBar = () => {
    if (!activePhase?.start_date || currentWeek === null) return null;
    return (
      <div className="mt-1.5 mb-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          Week {currentWeek} of {activePhase.length_weeks}
        </p>
        <div className="flex gap-[3px]">
          {Array.from({ length: activePhase.length_weeks }, (_, i) => {
            const week = i + 1;
            return (
              <div
                key={week}
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    week < currentWeek
                      ? "hsl(var(--primary))"
                      : week === currentWeek
                      ? "hsl(var(--primary) / 0.5)"
                      : "hsl(var(--muted))",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="mx-auto max-w-lg px-5 pt-12"
    >
      {/* Pull-to-refresh spinner */}
      {isRefreshing && (
        <div className="flex justify-center pb-4 -mt-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Sun className="h-4 w-4" />
          {format(today, "EEEE, MMMM d")}
        </div>
        <h1 className="text-2xl font-semibold">{greeting}</h1>
      </div>

      {/* Nutrition card — below greeting, above workout */}
      {FEATURES.showNutrition && <NutritionCard />}

      {activeSession &&
      <button
        onClick={() => navigate(`/workout/${activeSession.id}`)}
        className="mb-6 w-full rounded-2xl border border-primary/30 bg-accent p-4 text-left">

          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Workout in progress</p>
          <p className="text-sm font-medium text-foreground">Tap to continue your session →</p>
        </button>
      }
      {activePhase &&
      <div className="mb-6 rounded-2xl bg-card border border-border p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">This week</p>
          <p className="text-sm font-medium">
            {weeklyCompletedCount <= plannedStrengthCount ?
          `${weeklyCompletedCount} of ${plannedStrengthCount} sessions complete` :
          `${weeklyCompletedCount} sessions complete`}
          </p>
          {plannedStrengthCount > 0 &&
        <Progress
          value={Math.min(weeklyCompletedCount / plannedStrengthCount * 100, 100)}
          className="mt-3 h-[7px] rounded-full bg-muted [&>div]:bg-rose-300/70 [&>div]:rounded-full" />

        }
          <p className="mt-2 text-xs text-muted-foreground">
            {weeklyCompletedCount < plannedStrengthCount ?
          `${remainingCount} sessions left this week` :
          weeklyCompletedCount === plannedStrengthCount ?
          "You've completed all planned sessions this week" :
          "You've gone beyond your plan this week"}
          </p>
        </div>
      }

      {!activePhase ?
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <Dumbbell className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-lg font-display font-semibold mb-2">No active phase</h2>
          <p className="text-sm text-muted-foreground mb-6">Create a training phase to get your weekly plan rolling.</p>
          <Button onClick={() => navigate("/phases/new")} className="rounded-2xl">
            Create your first phase
          </Button>
        </div> :
      !todayDay ?
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <CalendarHeart className="text-sm text-muted-foreground">No workout scheduled for today in your current phase.</CalendarHeart>
        </div> :
      todayDay.day_type === "rest" || todayDay.day_type === "cardio" ?
      <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">{activePhase.name}</p>
            <WeekProgressBar />
            <CalendarHeart className="mx-auto mb-3 mt-4 h-8 w-8 text-muted-foreground/40" />
            <h2 className="text-lg font-display font-semibold mb-2">
              {todayDay.day_type === "rest" ? "Rest day" : "Cardio day"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {todayDay.day_type === "rest" ?
            "Rest is part of the plan — you can still train if you want." :
            "Get moving however feels good today."}
            </p>
          </div>

          {!activeSession &&
        <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Train anyway (optional)
              </p>
              <Button
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => setSheetOpen(true)}>

                <Zap className="mr-2 h-4 w-4" />
                Choose a workout
              </Button>
            </div>
        }

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Pick a workout</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 pb-6">
                {strengthDays.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-4">
                    No strength workouts found in this phase yet.
                  </p> :

              strengthDays.map((sd: any) =>
              <button
                key={sd.id}
                onClick={() => startOverrideWorkout(sd.id)}
                className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-left hover:bg-muted transition-colors">

                      <div>
                        <p className="text-sm font-medium">{sd.workout_name || "Strength"}</p>
                        <p className="text-xs text-muted-foreground">{DAY_LABELS[sd.day_of_week]}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
              )
              }
              </div>
            </SheetContent>
          </Sheet>
        </div> :

      <div className="space-y-4">
          {isCompletedToday ? (
            <div className="rounded-2xl bg-card/70 border border-border/50 p-5">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider">{activePhase.name}</p>
                <WeekProgressBar />
              </div>
              <div className="flex items-center justify-between min-h-[44px] py-2">
                <h2 className="text-lg font-display text-muted-foreground">{todayDay.workout_name || "Strength"}</h2>
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "hsl(152 81% 91%)", color: "hsl(166 72% 20%)" }}>
                  Done
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Completed today</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-card border border-border p-5">
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">{activePhase.name}</p>
                  <WeekProgressBar />
                </div>

                <div>
                  <button
                    onClick={() => setExercisesOpen(o => !o)}
                    className="flex items-center justify-between w-full min-h-[44px] py-2 text-left"
                  >
                    <h2 className="text-lg font-display font-semibold">{todayDay.workout_name || "Strength"}</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                        {exerciseCount} exercises
                      </span>
                      <ChevronDown
                        className="h-4 w-4 text-muted-foreground"
                        style={{
                          transform: exercisesOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 250ms ease-in-out",
                        }}
                      />
                    </div>
                  </button>
                  <div
                    style={{
                      maxHeight: exercisesOpen ? "500px" : "0px",
                      opacity: exercisesOpen ? 1 : 0,
                      overflow: "hidden",
                      transition: exercisesOpen
                        ? "max-height 250ms ease-in-out, opacity 200ms ease-in-out 50ms"
                        : "max-height 250ms ease-in-out, opacity 200ms ease-in-out",
                    }}
                  >
                    <div className="space-y-2 pt-1">
                      {todayDay.phase_day_exercises?.
                    sort((a: any, b: any) => a.order_index - b.order_index).
                    map((pde: any) =>
                    <div key={pde.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                            <span className="font-medium">{pde.exercises?.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {pde.num_sets} × {pde.min_reps}{pde.max_reps !== pde.min_reps ? `–${pde.max_reps}` : ""}
                            </span>
                          </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>

              {isStrengthDay && !activeSession &&
            <Button onClick={startWorkout} className="w-full rounded-2xl py-6 text-base font-medium" size="lg">
                  Start workout
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            }
            </>
          )}
        </div>
      }
    </div>);

}
