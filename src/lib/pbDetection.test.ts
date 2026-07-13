import { describe, it, expect } from "vitest";
import { isBetterSet, pickBestSet } from "./pbDetection";

describe("isBetterSet", () => {
  it("heavier weight wins regardless of reps", () => {
    expect(isBetterSet({ weight: 100, reps: 1 }, { weight: 90, reps: 10 })).toBe(true);
    expect(isBetterSet({ weight: 90, reps: 10 }, { weight: 100, reps: 1 })).toBe(false);
  });

  it("at equal weight, more reps wins", () => {
    expect(isBetterSet({ weight: 100, reps: 8 }, { weight: 100, reps: 5 })).toBe(true);
    expect(isBetterSet({ weight: 100, reps: 5 }, { weight: 100, reps: 8 })).toBe(false);
  });

  it("an identical set is not strictly better", () => {
    expect(isBetterSet({ weight: 100, reps: 5 }, { weight: 100, reps: 5 })).toBe(false);
  });

  it("treats null weight/reps as zero", () => {
    expect(isBetterSet({ weight: null, reps: null }, { weight: 0, reps: 0 })).toBe(false);
    expect(isBetterSet({ weight: 50, reps: null }, { weight: null, reps: 5 })).toBe(true);
  });
});

describe("pickBestSet", () => {
  it("picks the heaviest set", () => {
    const sets = [
      { id: "a", weight: 100, reps: 3 },
      { id: "b", weight: 100, reps: 8 },
      { id: "c", weight: 110, reps: 1 },
      { id: "d", weight: 90, reps: 12 },
    ];
    expect(pickBestSet(sets)?.id).toBe("c");
  });

  it("breaks weight ties by reps", () => {
    const sets = [
      { id: "a", weight: 100, reps: 3 },
      { id: "b", weight: 100, reps: 8 },
    ];
    expect(pickBestSet(sets)?.id).toBe("b");
  });

  it("returns null for an empty list", () => {
    expect(pickBestSet([])).toBeNull();
  });
});
