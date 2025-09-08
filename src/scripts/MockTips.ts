import { Tip } from "./ClassTip";
import { TipMemory } from "./TipMemory";
import { getYearMonthDayString, daysAgo } from "./Dates";

export function generateMockTips(numberOfTips: number) {
  const startDate = daysAgo(numberOfTips + Math.floor(numberOfTips / 2));
  const endDate = new Date(new Date().toLocaleString());

  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  for (let i = 0; i < numberOfTips; i++) {
    let amount = getRandomAmount(125, 500);
    let date = getRandomDate(startTimestamp, endTimestamp);
    let type = getRandomType();
    let shift = getRandomShift();

    // Generate new date if a tip already exists with that date
    while (TipMemory.allTips.find((tip) => tip.date === date) !== undefined) {
      date = getRandomDate(startTimestamp, endTimestamp);
    }

    const tip = new Tip(amount, date, type, shift);

    TipMemory.loadTipObject(tip);
  }
  console.log(`${numberOfTips} mock tips created`);
  console.log(TipMemory.getLengthOfAllTips() + " tips loaded into memory.");
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


