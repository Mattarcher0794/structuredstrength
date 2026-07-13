import { format } from "date-fns";

/**
 * Returns the Monday of the current week as a YYYY-MM-DD string.
 */
export function getWeekStartDate(date?: Date): string {
  const ref = date ? new Date(date) : new Date();
  const day = ref.getDay(); // 0=Sun, 1=Mon...

  // Sunday is the LAST day of its Monday-based week — go back 6 days. (Previously
  // the no-arg case looked ahead to next Monday, which excluded Sunday from its
  // own week; see move-workout-architecture.md.)
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diff);
  // Format from local date parts — toISOString() would shift the day in
  // positive-offset timezones (e.g. BST midnight → previous day UTC).
  return format(monday, "yyyy-MM-dd");
}

/**
 * Returns today's day_of_week in 1=Mon, 7=Sun format.
 */
export function getTodayDayOfWeek(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/**
 * Returns the Monday of the following week as a YYYY-MM-DD string.
 */
export function getNextWeekStartDate(): string {
  const current = new Date(getWeekStartDate() + "T00:00:00");
  current.setDate(current.getDate() + 7);
  return format(current, "yyyy-MM-dd");
}

/**
 * Returns the calendar date for a given day_of_week (1=Mon..7=Sun)
 * in the current week.
 */
export function getDateForDayOfWeek(dayOfWeek: number): Date {
  const mondayStr = getWeekStartDate();
  const monday = new Date(mondayStr + "T00:00:00");
  const result = new Date(monday);
  result.setDate(monday.getDate() + (dayOfWeek - 1));
  return result;
}
