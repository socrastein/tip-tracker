/// <reference types="vitest" />
/** @vitest-environment node  */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TipStore } from "../../scripts/TipStore";
import { Tip } from "../../scripts/ClassTip";
import { setupMockLocalStorage } from "../MockLocalStorage";

// Mock Vue's reactive function
vi.mock("vue", () => ({
  reactive: vi.fn((obj) => obj),
}));

describe("TipStore", () => {
  let sampleTips;
  let sampleGroups;
  setupMockLocalStorage();

  beforeEach(() => {
    localStorage.clear();
    // Create sample tips for testing
    sampleTips = [
      new Tip(100, "2024-01-05", "Floor", "Lunch"),
      new Tip(175, "2024-01-05", "Banquet", "Dinner"),
      new Tip(150, "2024-01-15", "Banquet", "Dinner"),
      new Tip(200, "2024-01-20", "Floor", "Lunch"),
      new Tip(250, "2024-02-10", "Banquet", "Dinner"),
      new Tip(300, "2024-02-25", "Floor", "Lunch"),
    ];

    sampleGroups = [
      {
        period: "2024-01-2",
        tips: [
          new Tip(300, "2024-01-20", "Floor", "Lunch"),
          new Tip(200, "2024-01-25", "Banquet", "Dinner"),
        ],
        total: 500,
      },
      {
        period: "2024-01-1",
        tips: [
          new Tip(100, "2024-01-05", "Floor", "Lunch"),
          new Tip(150, "2024-01-15", "Banquet", "Dinner"),
        ],
        total: 250,
      },
    ];
    // Clear tips and groups array
    TipStore.setAllTips([]);
    TipStore.setGroupedTips([]);
  });

  describe("setAllTips", () => {
    it("should set tip array and show correct length", () => {
      TipStore.setAllTips(sampleTips);
      expect(TipStore._tipState.allTips).toEqual(sampleTips);
      expect(TipStore._tipState.allTips.length).toEqual(6);
    });

    it("should replace array with new one", () => {
      TipStore.setAllTips(sampleTips);
      const newArray = [
        new Tip(150, "2025-09-12", "Floor", "Dinner"),
        new Tip(250, "2025-09-10", "Banquet", "Dinner"),
      ];
      TipStore.setAllTips(newArray);
      expect(TipStore._tipState.allTips).toEqual(newArray);
      expect(TipStore._tipState.allTips.length).toEqual(2);
    });
  });

  describe("setGroupedTips", () => {
    it("should set group array and show correct length", () => {
      TipStore.setGroupedTips(sampleGroups);
      expect(TipStore._tipState.groupedTips).toEqual(sampleGroups);
      expect(TipStore._tipState.groupedTips.length).toEqual(2);
    });

    it("should replace array with new one", () => {
      TipStore.setGroupedTips(sampleGroups);
      const newArray = [{ period: "2025-01-1", tips: [], total: 0 }];
      TipStore.setGroupedTips(newArray);
      expect(TipStore._tipState.groupedTips).toEqual(newArray);
      expect(TipStore._tipState.groupedTips.length).toEqual(1);
    });
  });

  describe("getAllTips", () => {
    it("should return the same array just set", () => {
      TipStore.setAllTips(sampleTips);
      expect(TipStore.getAllTips()).toEqual(sampleTips);
    });
  });

  describe("getGroupedTips", () => {
    it("should return the same array just set", () => {
      TipStore.setGroupedTips(sampleGroups);
      expect(TipStore._tipState.groupedTips).toEqual(sampleGroups);
    });
  });

  describe("getLengthOfAllTips", () => {
    it("correctly updates length as elements change", () => {
      TipStore.setAllTips(sampleTips);
      expect(TipStore._tipState.allTips.length).toEqual(6);
      TipStore._tipState.allTips.pop();
      expect(TipStore._tipState.allTips.length).toEqual(5);
    });
  });

  describe("getLengthOfGroupedTips", () => {
    it("", () => {
      TipStore.setGroupedTips(sampleGroups);
      expect(TipStore._tipState.groupedTips.length).toEqual(2);
      TipStore._tipState.groupedTips.pop();
      expect(TipStore._tipState.groupedTips.length).toEqual(1);
    });
  });

  const consoleSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => undefined);

  describe("logAllTipsToConsole", () => {
    it("logs every tip in allTips", () => {
      TipStore.setAllTips(sampleTips);
      TipStore.logAllTipsToConsole();
      expect(consoleSpy).toHaveBeenCalledTimes(7);
      consoleSpy.mockReset();
    });

    it("logs tips up to the limit passed", () => {
      TipStore.setAllTips(sampleTips);
      TipStore.logAllTipsToConsole(3);
      expect(consoleSpy).toHaveBeenCalledTimes(4);
      consoleSpy.mockReset();
    });
  });

  describe("logGroupedTipsToConsole", () => {
    // const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    it("logs every group in groupedTips", () => {
      TipStore.setGroupedTips(sampleGroups);
      TipStore.logGroupedTipsToConsole();
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockReset();
    });

    it("logs groups up to the limit passed", () => {
      TipStore.setGroupedTips(sampleGroups);
      TipStore.logGroupedTipsToConsole(1);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe("findGroupByKey", () => {
    it("returns the correct group by key", () => {
      TipStore.setGroupedTips(sampleGroups);
      const group = TipStore.findGroupByKey("2024-01-2");
      expect(group).toEqual(sampleGroups[0]);
    });

    it("returns undefined if no group matches key", () => {
      const group = TipStore.findGroupByKey("2024-05-1");
      expect(group).toEqual(undefined);
    });
  });

  describe("insertGroupInOrder", () => {
    it("places earliest group at end of array", () => {
      const newGroup = {
        period: "2023-12-2",
        tips: [],
        total: 0,
      };
      TipStore.setGroupedTips(sampleGroups);
      TipStore.insertGroupInOrder(newGroup);
      expect(TipStore._tipState.groupedTips[2]).toEqual(newGroup);
    });

    it("places group at correct spot between others", () => {
      TipStore.setGroupedTips(sampleGroups);
      const firstGroup = {
        period: "2023-12-2",
        tips: [],
        total: 0,
      };
      const insertedGroup = {
        period: "2023-12-1",
        tips: [],
        total: 0,
      };
      const secondGroup = {
        period: "2023-11-2",
        tips: [],
        total: 0,
      };

      TipStore.insertGroupInOrder(firstGroup);
      expect(TipStore._tipState.groupedTips[2]).toEqual(firstGroup);
      TipStore.insertGroupInOrder(secondGroup);
      expect(TipStore._tipState.groupedTips[3]).toEqual(secondGroup);

      TipStore.insertGroupInOrder(insertedGroup);
      expect(TipStore._tipState.groupedTips[3]).toEqual(insertedGroup);
      expect(TipStore._tipState.groupedTips[4]).toEqual(secondGroup);
    });
  });

  describe("removeTipFromGroup", () => {
    it("removes the right tip without touching others", () => {
      TipStore.setGroupedTips(sampleGroups);
      const targetGroup = TipStore._tipState.groupedTips[1];
      const tipToRemove = targetGroup.tips[0];

      TipStore.removeTipFromGroup(tipToRemove, targetGroup);
      expect(targetGroup.tips.length).toBe(1);
    });

    it("throws error if tip not in group", () => {
      TipStore.setGroupedTips(sampleGroups);
      const tip = new Tip(225, "2025-09-13", "Banquet", "Dinner");
      const targetGroup = TipStore._tipState.groupedTips[0];
      expect(() => TipStore.removeTipFromGroup(tip, targetGroup)).toThrow();
    });

    it("removes empty group when last tip in group is removed", () => {
      TipStore.setGroupedTips(sampleGroups);
      const targetGroup = TipStore._tipState.groupedTips[0];
      const tip1 = targetGroup.tips[0];
      const tip2 = targetGroup.tips[1];
      TipStore.removeTipFromGroup(tip1, targetGroup);
      expect(TipStore._tipState.groupedTips.includes(targetGroup)).toBe(true);
      TipStore.removeTipFromGroup(tip2, targetGroup);
      expect(TipStore._tipState.groupedTips.includes(targetGroup)).toBe(false);
    });
  });

  describe("addTip", () => {
    const tip = new Tip(100, "2024-01-05", "Floor", "Lunch");

    it("adds tip to allTips array", () => {
      TipStore.addTip(tip);
      expect(TipStore._tipState.allTips.includes(tip)).toBe(true);
    });

    it("creates new group when needed", () => {
      expect(TipStore._tipState.groupedTips.length).toBe(0);
      TipStore.addTip(tip);
      expect(TipStore._tipState.groupedTips.length).toBe(1);
    });

    it("finds correct group for new tip", () => {
      TipStore.addTip(tip);
      expect(TipStore._tipState.groupedTips.length).toBe(1);
      expect(TipStore._tipState.groupedTips[0].tips).toContain(tip);

      const newTip = new Tip(100, "2024-01-06", "Floor", "Lunch");
      TipStore.addTip(newTip);
      expect(TipStore._tipState.groupedTips.length).toBe(1);
      expect(TipStore._tipState.groupedTips[0].tips).toContain(newTip);
    });

    it("inserts tip in correct order", () => {
      const newTip = new Tip(100, "2024-01-07", "Floor", "Lunch");
      const insertedTip = new Tip(100, "2024-01-06", "Floor", "Lunch");

      TipStore.addTip(tip);
      TipStore.addTip(newTip);
      TipStore.addTip(insertedTip);

      const group = TipStore._tipState.groupedTips[0];
      expect(group.tips[0]).toBe(newTip);
      expect(group.tips[1]).toBe(insertedTip);
      expect(group.tips[2]).toBe(tip);
    });

    it("throws error if same tip is added twice", () => {
      TipStore.addTip(tip);
      expect(() => TipStore.addTip(tip)).toThrow();
    });

    it("throws error if another tip under same date and shift is found", () => {
      TipStore.addTip(tip);
      const duplicate = new Tip(250, "2024-01-05", "Banquet", "Lunch");
      expect(() => TipStore.addTip(duplicate)).toThrow();
    });
  });

  describe("removeTip", () => {
    const tip = new Tip(100, "2024-01-05", "Floor", "Lunch");

    it("throws error if tip not found in allTips", () => {
      const newTip = new Tip(100, "2024-01-07", "Floor", "Lunch");
      expect(() => TipStore.removeTip(newTip)).toThrow();
    });

    it("removes tip from allTips", () => {
      TipStore.addTip(tip);
      expect(TipStore._tipState.allTips.includes(tip)).toBe(true);
      TipStore.removeTip(tip);
      expect(TipStore._tipState.allTips.includes(tip)).toBe(false);
    });

    it("removes tip without touching other tips in allTips", () => {
      const length = sampleTips.length;
      for (let i = 0; i < length; i++) {
        TipStore.addTip(sampleTips[i]);
      }
      expect(TipStore._tipState.allTips.length).toBe(6);

      const tipToRemove = TipStore._tipState.allTips[3];
      expect(TipStore._tipState.allTips.includes(tipToRemove)).toBe(true);

      TipStore.removeTip(tipToRemove);
      expect(TipStore._tipState.allTips.includes(tipToRemove)).toBe(false);
      expect(TipStore._tipState.allTips.length).toBe(5);
    });

    it("removes tip from appropriate group.tips", () => {
      const length = sampleTips.length;
      for (let i = 0; i < length; i++) {
        TipStore.addTip(sampleTips[i]);
      }

      const targetTip = TipStore._tipState.groupedTips[3].tips[1];
      expect(TipStore._tipState.groupedTips[3].tips.includes(targetTip)).toBe(
        true,
      );

      TipStore.removeTip(targetTip);
      expect(TipStore._tipState.groupedTips[3].tips.includes(targetTip)).toBe(
        false,
      );
    });
  });

  describe("editTip", () => {
    const tip = new Tip(100, "2024-01-05", "Floor", "Lunch");
    it("replaces old tip with new tip containing the correct values", () => {
      TipStore.addTip(tip);
      const newValues = {
        amount: 200,
        date: "2025-01-05",
        type: "Banquet",
        shift: "Dinner",
      };
      expect(TipStore._tipState.allTips[0]).toBe(tip);

      TipStore.editTip(tip, newValues);
      const changedTip = TipStore._tipState.allTips[0];

      expect(changedTip.amount).toBe(200);
      expect(changedTip.date).toBe("2025-01-05");
      expect(changedTip.type).toBe("Banquet");
      expect(changedTip.shift).toBe("Dinner");

      expect(TipStore._tipState.allTips.includes(tip)).toBe(false);
    });
  });

  describe("checkForDuplicateTip", () => {
    // sampleTips[0] = new Tip(100, '2024-01-05', 'Floor', 'Lunch'),
    let duplicate;
    it("returns matching tip in allTips", () => {
      TipStore.setAllTips(sampleTips);

      duplicate = TipStore.checkForDuplicateTip("2024-01-05", "Lunch");
      expect(duplicate).not.toBe(null);
    });

    it("returns null for same date but different shift", () => {
      duplicate = TipStore.checkForDuplicateTip("2024-01-05", "Dinner");
      expect(duplicate).toBe(null);
    });

    it("returns null for unique date", () => {
      duplicate = TipStore.checkForDuplicateTip("2025-09-13", "Lunch");
      expect(duplicate).toBe(null);
    });
  });
});
