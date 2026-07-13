import { format } from "date-fns";
import { Check, GripVertical, ArrowDownLeft, ArrowLeftRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EffectiveDay } from "@/lib/weekSchedule";

export type WeekDayCardState =
  | "source"
  | "rest"
  | "picked"
  | "target-move"
  | "target-swap"
  | "locked"
  | "disabled";

const DAY_ABBR = ["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface Props {
  day: EffectiveDay;
  state: WeekDayCardState;
  completed?: boolean;
  inProgress?: boolean;
  onTap?: () => void;
}

function TypePill({ dayType }: { dayType: string }) {
  if (dayType === "strength")
    return (
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
        Strength
      </span>
    );
  if (dayType === "cardio")
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: "var(--cardio-soft)", color: "var(--cardio-foreground)" }}
      >
        Cardio
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Rest
    </span>
  );
}

function RightChip({ state, completed, inProgress }: { state: WeekDayCardState; completed?: boolean; inProgress?: boolean }) {
  if (state === "picked")
    return (
      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
        MOVING
      </span>
    );
  if (state === "target-move")
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
        <ArrowDownLeft className="h-3.5 w-3.5" /> Move here
      </span>
    );
  if (state === "target-swap")
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
        <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
      </span>
    );
  if (state === "locked" && completed)
    return <Check className="h-5 w-5 text-primary" />;
  if (state === "locked" && inProgress)
    return <span className="text-[10px] font-medium text-muted-foreground">In progress</span>;
  if (state === "locked")
    return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (state === "source")
    return <GripVertical className="h-4 w-4 text-muted-foreground/60" />;
  return null;
}

export function WeekDayCard({ day, state, completed, inProgress, onTap }: Props) {
  const tappable = state === "source" || state === "picked" || state === "target-move" || state === "target-swap";
  const exerciseCount = day.phaseDay?.phase_day_exercises?.length ?? 0;
  const isActive = day.dayType === "strength" || day.dayType === "cardio";

  return (
    <button
      type="button"
      onClick={tappable ? onTap : undefined}
      disabled={!tappable}
      aria-label={`${format(day.date, "EEEE d MMMM")}, ${day.workoutName ?? "rest"}`}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-all min-h-[56px]",
        state === "picked" && "border-2 border-primary shadow-md",
        (state === "target-move" || state === "target-swap") && "border-[1.5px] border-dashed border-primary",
        state === "source" && "border-border",
        state === "rest" && "border-border opacity-60",
        state === "locked" && "border-border opacity-50",
        state === "disabled" && "border-border opacity-40",
        tappable && "active:scale-[0.99]",
      )}
    >
      <div className="w-9 shrink-0">
        <div className={cn("text-[11px] font-medium", day.isToday ? "text-primary" : "text-muted-foreground")}>
          {DAY_ABBR[day.dayOfWeek]}
        </div>
        <div className="text-[15px] font-semibold">{format(day.date, "d")}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isActive && day.workoutName ? (
            <span className="truncate text-sm font-medium">{day.workoutName}</span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Rest</span>
          )}
          {isActive && <TypePill dayType={day.dayType} />}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {day.isToday && "Today"}
          {day.isToday && isActive && exerciseCount > 0 && " · "}
          {isActive && exerciseCount > 0 && `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`}
          {completed && !day.isToday && "Completed"}
        </div>
      </div>

      <RightChip state={state} completed={completed} inProgress={inProgress} />
    </button>
  );
}
