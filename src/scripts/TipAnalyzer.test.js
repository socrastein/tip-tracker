import { expect, test } from "vitest";
import { Tip } from "./ClassTip";
import { TipAnalyzer } from "./TipAnalyzer";

test("Checks percentage calculations", () => {
  expect(TipAnalyzer.getPercentageDifference(100, 50)).toEqual(200);
  expect(TipAnalyzer.getPercentageDifference(100, 33.33)).toEqual(300);
  expect(TipAnalyzer.getPercentageDifference(50, 100)).toEqual(50);
});

const testTip1 = new Tip(100, "2025-9-10", "Banquet", "Dinner");
const testTip2 = new Tip(200, "2025-9-10", "Banquet", "Dinner");
const testTip3 = new Tip(300, "2025-9-10", "Banquet", "Dinner");
const testTip4 = new Tip(300, "2025-9-10", "Banquet", "Dinner");
const testTip5 = new Tip(301, "2025-9-10", "Banquet", "Dinner");

const tips = [testTip1, testTip2, testTip3, testTip4, testTip5];

test("Checks highest and lowest calculations", () => {
  expect(TipAnalyzer.getLargestTip(tips)).toBe(testTip5);
  expect(TipAnalyzer.getLowestTip(tips)).toBe(testTip1);
});
