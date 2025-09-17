import { reactive } from "vue";

import { Tip } from "./ClassTip";
import { TipAnalyzer } from "./TipAnalyzer";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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

  sortAllTipsByDate: function (tips: Tip[]) {
    tips.sort(function (a: Tip, b: Tip) {
      let date1 = Number(a.date.replaceAll("-", ""));
      let date2 = Number(b.date.replaceAll("-", ""));

      if (date1 === date2) {
        // Place Dinner shift later than Lunch if dates are the same
        return a.shift === "Dinner" ? -1 : 1;
      }
      return date2 - date1;
    });
  },

  getYear(dateString: string) {
    return dateString.substring(0, 4);
  },

  getMonthName(dateString: string) {
    const [year, month] = dateString.split("-").map(Number);
    return monthNames[month - 1];
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
    return Object.values(groups).map((group: any) => ({
      ...group,
      average: TipAnalyzer.getAverageTip(group.tips),
      median: TipAnalyzer.getMedianTip(group.tips),
      highest: TipAnalyzer.getLargestTip(group.tips),
      lowest: TipAnalyzer.getLowestTip(group.tips),
    }));
  },

  groupByPeriod: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => this.getGroupKey(tip.date));
  },

  groupByYear: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => this.getYear(tip.date));
  },

  groupByMonth: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => this.getMonthName(tip.date));
  },

  groupByYearAndMonth: function (tips: Tip[]) {
    const monthGroups = this.groupBy(tips, (tip: Tip) => {
      const year = this.getYear(tip.date);
      const month = this.getMonthName(tip.date);
      return `${year}-${month}`;
    });
    return this.nestGroupsByYear(monthGroups);
  },

  groupByDayOfWeek: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => {
      // Parse the date as local time instead of UTC
      const [year, month, day] = tip.date.split("-").map(Number);
      const localDate = new Date(year, month - 1, day); // month is 0-indexed
      return dayNames[localDate.getDay()];
    });
  },

  groupByShift: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => tip.shift);
  },
  groupByType: function (tips: Tip[]) {
    return this.groupBy(tips, (tip: Tip) => tip.type);
  },

  nestGroupsByYear: function (groups: any) {
    const nestedGroups = {};

    groups.forEach((group: any) => {
      const key = this.getYear(group.period);
      if (!nestedGroups[key]) {
        nestedGroups[key] = {
          period: key,
          months: [],
          maxTotal: 0,
          maxHighest: 0,
          maxAverage: 0,
          leastLowest: Infinity,
        };
      }

      // Strip year off front of period key for month label
      group.period = group.period.split("-")[1];
      nestedGroups[key].months.push(group);

      // Update peak values for the year
      if (group.total > nestedGroups[key].maxTotal) {
        nestedGroups[key].maxTotal = group.total;
      }
      if (group.highest > nestedGroups[key].maxHighest) {
        nestedGroups[key].maxHighest = group.highest;
      }
      if (group.average > nestedGroups[key].maxAverage) {
        nestedGroups[key].maxAverage = group.average;
      }
      if (group.lowest < nestedGroups[key].leastLowest) {
        nestedGroups[key].leastLowest = group.lowest;
      }
    });
    return Object.values(nestedGroups);
  },
};
