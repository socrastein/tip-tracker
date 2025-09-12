import { expect, test, describe } from "vitest";
import { mockTip } from "../MockTips";
import { TipAnalyzer } from "../../scripts/TipAnalyzer";

describe('TipAnalyzer', () => {
  describe('getPercentageDifference', () => {
    test('calculates percentage correctly', () => {
      expect(TipAnalyzer.getPercentageDifference(100, 50)).toEqual(200);
      expect(TipAnalyzer.getPercentageDifference(100, 33.33)).toEqual(300);
      expect(TipAnalyzer.getPercentageDifference(50, 100)).toEqual(50);
    });
  });

  describe('tip extremes', () => {
    const testTips = [
      mockTip(100),
      mockTip(200),
      mockTip(300),
      mockTip(301)
    ];

    test('returns length of tips array', () => {
      expect(TipAnalyzer.getLengthOfTips(testTips)).toBe(4);
    });

    test('finds largest tip', () => {
      expect(TipAnalyzer.getLargestTip(testTips)).toBe(testTips[3]);
    });

    test('finds lowest tip', () => {
      expect(TipAnalyzer.getLowestTip(testTips)).toBe(testTips[0]);
    });

    test('handles single tip array', () => {
      const singleTip = [mockTip(150, "2025-09-10", "Banquet", "Dinner")];
      expect(TipAnalyzer.getLargestTip(singleTip)).toBe(singleTip[0]);
      expect(TipAnalyzer.getLowestTip(singleTip)).toBe(singleTip[0]);
    });

    test('handles empty array gracefully', () => {
      expect(() => TipAnalyzer.getLargestTip([])).toThrow();
      expect(() => TipAnalyzer.getLowestTip([])).toThrow();
      // or return null/undefined depending on your implementation
    });
  });
});
