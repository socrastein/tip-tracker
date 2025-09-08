import { reactive, nextTick } from "vue";

import { Tip } from "./ClassTip";
import { getYearMonthDayString } from "./Dates";

export const TipMemory = {
  tipState: reactive({
    allTips: [] as Tip[],
    groupedTips: [] as { period: string; tips: Tip[]; total: number }[],
  }),

  legacyTips: [] as Tip[],

  saveAllTipsToStorage: function () {
    this.tipState.allTips.forEach((tip: Tip) => {
      tip.saveToLocalStorage();
    });
    console.log(`${this.tipState.allTips.length} tips saved to local storage`);
  },

  loadAllTipsFromStorage: function (legacy = false) {
    const storageLength = localStorage.length;

    // Any tips stored with legacy format have already been converted
    if (legacy === false) {
      for (let i = 0; i < storageLength; i++) {
        const key = localStorage.key(i);
        if (key == null) continue;
        if (!this.isStoredDataATip(key)) continue;

        let value = localStorage.getItem(key);
        this.loadStoredTip(key, value);
      }
      return;
    }

    // Local storage hasn't been checked for legacy items yet
    for (let i = 0; i < storageLength; i++) {
      const key = localStorage.key(i);
      if (key == null) continue;
      if (!this.isStoredDataATip(key)) continue;

      let value = localStorage.getItem(key);

      if (key.includes("tipTracker(storedTip)")) {
        this.loadStoredTip(key, value);
      } else {
        this.loadStoredLegacyTip(value);
      }
    }
  },

  initializeGroups: function () {
    // Run this in main.js before mounting Vue App so watchers aren't affected
    this.tipState.groupedTips = this.getGroupedTips();
  },

  isStoredDataATip: function (key: string) {
    if (key.includes("tipTracker(storedTip)")) {
      return true;
    }

    let dateString: string;
    dateString = key.substring(0, 11);

    // Check for sign of YYYY-MM-DD format
    if (!dateString.includes("-")) {
      return false;
    }
    // Check that string represents a valid date
    let dateObj = new Date(dateString);
    if (dateObj.toLocaleString() === "Invalid date") {
      return false;
    }

    return true;
  },

  loadStoredTip: function (key: string, value: string) {
    const splitKey = key.split(".");
    const splitValue = value.split(".");

    const amount = parseInt(splitValue[0]);
    const date = splitKey[1];
    const type = splitValue[1];
    const shift = splitKey[2];

    const tip = reactive(new Tip(amount, date, type, shift));

    this.tipState.allTips.push(tip);
  },

  loadStoredLegacyTip: function (value: string) {
    const splitValue = value.split(".");

    const amount = parseInt(splitValue[0]);
    if (!amount) return;

    const date = splitValue[1];
    const type = splitValue[2];
    const shift = "Dinner";

    const tip = reactive(new Tip(amount, date, type, shift));
    this.legacyTips.push(tip);
  },

  retrieveTipDataFromMemory: function (date: string, shift: string) {
    const tipInstance = this.tipState.allTips.find(
      (obj: Tip) => obj.date === date && obj.shift === shift
    );
    return tipInstance;
  },

  checkForDuplicateTip: function (date: string, shift: string): Tip | null {
    return (
      this.tipState.allTips.find(
        (tip: Tip) => tip.date === date && tip.shift === shift
      ) || null
    );
  },

  addNewTip: function (newTip: Tip) {
    this.tipState.allTips.push(newTip);

    // Either find or create appropriate period group
    const key = this.getGroupKey(newTip);
    let group = this.tipState.groupedTips.find(
      (group: any) => group.period === key
    );
    if (!group) {
      group = reactive({ period: key, tips: [], total: 0 });

      // See if there's a group with a period later than current group
      const index = this.tipState.groupedTips.findIndex(
        (group: any) => group.period > key
      );

      // If none found, group represents most recent period so push to end of array
      if (index === -1) {
        this.tipState.groupedTips.unshift(group);
        // Place group into array just before first group period that's later than it
      } else {
        this.tipState.groupedTips.splice(index, 0, group);
      }
    }

    {
      const tipIndex = group.tips.findIndex(
        (tip: Tip) => tip.date < newTip.date
      );

      const newTipsArray = [...group.tips]; // Instead of splicing

      if (tipIndex === -1) {
        newTipsArray.push(newTip);
      } else {
        newTipsArray.splice(tipIndex, 0, newTip);
      }
      group.tips = newTipsArray;

      group.total += newTip.amount;
      newTip.saveToLocalStorage();
    }
  },

  editTip: function (
    tip: Tip,
    newValues: { amount: number; date: string; type: string; shift: string }
  ) {
    const oldGroupKey = this.getGroupKey(tip);
    const newTip = new Tip(
      newValues.amount,
      newValues.date,
      newValues.type,
      newValues.shift
    );
    const newGroupKey = this.getGroupKey(newTip);

    if (oldGroupKey === newGroupKey) {
      tip.deleteFromLocalStorage();
      Object.assign(tip, newValues);

      const group = this.tipState.groupedTips.find(
        (g) => g.period === oldGroupKey
      );
      if (group) {
        // Recalculate the total (in case amount changed)
        group.total = group.tips.reduce((sum, t) => sum + t.amount, 0);
      }

      tip.saveToLocalStorage();
    } else {
      this.removeTip(tip);

      const newTip = reactive(
        new Tip(
          newValues.amount,
          newValues.date,
          newValues.type,
          newValues.shift
        )
      );
      this.addNewTip(newTip);
    }
  },

  removeTip: function (tip: Tip) {
    console.log("Removing tip:", tip.date, tip.shift, tip.amount);

    // Find and remove from groupedTips
    const oldGroupKey = this.getGroupKey(tip);
    const oldGroup = this.tipState.groupedTips.find(
      (group: any) => group.period === oldGroupKey
    );

    if (!oldGroup) {
      console.error("Could not find group for tip!", oldGroupKey);
      return;
    }

    let groupsIndex = oldGroup.tips.indexOf(tip);

    if (groupsIndex === -1) {
      console.error("Could not find tip in group!");
      return;
    }

    oldGroup.total -= tip.amount;
    oldGroup.tips.splice(groupsIndex, 1);

    // Remove group if it's now empty
    if (oldGroup.tips.length === 0) {
      this.tipState.groupedTips.splice(
        this.tipState.groupedTips.indexOf(oldGroup),
        1
      );
    }

    // Find and remove from allTips
    const allTipsIndex = this.tipState.allTips.indexOf(tip);

    if (allTipsIndex === -1) {
      console.error("Could not find tip in allTips!");
      return;
    }

    this.tipState.allTips.splice(allTipsIndex, 1);
    tip.deleteFromLocalStorage();
  },

  isUpgradeNeeded: function () {
    const keyToCheck = "tipTracker(version 1.0)";
    if (localStorage.getItem(keyToCheck) !== null) {
      //Item exists in localStorage
      console.log(
        `Tip Tracker version 1.0, updated on ${localStorage.getItem(
          keyToCheck
        )}`
      );
      return false;
    } else {
      console.log(
        "Upgrading to latest version: converting any tips in legacy format."
      );
      return true;
    }
  },

  saveJSONBackupToStorage: function (jString: string) {
    const parsed = JSON.parse(jString);
    Object.entries(parsed).forEach(([key, value]) => {
      localStorage[key] = value;
    });
    console.log(
      `${Object.keys(parsed).length} backup tips saved to local storage`
    );
  },

  upgradeToLatest: function () {
    this.loadAllTipsFromStorage(true);
    this.editLegacyDuplicates();
    this.mergeLegacyTips();
    this.saveAllTipsToStorage();
    this.deleteLegacyTips();

    const today = getYearMonthDayString();
    console.log(`Tip Tracker app has been updated to version 1.0 on ${today}`);
    localStorage["tipTracker(version 1.0)"] = today;
  },

  editLegacyDuplicates: function () {
    if (this.legacyTips.length === 0) {
      console.error("Cannot edit legacy duplicates: no legacy tips loaded");
    }

    // Map to store first tip seen for a given date
    const tipByDate = new Map<string, Tip>();

    this.legacyTips.forEach((tip: Tip) => {
      if (tipByDate.has(tip.date)) {
        // Found a duplicate
        const firstTip = tipByDate.get(tip.date)!;

        // Compare amounts and assign shifts
        if (tip.amount < firstTip.amount) {
          tip.shift = "Lunch";
          firstTip.shift = "Dinner";
        } else {
          firstTip.shift = "Lunch";
          tip.shift = "Dinner";
        }
      } else {
        tipByDate.set(tip.date, tip);
      }
    });
  },

  mergeLegacyTips: function () {
    console.log(
      `${this.legacyTips.length} tips stored with legacy format have been converted`
    );
    this.tipState.allTips.push(...this.legacyTips);
  },

  deleteLegacyTips: function () {
    let keysForDeletion = [] as string[];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key == null) continue;
      if (!this.isStoredDataATip(key)) continue;

      if (key.includes("tipTracker")) {
        continue;
      } else {
        keysForDeletion.push(key);
      }
    }
    keysForDeletion.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log(
      `${keysForDeletion.length} legacy format tip entries deleted from storage`
    );
  },

  getLengthOfAllTips: function () {
    return this.tipState.allTips.length;
  },

  logAllTipsToConsole: function (limit: number) {
    if (!limit) {
      limit = this.tipState.allTips.length;
    }
    for (let i = 0; i < limit; i++) {
      let tip = this.tipState.allTips[i];
      console.log(`${tip.amount} ${tip.date} ${tip.type} ${tip.shift}`);
    }
  },

  logAllGroupsToConsole: function (limit: number) {
    if (!limit) {
      limit = this.tipState.groupedTips.length;
    }
    for (let i = 0; i < limit; i++) {
      let group = this.tipState.groupedTips[i];
      console.log(`${group.period} Total: ${group.total}`);
      console.log(group.tips);
    }
  },

  sortAllTipsByDate: function () {
    this.tipState.allTips.sort(function (a: Tip, b: Tip) {
      let date1 = Number(a.date.replaceAll("-", ""));
      let date2 = Number(b.date.replaceAll("-", ""));

      return date2 - date1;
    });
  },

  sortTipsByAmount: function () {
    this.tipState.allTips.sort(function (a: Tip, b: Tip) {
      return b.amount - a.amount;
    });
  },

  getAverageOfAllTips: function () {
    let total = 0;
    this.tipState.allTips.forEach((tip: Tip) => {
      total += tip.amount;
    });
    return Math.floor(total / this.tipState.allTips.length);
  },

  getHighestTip: function (year: string) {
    let highest = 0;
    let date = "date";
    this.tipState.allTips.forEach((tip: Tip) => {
      if (year && tip.date.substring(0, 4) !== year) {
        return;
      }
      if (tip.amount > highest) {
        highest = tip.amount;
        date = tip.date;
      }
    });
    return highest > 0
      ? `${highest} on ${date}`
      : "No tips found for that year";
  },

  getGroupKey: function (tip: Tip) {
    const [year, month, day] = tip.date.split("-").map(Number);
    const half = day <= 15 ? "1" : "2";
    return `${year}-${month}-${half}`;
  },

  getGroupedTips: function () {
    const groups = {};

    this.tipState.allTips.forEach((tip: Tip) => {
      const [year, month, day] = tip.date.split("-").map(Number);

      // Is tip in the first or second half of the month
      const half = day <= 15 ? "1" : "2";
      const key = `${year}-${month}-${half}`;

      if (!groups[key]) {
        groups[key] = reactive({ period: key, tips: [], total: 0 });
      }
      groups[key].tips.push(tip);
      groups[key].total += tip.amount;
    });

    return Object.values(groups);
  },

  downloadTipsToJSON: function () {},
};
