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
  const today = new Date();
  const currentDow = today.getDay(); // 0=Sun
  const currentIsoDow = currentDow === 0 ? 7 : currentDow;
  const diff = dayOfWeek - currentIsoDow;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}
