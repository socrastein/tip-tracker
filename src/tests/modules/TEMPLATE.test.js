import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  // set constants before each test
  // reset values, clear arrays, etc.
});

const consoleSpy = vi.spyOn(console, "log");

describe("fileName", () => {
  describe("methodBeingTested", () => {
    it("should do X", () => {
      expect(() => {
        /* function to return something, throw error, etc. */
      }).not.toThrow();
      expect(/* some variable to be a certain value */).toEqual();
    });

    it("should do Y", () => {});
  });

  describe("methodBeingTested", () => {
    it("should do X", () => {});

    it("should do Y", () => {});
  });
});
