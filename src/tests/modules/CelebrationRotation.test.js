/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import {
  BUILT_IN_CELEBRATIONS,
  CUSTOM_CELEBRATION,
  pickNextCelebration,
} from "../../scripts/CelebrationRotation";

describe("pickNextCelebration", () => {
  const available = [...BUILT_IN_CELEBRATIONS];
  const randomValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999999];

  it("has at least four distinct built-in celebrations", () => {
    expect(new Set(BUILT_IN_CELEBRATIONS).size).toBeGreaterThanOrEqual(4);
  });

  it("never returns the celebration shown last, whatever the random value", () => {
    for (const last of available) {
      for (const value of randomValues) {
        expect(pickNextCelebration(available, last, () => value)).not.toBe(last);
      }
    }
  });

  it("can reach every other celebration", () => {
    const reached = new Set(
      randomValues.map((value) => pickNextCelebration(available, "club", () => value)),
    );
    const others = available.filter((name) => name !== "club");
    expect([...reached].sort()).toEqual(others.sort());
  });

  it("may pick anything when nothing was shown yet", () => {
    expect(pickNextCelebration(available, null, () => 0)).toBe(available[0]);
    expect(pickNextCelebration(available, null, () => 0.999999)).toBe(available[available.length - 1]);
  });

  it("includes the custom celebration only when it is among the available ones", () => {
    const withoutCustom = randomValues.map((value) => pickNextCelebration(available, null, () => value));
    expect(withoutCustom).not.toContain(CUSTOM_CELEBRATION);
    const withCustom = [...available, CUSTOM_CELEBRATION];
    const picked = randomValues.map((value) => pickNextCelebration(withCustom, "club", () => value));
    expect(picked).toContain(CUSTOM_CELEBRATION);
  });

  it("repeats only when there is a single celebration to choose from", () => {
    expect(pickNextCelebration(["club"], "club", () => 0.5)).toBe("club");
  });

  it("throws when nothing is available", () => {
    expect(() => pickNextCelebration([], null)).toThrow();
  });
});
