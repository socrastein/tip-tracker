import { Tip } from "./ClassTip";
import { TipGrouper } from "./TipGrouper";

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

    return highest.amount;
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

    return lowest.amount;
  },

  getAverageTip: function (tips: Tip[]) {
    const total = TipGrouper.calculateGroupTotal(tips);
    return Math.floor(total / tips.length);
  },

  getMedianTip: function (tips: Tip[]) {
    const sorted = tips.slice().sort((a, b) => {
      const tipA = a.amount;
      const tipB = b.amount;

      return tipA - tipB;
    });

    const length = sorted.length;

    const isEven = length % 2 === 0;

    let middleValue: number;
    if (isEven) {
      const middle1 = sorted[length / 2 - 1];
      const middle2 = sorted[length / 2];
      middleValue = (middle1.amount + middle2.amount) / 2;
    } else {
      middleValue = sorted[(length - 1) / 2].amount;
    }

    return middleValue.toFixed(0);
  },

  getPercentageDifference(num1: number, num2: number) {
    return Math.floor((num1 / num2) * 100);
  },
};
