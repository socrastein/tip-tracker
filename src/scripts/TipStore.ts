import { reactive } from "vue";
import { Tip } from "./ClassTip";
import { TipGrouper } from "./TipGrouper";
import { TipRepository } from "./TipRepository";

/**
 * Handles memory state management for tips
 */

interface Group {
  period: string;
  tips: Tip[];
  total: number;
}

export const TipStore = {
  _tipState: reactive({
    allTips: [] as Tip[],
    groupedTips: [] as Group[],
  }),

  setAllTips: function (tips: Tip[]) {
    this._tipState.allTips.splice(0, this._tipState.allTips.length, ...tips);
  },

  setGroupedTips: function (groups: Group[]) {
    this._tipState.groupedTips.splice(
      0,
      this._tipState.groupedTips.length,
      ...groups,
    );
  },

  getAllTips: function () {
    return this._tipState.allTips;
  },

  getGroupedTips: function () {
    return this._tipState.groupedTips;
  },

  getLengthOfAllTips: function () {
    return this._tipState.allTips.length;
  },

  getLengthOfGroupedTips: function () {
    return this._tipState.groupedTips.length;
  },

  logAllTipsToConsole: function (limit?: number) {
    let length: number;
    if (!limit || limit > this._tipState.allTips.length) {
      length = this._tipState.allTips.length;
    } else {
      length = limit;
    }

    console.log(`Logging ${length} tips from allTips:`);
    for (let i = 0; i < length; i++) {
      console.log(this._tipState.allTips[i]);
    }
  },

  logGroupedTipsToConsole: function (limit?: number) {
    let length: number;
    if (!limit || limit > this._tipState.groupedTips.length) {
      length = this._tipState.groupedTips.length;
    } else {
      length = limit;
    }

    console.log(`Logging ${length} groups from groupedTips:`);
    for (let i = 0; i < length; i++) {
      console.log(this._tipState.groupedTips[i]);
    }
  },

  findGroupByKey: function (key: string): Group | undefined {
    return (this._tipState.groupedTips as Group[]).find(
      (group) => group.period === key,
    );
  },

  insertGroupInOrder: function (group: Group) {
    // See if there's a group with a period later than current group
    const index = this._tipState.groupedTips.findIndex(
      (existingGroup) => existingGroup.period < group.period,
    );
    // If none found, group represents oldest period so push to end of array
    if (index === -1) {
      this._tipState.groupedTips.push(group);
      // Place group into array just before first group period that's earlier than it
    } else {
      this._tipState.groupedTips.splice(index, 0, group);
    }
  },

  removeTipFromGroup: function (tip: Tip, group: Group | undefined) {
    if (!group) {
      throw new Error(`Could not find group for tip ${tip}`);
    }
    let tipIndex = group.tips.indexOf(tip);
    if (tipIndex === -1) {
      throw new Error(`Could not find ${tip} in group ${group.tips}`);
      return;
    }
    group.tips.splice(tipIndex, 1);
    group.total = TipGrouper.calculateGroupTotal(group.tips);

    // Remove group if empty
    if (group.tips.length === 0) {
      this._tipState.groupedTips.splice(
        this._tipState.groupedTips.indexOf(group),
        1,
      );
    }
  },

  addTip: function (tip: Tip) {
    // Make sure same object reference isn't already in allTips
    if (this._tipState.allTips.includes(tip)) {
      throw new Error(`The tip ${tip} already exists in allTips`);
    }
    // Check for duplicates by date/shift
    const possibleDuplicate = this.checkForDuplicateTip(tip.date, tip.shift);
    if (possibleDuplicate !== null) {
      throw new Error(
        `DUPLICATE FOUND: The tip ${tip} has same date and shift as ${possibleDuplicate}`,
      );
    }

    (this._tipState.allTips as Tip[]).push(tip);

    // Find or create group
    const key = TipGrouper.getGroupKey(tip.date);
    let group = this.findGroupByKey(key);

    if (!group) {
      group = TipGrouper.createEmptyGroup(key);
      this.insertGroupInOrder(group);
    }

    const insertIndex = TipGrouper.findInsertionIndex(group.tips, tip);
    group.tips.splice(insertIndex, 0, tip);
    group.total = TipGrouper.calculateGroupTotal(group.tips);

    TipRepository.saveToStorage(tip);
  },

  removeTip: function (tip: Tip) {
    // Find and remove from allTips
    const allTipsIndex = this._tipState.allTips.indexOf(tip);
    if (allTipsIndex === -1) {
      throw new Error(`Could not find tip ${tip} in allTips`);
    }
    this._tipState.allTips.splice(allTipsIndex, 1);

    // Find and remove from groupedTips
    const key = TipGrouper.getGroupKey(tip.date);
    const group = this.findGroupByKey(key);
    this.removeTipFromGroup(tip, group);

    TipRepository.deleteFromStorage(tip);
  },

  editTip: function (
    tip: Tip,
    newValues: { amount: number; date: string; type: string; shift: string },
  ) {
    this.removeTip(tip);

    const newTip = new Tip(
      newValues.amount,
      newValues.date,
      newValues.type,
      newValues.shift,
    );
    this.addTip(newTip);
    return newTip;
  },

  checkForDuplicateTip: function (date: string, shift: string): Tip | null {
    return (
      (this._tipState.allTips as Tip[]).find(
        (tip: Tip) => tip.date === date && tip.shift === shift,
      ) || null
    );
  },
};
