import { format } from "date-fns";
import { Check, ArrowLeftRight } from "lucide-react";
import type { EffectiveDaySchedule } from "@/pages/Today";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

interface Props {
  schedule: EffectiveDaySchedule[];
  completedDates: Set<string>;
  onDayTap: (day: EffectiveDaySchedule) => void;
}

export function WeekStrip({ schedule, completedDates, onDayTap }: Props) {
  if (schedule.length === 0) return null;

  return (
    <div className="mb-4 flex justify-between items-start">
      {schedule.map((day) => {
        const dateStr = format(day.date, "yyyy-MM-dd");
        const isCompleted = completedDates.has(dateStr);
        const dateNum = day.date.getDate();

        return (
          <button
            key={day.dayOfWeek}
            onClick={() => onDayTap(day)}
            className="flex flex-col items-center gap-1 min-w-[36px] min-h-[44px] pt-1 pb-1"
          >
            {/* Day letter */}
            <span className="text-[10px] font-medium text-muted-foreground leading-none">
              {DAY_LETTERS[day.dayOfWeek - 1]}
            </span>

            {/* Date number */}
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold leading-none ${
                day.isToday
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              {dateNum}
            </span>

            {/* Indicator dot / check */}
            <div className="h-3 flex items-center justify-center">
              {isCompleted ? (
                <Check className="h-2.5 w-2.5 text-primary" />
              ) : day.isToday && day.dayType === "strength" ? (
                <span className="block w-[6px] h-[6px] rounded-full border border-primary" />
              ) : day.dayType === "strength" ? (
                <span className="block w-[6px] h-[6px] rounded-full bg-primary" />
              ) : day.dayType === "cardio" ? (
                <span className="block w-[6px] h-[6px] rounded-full bg-muted-foreground/40" />
              ) : (
                <span className="block w-[6px] h-[6px] rounded-full bg-muted-foreground/20" />
              )}
            </div>

            {/* Override indicator */}
            <div className="h-2.5 flex items-center justify-center">
              {day.isOverridden && (
                <ArrowLeftRight className="h-2 w-2 text-amber-500/60" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
