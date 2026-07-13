import { format } from "date-fns";

/**
 * Single source of truth for resolving a week's effective schedule and planning
 * moves in the Week Editor. Pure functions only — no I/O, fully unit-testable.
 *
 * Model: each `WeekAssignment` row is ABSOLUTE and self-describing —
 * "this week, calendar-day `day_of_week` shows the workout from template day
 * `source_day_of_week` (null = rest)". No directional deltas, so chained moves
 * cannot corrupt. See _bmad-output/planning-artifacts/move-workout-architecture.md.
 */

export type DayType = "strength" | "cardio" | "rest";

export interface PhaseDayLike {
  day_of_week: number;
  day_type: string;
  workout_name: string | null;
  phase_day_exercises?: unknown[];
}

export interface WeekAssignment {
  /** Calendar slot this row describes (1=Mon..7=Sun). */
  day_of_week: number;
  /** Template day whose workout occupies this slot; null = explicit rest. */
  source_day_of_week: number | null;
}

export interface EffectiveDay {
  dayOfWeek: number;
  date: Date;
  dayType: DayType;
  workoutName: string | null;
  phaseDay: PhaseDayLike | null;
  /** Which template day supplies this slot's content (null = rest). */
  sourceDayOfWeek: number | null;
  isToday: boolean;
  isOverridden: boolean;
}

export interface DayFlags {
  /** yyyy-MM-dd strings for days with a completed session. */
  completedDates?: Set<string>;
  /** yyyy-MM-dd strings for days with an in-progress session. */
  inProgressDates?: Set<string>;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Resolve the 7-day effective schedule for a week from the phase template plus
 * this week's assignments. Deterministic; `today` is injectable for testing.
 */
export function resolveWeekSchedule(
  weekStartDate: string,
  phaseDays: PhaseDayLike[],
  assignments: WeekAssignment[] = [],
  today: Date = new Date(),
): EffectiveDay[] {
  const monday = new Date(weekStartDate + "T00:00:00");
  const todayStr = iso(today);

  return Array.from({ length: 7 }, (_, i) => {
    const dayOfWeek = i + 1;
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const assignment = assignments.find((a) => a.day_of_week === dayOfWeek);
    // A self-referential row (source === slot) resolves to the template — treat
    // as not overridden so the UI never shows a false "rescheduled" marker.
    const isOverridden = !!assignment && assignment.source_day_of_week !== dayOfWeek;
    const sourceDayOfWeek = assignment ? assignment.source_day_of_week : dayOfWeek;

    const phaseDay =
      sourceDayOfWeek == null
        ? null
        : phaseDays.find((d) => d.day_of_week === sourceDayOfWeek) ?? null;

    return {
      dayOfWeek,
      date,
      dayType: (phaseDay?.day_type as DayType) ?? "rest",
      workoutName: phaseDay?.workout_name ?? null,
      phaseDay,
      sourceDayOfWeek,
      isToday: iso(date) === todayStr,
      isOverridden,
    };
  });
}

/**
 * Compute the assignment rows for moving `sourceDow`'s workout onto `targetDow`.
 * Rest target → move (source becomes rest). Active target → swap (trade content).
 * Rows are keyed by distinct calendar slots, so persistence is a single upsert.
 */
export function planMove(
  sourceDow: number,
  targetDow: number,
  schedule: EffectiveDay[],
): WeekAssignment[] {
  const src = schedule.find((d) => d.dayOfWeek === sourceDow);
  const tgt = schedule.find((d) => d.dayOfWeek === targetDow);
  if (!src || !tgt) throw new Error("planMove: source or target day not in schedule");

  if (tgt.dayType !== "rest") {
    // Swap: the two days trade workouts.
    return [
      { day_of_week: targetDow, source_day_of_week: src.sourceDayOfWeek },
      { day_of_week: sourceDow, source_day_of_week: tgt.sourceDayOfWeek },
    ];
  }
  // Move onto a rest day: source workout relocates; source becomes rest.
  return [
    { day_of_week: targetDow, source_day_of_week: src.sourceDayOfWeek },
    { day_of_week: sourceDow, source_day_of_week: null },
  ];
}

/**
 * Split planned rows for persistence: a slot restored to its own template
 * (source === slot) is deleted rather than stored, keeping "0 rows = pure plan".
 */
export function diffAssignments(rows: WeekAssignment[]): {
  upserts: WeekAssignment[];
  deleteDows: number[];
} {
  const upserts: WeekAssignment[] = [];
  const deleteDows: number[] = [];
  for (const row of rows) {
    if (row.source_day_of_week === row.day_of_week) deleteDows.push(row.day_of_week);
    else upserts.push(row);
  }
  return { upserts, deleteDows };
}

/** A day can be picked up if it has a workout, isn't completed, and isn't mid-session. */
export function canPickUp(day: EffectiveDay, flags: DayFlags = {}): boolean {
  if (day.dayType === "rest") return false;
  const ds = iso(day.date);
  if (flags.completedDates?.has(ds)) return false;
  if (flags.inProgressDates?.has(ds)) return false;
  return true; // active + uncompleted; past ("missed"), today, and future all qualify
}

/** Whether `source` may be dropped onto `target`. */
export function canDrop(
  source: EffectiveDay,
  target: EffectiveDay,
  flags: DayFlags = {},
  today: Date = new Date(),
): boolean {
  if (target.dayOfWeek === source.dayOfWeek) return false;

  const targetStr = iso(target.date);
  if (flags.completedDates?.has(targetStr)) return false;
  if (flags.inProgressDates?.has(targetStr)) return false;

  const todayStr = iso(today);
  if (targetStr < todayStr) return false; // never place into the past

  // A missed (past) source can only be MOVED onto a rest day — a swap would push
  // the target's workout into the past.
  const sourceIsPast = iso(source.date) < todayStr;
  if (sourceIsPast && target.dayType !== "rest") return false;

  return true;
}
