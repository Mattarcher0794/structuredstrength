import { describe, it, expect, afterEach, vi } from "vitest";
import { getWeekStartDate, getNextWeekStartDate, getTodayDayOfWeek } from "./weekUtils";

describe("getWeekStartDate (explicit dates)", () => {
  it("returns the same Monday for a Monday", () => {
    expect(getWeekStartDate(new Date("2026-07-13T12:00:00"))).toBe("2026-07-13");
  });
  it("returns the week's Monday for a mid-week day", () => {
    expect(getWeekStartDate(new Date("2026-07-15T12:00:00"))).toBe("2026-07-13"); // Wed
  });
  it("returns the week's Monday for a Sunday (Sunday is the last day of its week)", () => {
    expect(getWeekStartDate(new Date("2026-07-19T12:00:00"))).toBe("2026-07-13"); // Sun
  });
});

describe("current-week helpers on a Sunday (regression: Sunday belongs to its OWN week)", () => {
  afterEach(() => vi.useRealTimers());

  it("no-arg getWeekStartDate on Sunday returns this week's Monday, not next", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00")); // Sunday
    expect(getWeekStartDate()).toBe("2026-07-13");
    expect(getNextWeekStartDate()).toBe("2026-07-20");
    expect(getTodayDayOfWeek()).toBe(7);
  });
});
