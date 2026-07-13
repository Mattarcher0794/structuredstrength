import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { X, Hand, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getWeekStartDate } from "@/lib/weekUtils";
import {
  resolveWeekSchedule,
  planMove,
  diffAssignments,
  canPickUp,
  canDrop,
  type WeekAssignment,
} from "@/lib/weekSchedule";
import { WeekDayCard, type WeekDayCardState } from "@/components/WeekDayCard";
import ConfirmBottomSheet from "@/components/ConfirmBottomSheet";

// week_day_assignments isn't in the generated Supabase types until the migration
// is applied and types are regenerated. Cast narrowly until then.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export default function WeekEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const weekStart = getWeekStartDate();
  const mondayDate = useMemo(() => new Date(weekStart + "T00:00:00"), [weekStart]);
  const sundayDate = useMemo(() => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + 6);
    return d;
  }, [mondayDate]);
  const weekEnd = format(sundayDate, "yyyy-MM-dd");

  const [pickedDow, setPickedDow] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const { data: phaseDays = [] } = useQuery({
    queryKey: ["all-phase-days", activePhase?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_days")
        .select("*, phase_day_exercises(*, exercises(*))")
        .eq("phase_id", activePhase!.id)
        .order("day_of_week");
      return data ?? [];
    },
    enabled: !!activePhase,
  });

  const { data: assignments = [] } = useQuery<WeekAssignment[]>({
    queryKey: ["week-assignments", user?.id, activePhase?.id, weekStart],
    queryFn: async () => {
      const { data } = await sb
        .from("week_day_assignments")
        .select("day_of_week, source_day_of_week")
        .eq("user_id", user!.id)
        .eq("phase_id", activePhase!.id)
        .eq("week_start_date", weekStart);
      return data ?? [];
    },
    enabled: !!user && !!activePhase,
  });

  const { data: completedDates = new Set<string>() } = useQuery({
    queryKey: ["week-completed-dates", user?.id, activePhase?.id, weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("date")
        .eq("user_id", user!.id)
        .eq("phase_id", activePhase!.id)
        .eq("status", "completed")
        .gte("date", weekStart)
        .lte("date", weekEnd);
      return new Set((data ?? []).map((d) => d.date as string));
    },
    enabled: !!user && !!activePhase,
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

  const inProgressDates = useMemo(
    () => new Set(activeSession?.date ? [activeSession.date as string] : []),
    [activeSession],
  );
  const flags = useMemo(() => ({ completedDates, inProgressDates }), [completedDates, inProgressDates]);

  const schedule = useMemo(
    () =>
      activePhase && phaseDays.length
        ? resolveWeekSchedule(weekStart, phaseDays, assignments, today)
        : [],
    [activePhase, phaseDays, assignments, weekStart, today],
  );

  const pickedDay = pickedDow == null ? null : schedule.find((d) => d.dayOfWeek === pickedDow) ?? null;
  const hasOverrides = schedule.some((d) => d.isOverridden);
  const hasAnyActive = schedule.some((d) => d.dayType !== "rest");

  const stateFor = (day: (typeof schedule)[number]): WeekDayCardState => {
    const dstr = format(day.date, "yyyy-MM-dd");
    const isCompleted = completedDates.has(dstr);
    const isInProgress = inProgressDates.has(dstr);

    if (pickedDow == null) {
      if (isCompleted || isInProgress) return "locked";
      return canPickUp(day, flags) ? "source" : "rest";
    }
    if (day.dayOfWeek === pickedDow) return "picked";
    if (isCompleted || isInProgress) return "locked";
    if (pickedDay && canDrop(pickedDay, day, flags, today))
      return day.dayType === "rest" ? "target-move" : "target-swap";
    return "disabled";
  };

  const handleTap = (day: (typeof schedule)[number]) => {
    if (saving) return;
    if (pickedDow == null) {
      if (canPickUp(day, flags)) setPickedDow(day.dayOfWeek);
      return;
    }
    if (day.dayOfWeek === pickedDow) {
      setPickedDow(null);
      return;
    }
    if (pickedDay && canDrop(pickedDay, day, flags, today)) void place(pickedDay, day);
  };

  async function place(source: (typeof schedule)[number], target: (typeof schedule)[number]) {
    if (!user || !activePhase) return;
    setSaving(true);
    const wasRest = target.dayType === "rest";
    const sourceName = source.workoutName ?? "Workout";
    const targetName = target.workoutName ?? "workout";
    const targetLabel = format(target.date, "EEE d MMM");
    try {
      const { upserts, deleteDows } = diffAssignments(planMove(source.dayOfWeek, target.dayOfWeek, schedule));

      if (deleteDows.length) {
        const { error } = await sb
          .from("week_day_assignments")
          .delete()
          .eq("user_id", user.id)
          .eq("phase_id", activePhase.id)
          .eq("week_start_date", weekStart)
          .in("day_of_week", deleteDows);
        if (error) throw error;
      }
      if (upserts.length) {
        const rows = upserts.map((r) => ({
          ...r,
          user_id: user.id,
          phase_id: activePhase.id,
          week_start_date: weekStart,
        }));
        const { error } = await sb
          .from("week_day_assignments")
          .upsert(rows, { onConflict: "user_id,phase_id,week_start_date,day_of_week" });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["week-assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["week-overrides"] });
      setPickedDow(null);
      toast.success(wasRest ? `${sourceName} moved to ${targetLabel}` : `Swapped ${sourceName} and ${targetName}`);
    } catch (e) {
      console.error("Week editor move failed:", e);
      toast.error("Couldn't move the workout");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!user || !activePhase) return;
    setSaving(true);
    try {
      const { error } = await sb
        .from("week_day_assignments")
        .delete()
        .eq("user_id", user.id)
        .eq("phase_id", activePhase.id)
        .eq("week_start_date", weekStart);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["week-assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["week-overrides"] });
      setPickedDow(null);
      setResetOpen(false);
      toast.success("Week reset to your plan");
    } catch (e) {
      console.error("Week reset failed:", e);
      toast.error("Couldn't reset the week");
    } finally {
      setSaving(false);
    }
  }

  const rangeLabel = `${format(mondayDate, "d")}–${format(sundayDate, "d MMM")}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-5 pb-3 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">This week</h1>
          <button
            type="button"
            aria-label="Close"
            onClick={() => navigate("/")}
            className="rounded-full p-1 text-muted-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{rangeLabel} · changes apply to this week only</p>
          {hasOverrides && (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-xs font-medium text-primary underline underline-offset-2"
            >
              Reset week to plan
            </button>
          )}
        </div>
      </header>

      {pickedDay && (
        <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5">
          <Hand className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-[13px] text-primary">
            Moving <span className="font-semibold">{pickedDay.workoutName ?? "workout"}</span> — tap a day to place it
          </span>
          <button
            type="button"
            onClick={() => setPickedDow(null)}
            className="text-[13px] font-semibold text-primary underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-10">
        {!activePhase ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No active phase to rearrange.</p>
        ) : !hasAnyActive ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarOff className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Nothing to rearrange — this week is all rest.</p>
          </div>
        ) : (
          schedule.map((day) => (
            <WeekDayCard
              key={day.dayOfWeek}
              day={day}
              state={stateFor(day)}
              completed={completedDates.has(format(day.date, "yyyy-MM-dd"))}
              inProgress={inProgressDates.has(format(day.date, "yyyy-MM-dd"))}
              onTap={() => handleTap(day)}
            />
          ))
        )}
      </div>

      <ConfirmBottomSheet
        open={resetOpen}
        title="Reset this week?"
        description="Your rearrangements will be cleared and this week returns to your plan."
        confirmLabel="Reset"
        cancelLabel="Keep changes"
        variant="destructive"
        isLoading={saving}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
