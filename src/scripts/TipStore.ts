import { reactive } from "vue";
import { Tip } from "./ClassTip";
import { TipGrouper } from "./TipGrouper";
import { TipRepository } from "./TipRepository";

/**
 * Handles memory state management for tips
 */

export const TipStore = {
  _tipState: reactive({
    allTips: [],
    groupedTips: [],
  }),

  getLengthOfAllTips: function () {
    return this._tipState.allTips.length;
  },

  getLengthOfGroupedTips: function () {
    return this._tipState.groupedTips.length;
  },

  findGroupByKey: function (key: string) {
    let group = this._tipState.groupedTips.find(
      (group: any) => group.period === key
    );
    // Returns undefined if no group found
    return group;
  },

  insertGroupInOrder: function (group: {
    period: string;
    tips: Tip[];
    total: number;
  }) {
    // See if there's a group with a period later than current group
    const index = this._tipState.groupedTips.findIndex(
      (existingGroup: any) => existingGroup.period > group.period
    );
    // If none found, group represents most recent period so push to start of array
    if (index === -1) {
      this._tipState.groupedTips.unshift(group);
      // Place group into array just before first group period that's later than it
    } else {
      this._tipState.groupedTips.splice(index, 0, group);
    }
  },

  removeTipFromGroup: function (
    tip: Tip,
    group: { period: string; tips: Tip[]; total: number }
  ) {
    let tipIndex = group.tips.indexOf(tip);
    if (tipIndex === -1) {
      console.error(`Could not find ${tip} in group ${group.tips}`);
      return;
    }
    group.tips.splice(tipIndex, 1);
    group.total = TipGrouper.calculateGroupTotal(group.tips);

    // Remove group if empty
    if (group.tips.length === 0) {
      this._tipState.groupedTips.splice(
        this._tipState.groupedTips.indexOf(group),
        1
      );
    }
  },

  addTip: function (tip: Tip) {
    this._tipState.allTips.push(tip);

    const key = TipGrouper.getGroupKey(tip.date);
    let group = this.findGroupByKey(key);

    if (!group) {
      group = TipGrouper.createEmptyGroup;
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
      console.error(`Could not find tip ${tip} in allTips`);
      return;
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
    newValues: { amount: number; date: string; type: string; shift: string }
  ) {
    this.removeTip(tip);
    const newTip = reactive(
      new Tip(newValues.amount, newValues.date, newValues.type, newValues.shift)
    );
    this.addTip(newTip);
    return newTip;
  },

  checkForDuplicateTip: function (date: string, shift: string): Tip | null {
    return (
      this._tipState.allTips.find(
        (tip: Tip) => tip.date === date && tip.shift === shift
      ) || null
    );
  },

  setAllTips: function (tips: Tip[]) {
    this._tipState.allTips.splice(0, this._tipState.allTips.length, ...tips);
  },

  setGroupedTips: function (groups: []) {
    this._tipState.groupedTips.splice(
      0,
      this._tipState.groupedTips.length,
      ...groups
    );
  },
};
