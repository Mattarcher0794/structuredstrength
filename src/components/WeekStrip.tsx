import { useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Check, ArrowLeftRight } from "lucide-react";
import type { EffectiveDaySchedule } from "@/pages/Today";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function getIsoDow(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

interface Props {
  schedule: EffectiveDaySchedule[];
  allPhaseDays: any[] | undefined;
  completedDates: Set<string>;
  onDayTap: (day: EffectiveDaySchedule) => void;
}

export function WeekStrip({ schedule, allPhaseDays, completedDates, onDayTap }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build 14-day array starting from today
  const days = useMemo<EffectiveDaySchedule[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, "yyyy-MM-dd");

    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dow = getIsoDow(date);

      // Try to match from effectiveWeekSchedule (current week with overrides)
      const matched = schedule.find(
        (d) => format(d.date, "yyyy-MM-dd") === dateStr
      );

      if (matched) {
        return {
          ...matched,
          isToday: dateStr === todayStr,
        };
      }

      // Fall back to phase template for next week days
      const phaseDay = allPhaseDays?.find((d) => d.day_of_week === dow) ?? null;

      return {
        dayOfWeek: dow,
        date,
        dayType: phaseDay?.day_type ?? "rest",
        workoutName: phaseDay?.workout_name ?? null,
        phaseDay,
        isToday: dateStr === todayStr,
        isOverridden: false,
      };
    });
  }, [schedule, allPhaseDays]);

  // Scroll to start on mount (today is index 0)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, []);

  if (days.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="mb-4 flex overflow-x-auto snap-x snap-mandatory"
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        .week-strip-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {days.map((day, i) => {
        const dateStr = format(day.date, "yyyy-MM-dd");
        const isCompleted = completedDates.has(dateStr);
        const dateNum = day.date.getDate();
        const dow = getIsoDow(day.date);

        return (
          <button
            key={i}
            onClick={() => onDayTap(day)}
            className="flex flex-col items-center gap-1 pt-1 pb-1 flex-shrink-0 snap-start"
            style={{ width: "calc(100% / 7)" }}
          >
            {/* Day letter */}
            <span className="text-[10px] font-medium text-muted-foreground leading-none">
              {DAY_LETTERS[dow - 1]}
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
              ) : day.isToday && (day.dayType === "strength" || day.dayType === "cardio") ? (
                <span
                  className="block w-[6px] h-[6px] rounded-full border"
                  style={{ borderColor: day.dayType === "cardio" ? "#A8D4E0" : "hsl(var(--primary))" }}
                />
              ) : day.dayType === "strength" ? (
                <span className="block w-[6px] h-[6px] rounded-full bg-primary" />
              ) : day.dayType === "cardio" ? (
                <span className="block w-[6px] h-[6px] rounded-full" style={{ backgroundColor: "#A8D4E0" }} />
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
