import { useState } from "react";
import { format, isToday } from "date-fns";
import { ArrowLeftRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWeekStartDate, getTodayDayOfWeek } from "@/lib/weekUtils";
import type { EffectiveDaySchedule } from "@/pages/Today";

/** Trace back through overrides to find the original phase-template day_of_week */
function resolveOriginalDow(
  effectiveDow: number,
  overrides: { original_day_of_week: number; overridden_day_of_week: number }[]
): number {
  const inbound = overrides.find(o => o.overridden_day_of_week === effectiveDow);
  if (inbound) return inbound.original_day_of_week;
  return effectiveDow;
}

/** Returns "today" if the date is today, otherwise the day name (e.g. "Monday") */
function getDayDisplayName(date?: Date, capitalize?: boolean): string {
  if (!date) return capitalize ? "Today" : "today";
  if (isToday(date)) return capitalize ? "Today" : "today";
  return format(date, "EEEE");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePhaseId: string;
  userId: string;
  todayWorkoutName: string;
  effectiveWeekSchedule: EffectiveDaySchedule[];
  completedDates: Set<string>;
  currentWeekOverrides?: { original_day_of_week: number; overridden_day_of_week: number }[];
  sourceDayOfWeek?: number; // when initiated from calendar strip instead of today
}

export function MoveWorkoutSheet({
  open,
  onOpenChange,
  activePhaseId,
  userId,
  todayWorkoutName,
  effectiveWeekSchedule,
  completedDates,
  currentWeekOverrides = [],
  sourceDayOfWeek,
}: Props) {
  const queryClient = useQueryClient();
  const sourceDow = sourceDayOfWeek ?? getTodayDayOfWeek();
  const sourceDay = effectiveWeekSchedule.find(d => d.dayOfWeek === sourceDow);
  const sourceWorkoutName = sourceDay?.workoutName ?? todayWorkoutName;
  const sourceDayTypeLabel = (sourceDay?.dayType ?? "strength").charAt(0).toUpperCase() + (sourceDay?.dayType ?? "strength").slice(1);
  const [confirmTarget, setConfirmTarget] = useState<EffectiveDaySchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const availableDays = (() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const isSunday = todayStart.getDay() === 0;

    // Determine the source day's week window (Mon–Sun)
    const sourceDayDate = sourceDay?.date ?? todayStart;
    const sourceWeekStartStr = getWeekStartDate(sourceDayDate);
    const sourceWeekStart = new Date(sourceWeekStartStr + "T00:00:00");
    const sourceWeekEnd = new Date(sourceWeekStart);
    sourceWeekEnd.setDate(sourceWeekStart.getDate() + 6);

    return effectiveWeekSchedule.filter((d) => {
      if (d.dayOfWeek === sourceDow) return false;
      // Only future days
      if (d.date <= todayStart) return false;
      const dateStr = format(d.date, "yyyy-MM-dd");
      if (completedDates.has(dateStr)) return false;
      // Must be within the same week as the source day
      if (d.date < sourceWeekStart || d.date > sourceWeekEnd) return false;
      // Exclude Sunday targets when today is Sunday
      if (isSunday && d.date.getDay() === 0) return false;
      return true;
    });
  })();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setSaving(true);

    try {
      const weekStart = getWeekStartDate();
      const targetDow = confirmTarget.dayOfWeek;

      const sourceIsActive = ["strength", "cardio"].includes(sourceDay?.dayType ?? "");
      const targetIsActive = ["strength", "cardio"].includes(confirmTarget.dayType);

      const rows: any[] = [];

      if (sourceIsActive && targetIsActive) {
        // Scenario A — Active ↔ Active swap: two rows
        const trueSourceDow = resolveOriginalDow(sourceDow, currentWeekOverrides);
        const trueTargetDow = resolveOriginalDow(targetDow, currentWeekOverrides);
        rows.push(
          {
            phase_id: activePhaseId,
            user_id: userId,
            week_start_date: weekStart,
            original_day_of_week: trueSourceDow,
            overridden_day_of_week: targetDow,
          },
          {
            phase_id: activePhaseId,
            user_id: userId,
            week_start_date: weekStart,
            original_day_of_week: trueTargetDow,
            overridden_day_of_week: sourceDow,
          }
        );
      } else {
        // Scenario B — Active → Rest: one row only
        const trueStrengthDow = resolveOriginalDow(sourceDow, currentWeekOverrides);
        rows.push({
          phase_id: activePhaseId,
          user_id: userId,
          week_start_date: weekStart,
          original_day_of_week: trueStrengthDow,
          overridden_day_of_week: targetDow,
        });
      }

      const { error } = await supabase
        .from("phase_day_overrides")
        .upsert(rows, {
          onConflict: "phase_id,user_id,week_start_date,original_day_of_week",
        });

      if (error) throw error;

      toast.success(`Workout moved to ${format(confirmTarget.date, "EEE d MMM")}`);

      // Re-fetch overrides to ensure next swap has correct state
      await queryClient.invalidateQueries({ queryKey: ["week-overrides"] });
      await queryClient.invalidateQueries({ queryKey: ["all-phase-days"] });

      setConfirmTarget(null);
      onOpenChange(false);
    } catch (e) {
      console.error("Move workout error:", e);
      toast.error("Failed to move workout");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) setConfirmTarget(null);
    onOpenChange(val);
  };

  const dayTypePill = (dayType: string) => {
    if (dayType === "strength")
      return (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
          Strength
        </span>
      );
    if (dayType === "cardio")
      return (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "rgba(168,212,224,0.2)", color: "#5a9bae" }}>
          Cardio
        </span>
      );
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Rest
      </span>
    );
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader className="text-left">
          <DrawerTitle>Move workout to…</DrawerTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a day to move {getDayDisplayName(sourceDay?.date)}'s {sourceWorkoutName || "workout"} to this week
          </p>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-2">
          {confirmTarget ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-medium">
                  Move {sourceWorkoutName || "workout"} to{" "}
                  {format(confirmTarget.date, "EEE d MMM")}?
                </p>
                <p className="text-muted-foreground text-xs">
                  {["strength", "cardio"].includes(confirmTarget.dayType)
                    ? `${confirmTarget.workoutName || (confirmTarget.dayType === "cardio" ? "Cardio" : "Strength")} will move to ${getDayDisplayName(sourceDay?.date)} instead.`
                    : `${getDayDisplayName(sourceDay?.date, true)} will become a rest day.`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl"
                  onClick={() => setConfirmTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-2xl"
                  onClick={handleConfirm}
                  disabled={saving}
                >
                  {saving ? "Moving…" : "Confirm"}
                </Button>
              </div>
            </div>
          ) : availableDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No available days to swap with this week.
            </p>
          ) : (
            availableDays.map((day) => (
              <button
                key={day.dayOfWeek}
                onClick={() => setConfirmTarget(day)}
                className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-left hover:bg-muted transition-colors min-h-[44px]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {format(day.date, "EEE d MMM")}
                    </p>
                    {dayTypePill(day.dayType)}
                    {day.isOverridden && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        Rescheduled
                      </span>
                    )}
                  </div>
                  {(day.dayType === "strength" || day.dayType === "cardio") && day.workoutName && (
                    <p className="text-xs text-muted-foreground">{day.workoutName}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
