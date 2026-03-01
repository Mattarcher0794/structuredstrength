/**
 * Returns the Monday of the current week as a YYYY-MM-DD string.
 */
export function getWeekStartDate(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...

  let diff: number;
  if (day === 0) {
    // Sunday — look ahead to upcoming Monday
    diff = 1;
  } else {
    // Mon-Sat — go back to this week's Monday
    diff = 1 - day;
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

/**
 * Returns today's day_of_week in 1=Mon, 7=Sun format.
 */
export function getTodayDayOfWeek(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 7 : day;
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
