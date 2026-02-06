import { Tip } from "../scripts/ClassTip";
import { getYearMonthDayString, daysAgo } from "../scripts/Dates";

export function mockTip(
  amount: number,
  date = "2025-09-10",
  type = "Banquet",
  shift = "Dinner",
) {
  return new Tip(amount, date, type, shift);
}

export function generateMockTips(numberOfTips: number) {
  const mockTips = [] as Tip[];

  const startDate = daysAgo(numberOfTips + Math.floor(numberOfTips / 2));
  const endDate = new Date(new Date().toLocaleString());

  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  for (let i = 0; i < numberOfTips; i++) {
    let amount = getRandomAmount(50, 400);
    let date = getRandomDate(startTimestamp, endTimestamp);
    let type = getRandomType();
    let shift = getRandomShift();

    // Generate new date if a tip already exists with that date
    while (mockTips.find((tip) => tip.date === date) !== undefined) {
      date = getRandomDate(startTimestamp, endTimestamp);
    }

    const tip = new Tip(amount, date, type, shift);

    mockTips.push(tip);
  }
  return mockTips;
}

//

function getRandomAmount(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(startTime: number, endTime: number) {
  const randomTimestamp = startTime + Math.random() * (endTime - startTime);
  return getYearMonthDayString(randomTimestamp);
}

function getRandomType() {
  let randInt = Math.random();
  return randInt > 0.4 ? "Banquet" : "Floor";
}

function getRandomShift() {
  let randInt = Math.random();
  return randInt > 0.1 ? "Dinner" : "Lunch";
}
