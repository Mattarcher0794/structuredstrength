import { describe, it, expect } from "vitest";
import { computeSessionStreak } from "./streak";
import type { PhaseDayLike } from "./weekSchedule";

// Mon strength · Tue rest · Wed strength · Thu rest · Fri strength · Sat/Sun rest
const template: PhaseDayLike[] = [
  { day_of_week: 1, day_type: "strength", workout_name: "A" },
  { day_of_week: 2, day_type: "rest", workout_name: null },
  { day_of_week: 3, day_type: "strength", workout_name: "B" },
  { day_of_week: 4, day_type: "rest", workout_name: null },
  { day_of_week: 5, day_type: "strength", workout_name: "C" },
  { day_of_week: 6, day_type: "rest", workout_name: null },
  { day_of_week: 7, day_type: "rest", workout_name: null },
];

// Week of Mon 2026-07-13: Mon 13, Wed 15, Fri 17 are training days.
const FRI = new Date("2026-07-17T12:00:00");
const PHASE_START = "2026-07-13";

describe("computeSessionStreak", () => {
  it("counts completed sessions back to the phase start; today-not-done is grace", () => {
    const completed = new Set(["2026-07-15", "2026-07-13"]); // Wed, Mon done; Fri (today) not
    expect(computeSessionStreak(FRI, PHASE_START, template, {}, completed)).toBe(2);
  });

  it("counts today when it IS completed", () => {
    const completed = new Set(["2026-07-17", "2026-07-15", "2026-07-13"]);
    expect(computeSessionStreak(FRI, PHASE_START, template, {}, completed)).toBe(3);
  });

  it("a missed scheduled session ends the streak", () => {
    const completed = new Set(["2026-07-13"]); // Wed missed → break before reaching Mon
    expect(computeSessionStreak(FRI, PHASE_START, template, {}, completed)).toBe(0);
  });

  it("rest days never break the streak", () => {
    // Only Mon + Wed done, today (Fri) grace — the Tue/Thu rests between must not break it
    const completed = new Set(["2026-07-15", "2026-07-13"]);
    expect(computeSessionStreak(FRI, PHASE_START, template, {}, completed)).toBe(2);
  });

  it("an all-rest plan yields a streak of 0", () => {
    const allRest: PhaseDayLike[] = template.map((d) => ({ ...d, day_type: "rest", workout_name: null }));
    const completed = new Set(["2026-07-15", "2026-07-13"]);
    expect(computeSessionStreak(FRI, PHASE_START, allRest, {}, completed)).toBe(0);
  });

  it("is bounded by the phase start (earlier sessions don't count)", () => {
    // Phase starts Wed 15; Mon 13 completed but is before the phase → not counted
    const completed = new Set(["2026-07-17", "2026-07-15", "2026-07-13"]);
    expect(computeSessionStreak(FRI, "2026-07-15", template, {}, completed)).toBe(2);
  });

  it("respects week_day_assignments (a moved session)", () => {
    // Move Wed's workout to Thu this week: Thu becomes training, Wed becomes rest.
    const assignments = {
      "2026-07-13": [
        { day_of_week: 4, source_day_of_week: 3 }, // Thu shows Wed's workout
        { day_of_week: 3, source_day_of_week: null }, // Wed now rest
      ],
    };
    // Completed: Thu 16 (the moved session) + Mon 13; today Fri grace. Wed is rest now → neutral.
    const completed = new Set(["2026-07-16", "2026-07-13"]);
    expect(computeSessionStreak(FRI, PHASE_START, template, assignments, completed)).toBe(2);
  });
});
