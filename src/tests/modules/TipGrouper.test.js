import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipGrouper } from '../../scripts/TipGrouper';
import { Tip } from '../../scripts/ClassTip';

// Mock Vue's reactive function
vi.mock('vue', () => ({
  reactive: vi.fn((obj) => obj)
}));

it('DEBUG: should show what days the dates actually resolve to', () => {
  const testDates = ['2024-01-01', '2024-01-02', '2024-01-08', '2024-01-03'];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  testDates.forEach(date => {
    const dayIndex = new Date(date).getDay();
    const dayName = dayNames[dayIndex];
    console.log(`${date} -> ${dayName} (index: ${dayIndex})`);
  });
});

describe('TipGrouper', () => {
  let sampleTips;

  beforeEach(() => {
    // Create sample tips for testing
    sampleTips = [
      new Tip(100, '2024-01-05', 'Floor', 'Lunch'),
      new Tip(150, '2024-01-15', 'Banquet', 'Dinner'),
      new Tip(200, '2024-01-20', 'Floor', 'Lunch'),
      new Tip(250, '2024-02-10', 'Banquet', 'Dinner'),
      new Tip(300, '2024-02-25', 'Floor', 'Lunch'),
      new Tip(175, '2024-01-05', 'Banquet', 'Dinner'),
      new Tip(125, '2023-12-30', 'Floor', 'Lunch'),
    ];
  });

  describe('getGroupKey', () => {
    it('should return correct key for first half of month', () => {
      expect(TipGrouper.getGroupKey('2024-01-05')).toBe('2024-1-1');
      expect(TipGrouper.getGroupKey('2024-01-15')).toBe('2024-1-1');
      expect(TipGrouper.getGroupKey('2024-01-01')).toBe('2024-1-1');
    });

    it('should return correct key for second half of month', () => {
      expect(TipGrouper.getGroupKey('2024-01-16')).toBe('2024-1-2');
      expect(TipGrouper.getGroupKey('2024-01-31')).toBe('2024-1-2');
      expect(TipGrouper.getGroupKey('2024-02-20')).toBe('2024-2-2');
    });

    it('should handle different years and months', () => {
      expect(TipGrouper.getGroupKey('2023-12-10')).toBe('2023-12-1');
      expect(TipGrouper.getGroupKey('2025-06-25')).toBe('2025-6-2');
    });
  });

  describe('createEmptyGroup', () => {
    it('should create a reactive group with correct structure', () => {
      const group = TipGrouper.createEmptyGroup('2024-1-1');

      expect(group).toEqual({
        period: '2024-1-1',
        tips: [],
        total: 0
      });
    });

    it('should preserve the key as period', () => {
      const testKey = 'test-key-123';
      const group = TipGrouper.createEmptyGroup(testKey);

      expect(group.period).toBe(testKey);
    });
  });

  describe('findInsertionIndex', () => {
    it('should return 0 for tip with latest date', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(200, '2024-01-02', 'Floor', 'Lunch')
      ];
      const newTip = new Tip(150, '2024-01-03', 'Floor', 'Lunch');

      expect(TipGrouper.findInsertionIndex(tips, newTip)).toBe(0);
    });

    it('should return correct index for tip in middle', () => {
      const tips = [
        new Tip(100, '2024-01-03', 'Floor', 'Lunch'),
        new Tip(200, '2024-01-01', 'Floor', 'Lunch')
      ];
      const newTip = new Tip(150, '2024-01-02', 'Floor', 'Lunch');

      expect(TipGrouper.findInsertionIndex(tips, newTip)).toBe(1);
    });

    it('should return length for tip with earliest date', () => {
      const tips = [
        new Tip(100, '2024-01-02', 'Floor', 'Lunch'),
        new Tip(200, '2024-01-03', 'Floor', 'Lunch')
      ];
      const newTip = new Tip(150, '2024-01-01', 'Floor', 'Lunch');

      expect(TipGrouper.findInsertionIndex(tips, newTip)).toBe(2);
    });

    it('should return 0 for empty array', () => {
      const tips = [];
      const newTip = new Tip(150, '2024-01-01', 'Floor', 'Lunch');

      expect(TipGrouper.findInsertionIndex(tips, newTip)).toBe(0);
    });
  });

  describe('calculateGroupTotal', () => {
    it('should return 0 for empty array', () => {
      expect(TipGrouper.calculateGroupTotal([])).toBe(0);
    });

    it('should calculate correct total for single tip', () => {
      const tips = [new Tip(100, '2024-01-01', 'Floor', 'Lunch')];
      expect(TipGrouper.calculateGroupTotal(tips)).toBe(100);
    });

    it('should calculate correct total for multiple tips', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(150, '2024-01-02', 'Banquet', 'Dinner'),
        new Tip(200, '2024-01-03', 'Floor', 'Lunch')
      ];
      expect(TipGrouper.calculateGroupTotal(tips)).toBe(450);
    });
  });

  describe('sortAllTipsByDate', () => {
    it('should sort tips by date in descending order (newest first)', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(200, '2024-01-03', 'Banquet', 'Dinner'),
        new Tip(150, '2024-01-02', 'Floor', 'Lunch')
      ];

      TipGrouper.sortAllTipsByDate(tips);

      expect(tips[0].date).toBe('2024-01-03');
      expect(tips[1].date).toBe('2024-01-02');
      expect(tips[2].date).toBe('2024-01-01');
    });

    it('should put lunch before dinner if dates are the same', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(200, '2024-01-01', 'Banquet', 'Dinner'),
        new Tip(150, '2024-01-02', 'Floor', 'Lunch')
      ];

      TipGrouper.sortAllTipsByDate(tips);

      expect(tips[0].date).toBe('2024-01-02');
      expect(tips[1].date).toBe('2024-01-01');
      expect(tips[2].date).toBe('2024-01-01');

      expect(tips[0].shift).toBe('Lunch');
      expect(tips[1].shift).toBe('Dinner');
      expect(tips[2].shift).toBe('Lunch');

    });

    it('should handle empty array', () => {
      const tips = [];
      expect(() => TipGrouper.sortAllTipsByDate(tips)).not.toThrow();
      expect(tips).toEqual([]);
    });
  });

  describe('groupBy', () => {
    it('should group tips by custom key extractor', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(150, '2024-01-02', 'Floor', 'Dinner'),
        new Tip(200, '2024-01-03', 'Banquet', 'Lunch')
      ];

      const groups = TipGrouper.groupBy(tips, (tip) => tip.type);

      expect(groups).toHaveLength(2);

      const floorGroup = groups.find(g => g.period === 'Floor');
      const banquetGroup = groups.find(g => g.period === 'Banquet');

      expect(floorGroup.tips).toHaveLength(2);
      expect(floorGroup.total).toBe(250);
      expect(banquetGroup.tips).toHaveLength(1);
      expect(banquetGroup.total).toBe(200);
    });

    it('should handle empty tips array', () => {
      const groups = TipGrouper.groupBy([], (tip) => tip.type);
      expect(groups).toEqual([]);
    });
  });

  describe('groupByPeriod', () => {
    it('should group tips by period (half-month)', () => {
      const tips = [
        new Tip(100, '2024-01-05', 'Floor', 'Lunch'),   // 2024-1-1
        new Tip(150, '2024-01-15', 'Banquet', 'Dinner'), // 2024-1-1
        new Tip(200, '2024-01-20', 'Floor', 'Lunch'),   // 2024-1-2
        new Tip(250, '2024-02-10', 'Banquet', 'Dinner') // 2024-2-1
      ];

      const groups = TipGrouper.groupByPeriod(tips);

      expect(groups).toHaveLength(3);

      const jan1 = groups.find(g => g.period === '2024-1-1');
      const jan2 = groups.find(g => g.period === '2024-1-2');
      const feb1 = groups.find(g => g.period === '2024-2-1');

      expect(jan1.tips).toHaveLength(2);
      expect(jan1.total).toBe(250);
      expect(jan2.tips).toHaveLength(1);
      expect(jan2.total).toBe(200);
      expect(feb1.tips).toHaveLength(1);
      expect(feb1.total).toBe(250);
    });
  });

  describe('groupByYear', () => {
    it('should group tips by year', () => {
      const tips = [
        new Tip(100, '2023-12-30', 'Floor', 'Lunch'),
        new Tip(150, '2024-01-15', 'Banquet', 'Dinner'),
        new Tip(200, '2024-06-20', 'Floor', 'Lunch'),
        new Tip(250, '2025-02-10', 'Banquet', 'Dinner')
      ];

      const groups = TipGrouper.groupByYear(tips);

      expect(groups).toHaveLength(3);

      const year2023 = groups.find(g => g.period === '2023');
      const year2024 = groups.find(g => g.period === '2024');
      const year2025 = groups.find(g => g.period === '2025');

      expect(year2023.tips).toHaveLength(1);
      expect(year2023.total).toBe(100);
      expect(year2024.tips).toHaveLength(2);
      expect(year2024.total).toBe(350);
      expect(year2025.tips).toHaveLength(1);
      expect(year2025.total).toBe(250);
    });
  });

  describe('groupByDayOfWeek', () => {
    it('should group tips by day of week', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),    // Monday
        new Tip(150, '2024-01-02', 'Banquet', 'Dinner'),  // Tuesday
        new Tip(200, '2024-01-08', 'Floor', 'Lunch'),    // Monday
        new Tip(250, '2024-01-03', 'Banquet', 'Dinner')  // Wednesday
      ];

      const groups = TipGrouper.groupByDayOfWeek(tips);

      expect(groups).toHaveLength(3);

      const monday = groups.find(g => g.period === 'Monday');
      const tuesday = groups.find(g => g.period === 'Tuesday');
      const wednesday = groups.find(g => g.period === 'Wednesday');

      expect(monday.tips).toHaveLength(2);
      expect(monday.total).toBe(300);
      expect(tuesday.tips).toHaveLength(1);
      expect(tuesday.total).toBe(150);
      expect(wednesday.tips).toHaveLength(1);
      expect(wednesday.total).toBe(250);
    });
  });

  describe('groupByShift', () => {
    it('should group tips by shift', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(150, '2024-01-02', 'Banquet', 'Dinner'),
        new Tip(200, '2024-01-03', 'Floor', 'Lunch'),
        new Tip(250, '2024-01-04', 'Banquet', 'Dinner')
      ];

      const groups = TipGrouper.groupByShift(tips);

      expect(groups).toHaveLength(2);

      const lunch = groups.find(g => g.period === 'Lunch');
      const dinner = groups.find(g => g.period === 'Dinner');

      expect(lunch.tips).toHaveLength(2);
      expect(lunch.total).toBe(300);
      expect(dinner.tips).toHaveLength(2);
      expect(dinner.total).toBe(400);
    });
  });

  describe('groupByType', () => {
    it('should group tips by type', () => {
      const tips = [
        new Tip(100, '2024-01-01', 'Floor', 'Lunch'),
        new Tip(150, '2024-01-02', 'Banquet', 'Dinner'),
        new Tip(200, '2024-01-03', 'Floor', 'Lunch'),
        new Tip(250, '2024-01-04', 'Banquet', 'Dinner')
      ];

      const groups = TipGrouper.groupByType(tips);

      expect(groups).toHaveLength(2);

      const floor = groups.find(g => g.period === 'Floor');
      const banquet = groups.find(g => g.period === 'Banquet');

      expect(floor.tips).toHaveLength(2);
      expect(floor.total).toBe(300);
      expect(banquet.tips).toHaveLength(2);
      expect(banquet.total).toBe(400);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex grouping scenarios', () => {
      const tips = sampleTips;

      // Test multiple grouping methods work together
      const periodGroups = TipGrouper.groupByPeriod(tips);
      const yearGroups = TipGrouper.groupByYear(tips);
      const shiftGroups = TipGrouper.groupByShift(tips);

      expect(periodGroups.length).toBeGreaterThan(0);
      expect(yearGroups.length).toBeGreaterThan(0);
      expect(shiftGroups.length).toBeGreaterThan(0);

      // Verify totals are consistent
      const totalFromPeriods = periodGroups.reduce((sum, group) => sum + group.total, 0);
      const totalFromYears = yearGroups.reduce((sum, group) => sum + group.total, 0);
      const totalFromShifts = shiftGroups.reduce((sum, group) => sum + group.total, 0);

      expect(totalFromPeriods).toBe(totalFromYears);
      expect(totalFromYears).toBe(totalFromShifts);
    });

    it('should handle edge cases gracefully', () => {
      // Test with empty array
      expect(TipGrouper.groupByPeriod([])).toEqual([]);
      expect(TipGrouper.groupByYear([])).toEqual([]);
      expect(TipGrouper.groupByShift([])).toEqual([]);
      expect(TipGrouper.groupByType([])).toEqual([]);
      expect(TipGrouper.groupByDayOfWeek([])).toEqual([]);
    });
  });
});