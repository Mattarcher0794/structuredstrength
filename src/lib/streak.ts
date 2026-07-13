import { format } from "date-fns";
import { getWeekStartDate } from "./weekUtils";
import { resolveWeekSchedule, type PhaseDayLike, type WeekAssignment } from "./weekSchedule";

/**
 * "Sessions on plan" streak — consecutive completed scheduled training sessions,
 * walking backwards from today. Rest is part of the plan, so:
 *   - a rest day is NEUTRAL (skipped; neither counts nor breaks),
 *   - a completed scheduled training day increments the streak,
 *   - a missed (past, uncompleted) scheduled training day ENDS the streak,
 *   - today, if scheduled but not yet done, is a GRACE day (the day isn't over).
 *
 * Bounded by the phase start (or a 400-day floor when the start is unknown).
 * Reuses the shared resolveWeekSchedule so it respects week_day_assignments.
 */
export function computeSessionStreak(
  today: Date,
  phaseStartDate: string | null,
  phaseDays: PhaseDayLike[],
  assignmentsByWeekStart: Record<string, WeekAssignment[]>,
  completedDates: Set<string>,
): number {
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  const todayStr = iso(today);

  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  const floor = phaseStartDate
    ? new Date(phaseStartDate + "T00:00:00")
    : (() => {
        const f = new Date(cursor);
        f.setDate(f.getDate() - 400);
        return f;
      })();

  const cache = new Map<string, ReturnType<typeof resolveWeekSchedule>>();
  let streak = 0;
  let guard = 0;

  while (cursor >= floor && guard++ < 500) {
    const weekStart = getWeekStartDate(cursor);
    let schedule = cache.get(weekStart);
    if (!schedule) {
      schedule = resolveWeekSchedule(weekStart, phaseDays, assignmentsByWeekStart[weekStart] ?? [], today);
      cache.set(weekStart, schedule);
    }
    const dow = cursor.getDay() === 0 ? 7 : cursor.getDay();
    const day = schedule.find((d) => d.dayOfWeek === dow);
    const dstr = iso(cursor);

    if (day && day.dayType !== "rest") {
      if (completedDates.has(dstr)) {
        streak++;
      } else if (dstr < todayStr) {
        break; // a missed scheduled session ends the streak
      }
      // today & not yet done → grace: neither counts nor breaks
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
