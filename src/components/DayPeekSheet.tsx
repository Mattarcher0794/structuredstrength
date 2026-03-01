import { format } from "date-fns";
import { Check, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { EffectiveDaySchedule } from "@/pages/Today";

const DAY_LABELS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: EffectiveDaySchedule | null;
  isCompleted: boolean;
  isPast: boolean;
  onMoveWorkout: (day: EffectiveDaySchedule) => void;
}

export function DayPeekSheet({
  open,
  onOpenChange,
  day,
  isCompleted,
  isPast,
  onMoveWorkout,
}: Props) {
  if (!day) return null;

  const exerciseCount = day.phaseDay?.phase_day_exercises?.length ?? 0;
  const isFutureUncompleted = !day.isToday && !isPast && !isCompleted;

  const dayTypePill = () => {
    if (day.dayType === "strength")
      return (
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          Strength
        </span>
      );
    if (day.dayType === "cardio")
      return (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          Cardio
        </span>
      );
    return (
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        Rest
      </span>
    );
  };

  // Find original day name if overridden
  const overrideNote = day.isOverridden && day.phaseDay?.day_of_week
    ? `Rescheduled from ${DAY_LABELS[day.phaseDay.day_of_week]}`
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader className="text-left">
          <DrawerTitle>{format(day.date, "EEEE, d MMMM")}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {dayTypePill()}
              {isCompleted && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Check className="h-3 w-3" />
                  Completed
                </span>
              )}
              {isPast && !isCompleted && !day.isToday && day.dayType === "strength" && (
                <span className="text-xs text-muted-foreground">Missed</span>
              )}
            </div>

            {day.dayType === "strength" && day.workoutName && (
              <p className="text-lg font-display font-semibold">{day.workoutName}</p>
            )}

            {day.dayType === "strength" && exerciseCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
              </p>
            )}

            {overrideNote && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {overrideNote}
              </p>
            )}
          </div>

          {/* Actions for future uncompleted days */}
          {isFutureUncompleted && day.dayType === "strength" && (
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => {
                const capturedDay = day;
                onOpenChange(false);
                setTimeout(() => onMoveWorkout(capturedDay), 50);
              }}
            >
              Move this workout
            </Button>
          )}

        </div>
      </DrawerContent>
    </Drawer>
  );
}
