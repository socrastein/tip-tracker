import { expect, test } from "vitest";
import { Tip } from "./ClassTip";
import { generateMockTips } from "./MockTips";
import { TipMemory } from "./TipMemory";

test('Creates a new tip object and checks property values', () => {
    expect(() => new Tip(-1, "2025-08-29")).toThrow();
    expect(() => new Tip(20, "2025-08-29", "breakfast")).toThrow();
    expect(() => new Tip(20, "2025-08-29", "Banquet", "breakfast")).toThrow();
    expect(() => new Tip(20, "2025-08-29", "Banquet", "Dinner")).not.toThrow();
});

test('Runs isStoredDataATip against true and false values', () => {
    expect(TipMemory.isStoredDataATip("themeColor")).toBe(false);
    expect(TipMemory.isStoredDataATip("2025-02-07")).toBe(true);
    expect(TipMemory.isStoredDataATip("2025-02-07")).toBe(true);
    expect(TipMemory.isStoredDataATip("2025-02-07 2")).toBe(true);
    expect(TipMemory.isStoredDataATip("Mon Aug 29")).toBe(false);
    expect(TipMemory.isStoredDataATip("tipTracker(Stored Tip).2025-08-29.Dinner")).toBe(true);
});

test('Creates mock tip objects and checks for validity', () => {
    generateMockTips(100);
    expect(TipMemory.getLengthOfAllTips()).toBe(100);
});

test('Checks that legacy tips are properly loaded and updated', () => {

    const legacyTest1 = { key: "2025-02-07", value: "242.2025-02-07.Banquet.Card.8.5" };
    const legacyTest2 = { key: "2025-02-10", value: "135.2025-02-10.Floor.Card.6" };
    const legacyTest3 = { key: "2025-02-11", value: "120.2025-02-11.Floor.Card.7" };
    const legacyTest4 = { key: "2025-06-26", value: "300.2025-06-26.Floor.Card." };
    const legacyTest5 = { key: "2025-09-01", value: "125.2025-09-01.Banquet.Card." };
    const legacyTest6 = { key: "2025-05-26", value: "50.2025-05-26.Banquet.Card." };
    const legacyTest7 = { key: "2025-05-26 2", value: "100.2025-05-26.Banquet.Card." };
    const legacyTest8 = { key: "2025-05-26 3", value: "124.2025-05-26.Floor.Card." };

    const legacyTest9 = { key: "2025-05-26 3", value: "red.2025-05-26.Floor.Card." };
    const legacyTest10 = { key: "2025-05-26 3", value: "124.2025-05-26" };

    expect(() => TipMemory.loadStoredLegacyTip(legacyTest1.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest2.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest3.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest4.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest5.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest6.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest7.value)).not.toThrow();
    expect(() => TipMemory.loadStoredLegacyTip(legacyTest8.value)).not.toThrow();
});