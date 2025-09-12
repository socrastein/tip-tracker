import { Tip } from "./ClassTip";

export const TipAnalyzer = {
  getLengthOfTips: function (tips: Tip[]) {
    return tips.length;
  },

  getLargestTip: function (tips: Tip[]) {
    let highest = tips[0];
    if (!highest) {
      throw new Error("Tip array is empty");
    }

    tips.forEach((tip: Tip) => {
      if (tip.amount > highest.amount) {
        highest = tip;
      }
    });

    return highest;
  },

  getLowestTip: function (tips: Tip[]) {
    let lowest = tips[0];
    if (!lowest) {
      throw new Error("Tip array is empty");
    }

    tips.forEach((tip: Tip) => {
      if (tip.amount < lowest.amount) {
        lowest = tip;
      }
    });

    return lowest;
  },

  getPercentageDifference(num1: number, num2: number) {
    return Math.floor((num1 / num2) * 100);
  },
};
