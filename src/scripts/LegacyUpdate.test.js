import { expect, test, beforeEach } from "vitest";
import { TipMemory } from "./TipMemory";
import { stringifiedBackup } from "./BackupTips";

const parsedBackup = JSON.parse(stringifiedBackup);

beforeEach(() => {
    TipMemory.allTips = [];
    TipMemory.legacyTips = [];
});

test('Loads backup tips and identifies them all as valid tips', () => {
    let invalidCount = 0;
    Object.entries(parsedBackup).forEach(([key, value]) => {
        let isValid = TipMemory.isStoredDataATip(key);
        if (!isValid) {
            invalidCount++;
            console.log(`Invalid tip entry: ${key} ${value}`);
        }
    }
    );
    expect(invalidCount).toEqual(1);
});

test('Insantiates all legacy tips as new Tip objects', () => {
    expect(() => Object.entries(parsedBackup).forEach(([key, value]) => {
        if (key === "themeColor") {
            return;
        }
        TipMemory.loadStoredLegacyTip(value);
    })).not.toThrow();
});

test('Loads legacy tips and checks that there are max 2 for any date', () => {
    let mostSameDayTips = 0;
    Object.entries(parsedBackup).forEach(([key, value]) => {
        if (key.length > 10) {
            let i = parseInt(key.substring(10));
            if (i > mostSameDayTips) mostSameDayTips = i;
        }
    });
    expect(mostSameDayTips).toBeLessThanOrEqual(2);
});

test('Compares duplicate legacy entries to assign the lower tip.amount to lunch shift', () => {

    Object.entries(parsedBackup).forEach(([key, value]) => {
        if (!TipMemory.isStoredDataATip(key)) return;
        TipMemory.loadStoredLegacyTip(value);
    });

    TipMemory.editLegacyDuplicates();

    TipMemory.legacyTips.forEach(tip => {
        if (tip.shift === "Lunch") {
            let dinner = TipMemory.legacyTips.find(other => (other.date === tip.date && other.shift === "Dinner"));
            expect(dinner.amount).toBeGreaterThanOrEqual(tip.amount);
        }
    });
});