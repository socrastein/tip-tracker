import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getYearMonthDayString, daysAgo } from "../../scripts/Dates";

describe("Dates module", () => {
  describe("getYearMonthDayString", () => {
    let mockDate;

    beforeEach(() => {
      // Mock current date to January 15, 2024 for consistent testing
      mockDate = new Date("2024-01-15T10:30:00");
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("with no parameter (default to today)", () => {
      it("should return today's date in YYYY-MM-DD format", () => {
        const result = getYearMonthDayString();
        expect(result).toBe("2024-01-15");
      });

      it("should handle different current dates", () => {
        vi.setSystemTime(new Date("2023-12-31T23:59:59"));
        expect(getYearMonthDayString()).toBe("2023-12-31");

        vi.setSystemTime(new Date("2025-06-01T00:00:01"));
        expect(getYearMonthDayString()).toBe("2025-06-01");
      });
    });

    describe("with Date objects", () => {
      it("should handle Date object input", () => {
        const testDate = new Date("2023-05-20T14:30:00");
        expect(getYearMonthDayString(testDate)).toBe("2023-05-20");
      });

      it("should handle leap year dates", () => {
        const leapDate = new Date("2024-02-29T12:00:00");
        expect(getYearMonthDayString(leapDate)).toBe("2024-02-29");
      });
    });

    describe("with timestamp numbers", () => {
      it("should handle timestamp input", () => {
        const timestamp = new Date("2022-11-03T09:15:00").getTime();
        expect(getYearMonthDayString(timestamp)).toBe("2022-11-03");
      });

      it("should handle zero timestamp (Unix epoch)", () => {
        // Note: 0 is falsy, so it triggers the default behavior (today's date)
        expect(getYearMonthDayString(0)).toBe("2024-01-15");
      });
    });

    describe("with human-readable date strings", () => {
      it("should handle various US date formats", () => {
        expect(getYearMonthDayString("1/15/2024")).toBe("2024-01-15");
        expect(getYearMonthDayString("01/15/2024")).toBe("2024-01-15");
        expect(getYearMonthDayString("1-15-2024")).toBe("2024-01-15");
      });

      it("should handle month names", () => {
        expect(getYearMonthDayString("Jan 15, 2024")).toBe("2024-01-15");
        expect(getYearMonthDayString("January 15 2024")).toBe("2024-01-15");
        expect(getYearMonthDayString("15 Jan 2024")).toBe("2024-01-15");
      });

      it("should handle full month names", () => {
        expect(getYearMonthDayString("December 25, 2023")).toBe("2023-12-25");
        expect(getYearMonthDayString("March 1, 2024")).toBe("2024-03-01");
      });
    });

    describe("with ISO date strings", () => {
      it("should handle ISO date-only strings", () => {
        // Note: This might have timezone issues, but testing current behavior
        const result = getYearMonthDayString("2024-01-15");
        expect(result).toMatch(/^2024-01-(14|15)$/); // Allow for timezone differences
      });

      it("should handle full ISO datetime strings", () => {
        expect(getYearMonthDayString("2024-01-15T10:30:00Z")).toMatch(
          /^2024-01-(14|15)$/
        );
        expect(getYearMonthDayString("2024-06-20T15:45:30.123Z")).toMatch(
          /^2024-06-(19|20)$/
        );
      });
    });

    describe("formatting edge cases", () => {
      it("should pad single-digit months and days with zeros", () => {
        expect(getYearMonthDayString("2024-1-5")).toBe("2024-01-05");
        expect(getYearMonthDayString("March 5, 2024")).toBe("2024-03-05");
      });

      it("should handle end/start of year dates", () => {
        expect(getYearMonthDayString("December 31, 2023")).toBe("2023-12-31");
        expect(getYearMonthDayString("January 1, 2024")).toBe("2024-01-01");
      });

      it("should handle different years correctly", () => {
        expect(getYearMonthDayString("1999-12-31")).toMatch(/^1999-12-31$/);
        expect(getYearMonthDayString("2030-06-15")).toMatch(
          /^2030-06-(14|15)$/
        );
      });
    });

    describe("error handling", () => {
      it("should throw error for invalid date strings", () => {
        expect(() => getYearMonthDayString("invalid date")).toThrow(
          "Invalid date: invalid date provided to getYearMonthDayString()"
        );
        expect(() => getYearMonthDayString("not-a-date")).toThrow(
          "Invalid date: not-a-date provided to getYearMonthDayString()"
        );
        expect(() => getYearMonthDayString("13/45/2024")).toThrow(
          "Invalid date: 13/45/2024 provided to getYearMonthDayString()"
        );
      });

      it("should throw error for invalid numbers", () => {
        expect(() => getYearMonthDayString(NaN)).toThrow(
          "Invalid date: NaN provided to getYearMonthDayString()"
        );
      });

      it("should throw error for non-date objects", () => {
        expect(() => getYearMonthDayString({})).toThrow();
        expect(() => getYearMonthDayString([])).toThrow();
      });

      it("should handle null and undefined gracefully", () => {
        expect(() => getYearMonthDayString(null)).toThrow(
          "Invalid date: null provided to getYearMonthDayString()"
        );
        expect(() => getYearMonthDayString(undefined)).not.toThrow(); // undefined should use default (today)
      });
    });

    describe("type flexibility", () => {
      it("should handle string numbers", () => {
        // String numbers when passed to new Date() can be problematic
        // Testing that it throws an error as expected
        const timestamp = new Date("2024-01-15").getTime().toString();
        expect(() => getYearMonthDayString(timestamp)).toThrow();
      });

      it("should handle boolean inputs (testing edge cases)", () => {
        // These create dates but might not be meaningful - testing current behavior
        expect(() => getYearMonthDayString(true)).not.toThrow();
        expect(() => getYearMonthDayString(false)).not.toThrow();
      });
    });
  });

  describe("daysAgo", () => {
    let mockDate;

    beforeEach(() => {
      // Mock current date to January 15, 2024 for consistent testing
      mockDate = new Date("2024-01-15T10:30:00");
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return date from x days ago", () => {
      const result = daysAgo(5);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January (0-indexed)
      expect(result.getDate()).toBe(10); // Jan 15 - 5 = Jan 10
    });

    it("should handle 0 days (today)", () => {
      const result = daysAgo(0);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("should handle 1 day ago (yesterday)", () => {
      const result = daysAgo(1);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(14);
    });

    it("should handle crossing month boundaries", () => {
      vi.setSystemTime(new Date("2024-01-05T10:30:00"));
      const result = daysAgo(10); // Should go to Dec 26, 2023
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December (0-indexed)
      expect(result.getDate()).toBe(26);
    });

    it("should handle crossing year boundaries", () => {
      vi.setSystemTime(new Date("2024-01-01T10:30:00"));
      const result = daysAgo(1); // Should go to Dec 31, 2023
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December (0-indexed)
      expect(result.getDate()).toBe(31);
    });

    it("should handle leap year calculations", () => {
      vi.setSystemTime(new Date("2024-03-01T10:30:00")); // 2024 is leap year
      const result = daysAgo(1); // Should go to Feb 29, 2024
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(29);
    });

    it("should handle large numbers of days", () => {
      const result = daysAgo(365); // About a year ago
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15); // Same day, previous year
    });

    it("should handle very large numbers", () => {
      const result = daysAgo(1000);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeLessThan(mockDate.getTime());
    });

    it("should preserve time of day from current moment", () => {
      vi.setSystemTime(new Date("2024-01-15T14:25:30.123"));
      const result = daysAgo(1);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(25);
      expect(result.getSeconds()).toBe(30);
    });

    describe("edge cases and type handling", () => {
      it("should handle negative numbers (future dates)", () => {
        const result = daysAgo(-5); // 5 days in the future
        expect(result.getDate()).toBe(20); // Jan 15 + 5 = Jan 20
      });

      it("should handle zero", () => {
        const result = daysAgo(0);
        expect(result.getDate()).toBe(15); // Same day
      });

      it("should throw error for decimal numbers", () => {
        expect(() => daysAgo(1.5)).toThrow("daysAgo() expects an integer");
        expect(() => daysAgo(-2.7)).toThrow("daysAgo() expects an integer");
      });
    });

    describe("return type validation", () => {
      it("should return a Date object", () => {
        const result = daysAgo(5);
        expect(result).toBeInstanceOf(Date);
      });

      it("should return a valid date", () => {
        const result = daysAgo(10);
        expect(result.toString()).not.toBe("Invalid Date");
        expect(isNaN(result.getTime())).toBe(false);
      });
    });

    describe("integration with getYearMonthDayString", () => {
      it("should work together for getting formatted dates from days ago", () => {
        const fiveDaysAgo = daysAgo(5);
        const formatted = getYearMonthDayString(fiveDaysAgo);
        expect(formatted).toBe("2024-01-10");
      });

      it("should handle month boundary crossing together", () => {
        vi.setSystemTime(new Date("2024-03-02T10:30:00"));
        const threeDaysAgo = daysAgo(3); // Should be Feb 28, 2024
        const formatted = getYearMonthDayString(threeDaysAgo);
        expect(formatted).toBe("2024-02-28");
      });
    });
  });
});
