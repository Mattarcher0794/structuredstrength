import { useState } from "react";
import { format } from "date-fns";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePhaseId: string;
  userId: string;
  todayWorkoutName: string;
  effectiveWeekSchedule: EffectiveDaySchedule[];
  completedDates: Set<string>;
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
  sourceDayOfWeek,
}: Props) {
  const queryClient = useQueryClient();
  const sourceDow = sourceDayOfWeek ?? getTodayDayOfWeek();
  const sourceDay = effectiveWeekSchedule.find(d => d.dayOfWeek === sourceDow);
  const sourceWorkoutName = sourceDay?.workoutName ?? todayWorkoutName;
  const [confirmTarget, setConfirmTarget] = useState<EffectiveDaySchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const availableDays = effectiveWeekSchedule.filter((d) => {
    if (d.dayOfWeek === sourceDow) return false;
    // Only future days
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (d.date <= todayStart) return false;
    const dateStr = format(d.date, "yyyy-MM-dd");
    if (completedDates.has(dateStr)) return false;
    return true;
  });

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setSaving(true);

    try {
      const weekStart = getWeekStartDate();
      const targetDow = confirmTarget.dayOfWeek;
      const isStrengthSwap = confirmTarget.dayType === "strength";

      const rows: any[] = [
        {
          phase_id: activePhaseId,
          user_id: userId,
          week_start_date: weekStart,
          original_day_of_week: todayDow,
          overridden_day_of_week: targetDow,
        },
      ];

      if (isStrengthSwap) {
        rows.push({
          phase_id: activePhaseId,
          user_id: userId,
          week_start_date: weekStart,
          original_day_of_week: targetDow,
          overridden_day_of_week: todayDow,
        });
      }

      const { error } = await supabase
        .from("phase_day_overrides")
        .upsert(rows, {
          onConflict: "phase_id,user_id,week_start_date,original_day_of_week",
        });

      if (error) throw error;

      toast.success(`Workout moved to ${format(confirmTarget.date, "EEE d MMM")}`);

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
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
            Pick a day to move today's {todayWorkoutName || "workout"} to this week
          </p>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-2">
          {confirmTarget ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-medium">
                  Move {todayWorkoutName || "workout"} to{" "}
                  {format(confirmTarget.date, "EEE d MMM")}?
                </p>
                <p className="text-muted-foreground text-xs">
                  {confirmTarget.dayType === "strength"
                    ? `${confirmTarget.workoutName || "Strength"} will move to today instead.`
                    : "Today will become a rest day."}
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
                  {day.dayType === "strength" && day.workoutName && (
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
