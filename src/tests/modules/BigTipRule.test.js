/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import { BIG_TIP_THRESHOLD, shouldCelebrate } from "../../scripts/BigTipRule";

describe("shouldCelebrate", () => {
  it("uses a threshold of 600 dollars", () => {
    expect(BIG_TIP_THRESHOLD).toBe(600);
  });

  describe("a new tip", () => {
    it("does not celebrate 599", () => {
      expect(shouldCelebrate(undefined, 599)).toBe(false);
    });

    it("celebrates exactly 600", () => {
      expect(shouldCelebrate(undefined, 600)).toBe(true);
    });

    it("celebrates amounts above 600", () => {
      expect(shouldCelebrate(undefined, 1200)).toBe(true);
    });

    it("does not celebrate a cent short of the threshold", () => {
      expect(shouldCelebrate(undefined, 599.99)).toBe(false);
    });
  });

  describe("an edit", () => {
    it("celebrates a tip raised from 550 to 650", () => {
      expect(shouldCelebrate(550, 650)).toBe(true);
    });

    it("celebrates a tip raised from 599 to exactly 600", () => {
      expect(shouldCelebrate(599, 600)).toBe(true);
    });

    it("does not celebrate a tip that was already big (650 to 700)", () => {
      expect(shouldCelebrate(650, 700)).toBe(false);
    });

    it("does not celebrate a tip that was exactly 600 and stays big", () => {
      expect(shouldCelebrate(600, 600)).toBe(false);
    });

    it("does not celebrate lowering a big tip", () => {
      expect(shouldCelebrate(700, 650)).toBe(false);
    });

    it("does not celebrate an edit that stays below the threshold", () => {
      expect(shouldCelebrate(300, 599)).toBe(false);
    });
  });
});
