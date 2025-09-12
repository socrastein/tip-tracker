import { reactive } from "vue";

import { Tip } from "./ClassTip";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const TipGrouper = {
  getGroupKey: function (date: string) {
    const [year, month, day] = date.split("-").map(Number);
    const half = day <= 15 ? "1" : "2";
    return `${year}-${month}-${half}`;
  },

  createEmptyGroup: function (key: string) {
    const group = reactive({ period: key, tips: [], total: 0 });
    return group;
  },

  findInsertionIndex: function (groupTips: Tip[], tip: Tip) {
    const tipIndex = groupTips.findIndex(
      (existingTip: Tip) => existingTip.date < tip.date
    );
    return tipIndex === -1 ? groupTips.length : tipIndex;
  },

  calculateGroupTotal: function (groupTips: Tip[]) {
    let total = 0;
    groupTips.forEach((tip: Tip) => {
      total += tip.amount;
    });
    return total;
  },

  calculateGroupAverage: function (groupTips: Tip[]) {
    const total = this.calculateGroupTotal(groupTips);
    return Math.floor(total / groupTips.length);
  },

  sortAllTipsByDate: function (tips: Tip[]) {
    tips.sort(function (a: Tip, b: Tip) {
      let date1 = Number(a.date.replaceAll("-", ""));
      let date2 = Number(b.date.replaceAll("-", ""));

      return date2 - date1;
    });
  },

  // Generic grouping function that takes a function for
  // creating group keys from tip objects.
  groupBy: function (tips: Tip[], keyExtractor: (tip: Tip) => string) {
    const groups = {};
    tips.forEach((tip: Tip) => {
      const key = keyExtractor(tip); // call the function passed in
      if (!groups[key]) {
        groups[key] = reactive({ period: key, tips: [], total: 0 });
      }
      groups[key].tips.push(tip);
      groups[key].total += tip.amount;
    });
    return Object.values(groups);
  },

  groupByPeriod: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => this.getGroupKey(tip.date));
  },

  groupByYear: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => tip.date.substring(0, 4));
  },

  groupByDayOfWeek: function (tips: Tip[]) {
    return this.groupBy(
      tips,
      (tip: Tip) => dayNames[new Date(tip.date).getDay()]
    );
  },

  groupByShift: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => tip.shift);
  },
  groupByType: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => tip.type);
  },
};
