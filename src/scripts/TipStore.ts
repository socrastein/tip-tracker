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

  findGroupByKey: function (key: string) {
    let group = this.tipState.groupedTips.find(
      (group: any) => group.period === key
    );
    // Returns undefined if no group found
    return group;
  },

  createGroupForTip: function (tip: Tip) {
    const key = TipGrouper.getGroupKey(tip.date);
    const group = reactive({ period: key, tips: [], total: 0 });

    // See if there's a group with a period later than current group
    const index = this.tipState.groupedTips.findIndex(
      (group: any) => group.period > key
    );
    // If none found, group represents most recent period so push to start of array
    if (index === -1) {
      this.tipState.groupedTips.unshift(group);
      // Place group into array just before first group period that's later than it
    } else {
      this.tipState.groupedTips.splice(index, 0, group);
    }

    return group;
  },

  placeTipInGroup: function (
    tip: Tip,
    group: { period: string; tips: Tip[]; total: number }
  ) {
    const tipIndex = group.tips.findIndex(
      (existingTip: Tip) => existingTip.date < tip.date
    );
    if (tipIndex === -1) {
      group.tips.push(tip);
    } else {
      group.tips.splice(tipIndex, 0, tip);
    }
    group.total += tip.amount;
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
    group.total -= tip.amount;
    // Remove group if empty
    if (group.tips.length === 0) {
      this.tipState.groupedTips.splice(
        this.tipState.groupedTips.indexOf(group),
        1
      );
    }
  },

  addTip: function (newTip: Tip) {
    this.tipState.allTips.push(newTip);
    const key = TipGrouper.getGroupKey(newTip.date);
    let group = this.findGroupByKey(key);
    if (!group) {
      group = this.createGroupForTip(newTip);
    }
    this.placeTipInGroup(newTip, group);

    TipRepository.saveToStorage(newTip);
  },

  removeTip: function (tip: Tip) {
    // Find and remove from allTips
    const allTipsIndex = this.tipState.allTips.indexOf(tip);
    if (allTipsIndex === -1) {
      console.error(`Could not find tip ${tip} in allTips`);
      return;
    }
    this.tipState.allTips.splice(allTipsIndex, 1);

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
  },

  checkForDuplicateTip: function (date: string, shift: string): Tip | null {
    return (
      this.tipState.allTips.find(
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
