import { describe, it, expect } from "vitest";
import {
  resolveWeekSchedule,
  planMove,
  diffAssignments,
  canPickUp,
  canDrop,
  type PhaseDayLike,
  type WeekAssignment,
  type EffectiveDay,
} from "./weekSchedule";

const WEEK = "2026-07-13"; // Monday
const MON = new Date("2026-07-13T09:00:00");

// Mon Push · Tue rest · Wed Legs · Thu rest · Fri Pull · Sat Zone 2 (cardio) · Sun rest
const template: PhaseDayLike[] = [
  { day_of_week: 1, day_type: "strength", workout_name: "Push" },
  { day_of_week: 2, day_type: "rest", workout_name: null },
  { day_of_week: 3, day_type: "strength", workout_name: "Legs" },
  { day_of_week: 4, day_type: "rest", workout_name: null },
  { day_of_week: 5, day_type: "strength", workout_name: "Pull" },
  { day_of_week: 6, day_type: "cardio", workout_name: "Zone 2" },
  { day_of_week: 7, day_type: "rest", workout_name: null },
];

const dayOf = (s: EffectiveDay[], dow: number) => s.find((d) => d.dayOfWeek === dow)!;

describe("resolveWeekSchedule", () => {
  it("is pure template when there are no assignments", () => {
    const s = resolveWeekSchedule(WEEK, template, [], MON);
    expect(s).toHaveLength(7);
    expect(s.every((d) => !d.isOverridden)).toBe(true);
    expect(dayOf(s, 3).workoutName).toBe("Legs");
    expect(dayOf(s, 3).sourceDayOfWeek).toBe(3);
    expect(dayOf(s, 2).dayType).toBe("rest");
  });

  it("applies a move: Wed(Legs) → Thu(rest)", () => {
    const a: WeekAssignment[] = [
      { day_of_week: 4, source_day_of_week: 3 },
      { day_of_week: 3, source_day_of_week: null },
    ];
    const s = resolveWeekSchedule(WEEK, template, a, MON);
    expect(dayOf(s, 4).workoutName).toBe("Legs");
    expect(dayOf(s, 4).isOverridden).toBe(true);
    expect(dayOf(s, 3).dayType).toBe("rest");
    expect(dayOf(s, 3).isOverridden).toBe(true);
  });

  it("applies a swap: Mon(Push) ↔ Fri(Pull)", () => {
    const a: WeekAssignment[] = [
      { day_of_week: 5, source_day_of_week: 1 },
      { day_of_week: 1, source_day_of_week: 5 },
    ];
    const s = resolveWeekSchedule(WEEK, template, a, MON);
    expect(dayOf(s, 5).workoutName).toBe("Push");
    expect(dayOf(s, 1).workoutName).toBe("Pull");
  });

  it("treats a self-referential assignment as non-overridden", () => {
    const s = resolveWeekSchedule(WEEK, template, [{ day_of_week: 1, source_day_of_week: 1 }], MON);
    expect(dayOf(s, 1).isOverridden).toBe(false);
    expect(dayOf(s, 1).workoutName).toBe("Push");
  });

  it("computes isToday by calendar date (not object identity)", () => {
    const wed = new Date("2026-07-15T09:00:00");
    const s = resolveWeekSchedule(WEEK, template, [], wed);
    expect(dayOf(s, 3).isToday).toBe(true);
    expect(s.filter((d) => d.isToday)).toHaveLength(1);
  });
});

describe("planMove", () => {
  const base = resolveWeekSchedule(WEEK, template, [], MON);

  it("move onto rest → target gets source content, source becomes rest", () => {
    const rows = planMove(3, 4, base); // Legs → Thu (rest)
    expect(rows).toContainEqual({ day_of_week: 4, source_day_of_week: 3 });
    expect(rows).toContainEqual({ day_of_week: 3, source_day_of_week: null });
  });

  it("swap onto active → the two days trade sources", () => {
    const rows = planMove(1, 5, base); // Push ↔ Pull
    expect(rows).toContainEqual({ day_of_week: 5, source_day_of_week: 1 });
    expect(rows).toContainEqual({ day_of_week: 1, source_day_of_week: 5 });
  });

  it("chained swap-back composes cleanly (self-referential rows)", () => {
    const afterFirst = resolveWeekSchedule(WEEK, template, planMove(1, 5, base), MON);
    const rows = planMove(5, 1, afterFirst); // swap them back
    expect(rows).toContainEqual({ day_of_week: 1, source_day_of_week: 1 });
    expect(rows).toContainEqual({ day_of_week: 5, source_day_of_week: 5 });
  });
});

describe("diffAssignments", () => {
  it("routes rows restored to template into deletes", () => {
    const { upserts, deleteDows } = diffAssignments([
      { day_of_week: 1, source_day_of_week: 1 },
      { day_of_week: 4, source_day_of_week: 3 },
    ]);
    expect(deleteDows).toEqual([1]);
    expect(upserts).toEqual([{ day_of_week: 4, source_day_of_week: 3 }]);
  });
});

describe("eligibility", () => {
  const today = new Date("2026-07-15T09:00:00"); // Wed
  const s = resolveWeekSchedule(WEEK, template, [], today);

  it("canPickUp: active uncompleted yes, rest no", () => {
    expect(canPickUp(dayOf(s, 3))).toBe(true); // Wed strength
    expect(canPickUp(dayOf(s, 2))).toBe(false); // Tue rest
  });

  it("canPickUp: completed day no", () => {
    expect(canPickUp(dayOf(s, 1), { completedDates: new Set(["2026-07-13"]) })).toBe(false);
  });

  it("canPickUp: a missed (past uncompleted) active day is still pickable", () => {
    expect(canPickUp(dayOf(s, 1))).toBe(true); // Mon strength, in the past
  });

  it("canDrop: never targets the past", () => {
    expect(canDrop(dayOf(s, 3), dayOf(s, 1), {}, today)).toBe(false); // → Mon (past)
  });

  it("canDrop: missed source moves onto future rest, but cannot swap into the past", () => {
    expect(canDrop(dayOf(s, 1), dayOf(s, 4), {}, today)).toBe(true); // Mon → Thu (rest)
    expect(canDrop(dayOf(s, 1), dayOf(s, 5), {}, today)).toBe(false); // Mon → Fri (active swap)
  });

  it("canDrop: rejects self and completed targets", () => {
    expect(canDrop(dayOf(s, 3), dayOf(s, 3), {}, today)).toBe(false); // self
    const flags = { completedDates: new Set(["2026-07-17"]) }; // Fri completed
    expect(canDrop(dayOf(s, 3), dayOf(s, 5), flags, today)).toBe(false);
  });
});
