import { expect, it, describe } from "vitest";
import { mockTip } from "../MockTips";
import { TipAnalyzer } from "../../scripts/TipAnalyzer";

describe('TipAnalyzer', () => {
  describe('getPercentageDifference', () => {
    it('calculates percentage correctly', () => {
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

    it('returns length of tips array', () => {
      expect(TipAnalyzer.getLengthOfTips(testTips)).toBe(4);
    });

    it('finds largest tip', () => {
      expect(TipAnalyzer.getLargestTip(testTips)).toBe(testTips[3].amount);
    });

    it('finds lowest tip', () => {
      expect(TipAnalyzer.getLowestTip(testTips)).toBe(testTips[0].amount);
    });

    it('handles single tip array', () => {
      const singleTip = [mockTip(150, "2025-09-10", "Banquet", "Dinner")];
      expect(TipAnalyzer.getLargestTip(singleTip)).toBe(singleTip[0].amount);
      expect(TipAnalyzer.getLowestTip(singleTip)).toBe(singleTip[0].amount);
    });

    it('handles empty array gracefully', () => {
      expect(() => TipAnalyzer.getLargestTip([])).toThrow();
      expect(() => TipAnalyzer.getLowestTip([])).toThrow();
      // or return null/undefined depending on your implementation
    });
  });

  describe('tip averages', () => {

    it('should calculate correct average and floor the result', () => {
      const tips = [
        mockTip(100, '2024-01-01', 'Floor', 'Lunch'),
        mockTip(150, '2024-01-02', 'Banquet', 'Dinner'),
        mockTip(200, '2024-01-03', 'Floor', 'Lunch')
      ];
      // Total: 450, Count: 3, Average: 150
      expect(TipAnalyzer.getAverageTip(tips)).toBe(150);
    });

    it('should floor decimal averages', () => {
      const tips = [
        mockTip(100, '2024-01-01', 'Floor', 'Lunch'),
        mockTip(101, '2024-01-02', 'Banquet', 'Dinner')
      ];
      // Total: 201, Count: 2, Average: 100.5, Floored: 100
      expect(TipAnalyzer.getAverageTip(tips)).toBe(100);
    });
  });
});
