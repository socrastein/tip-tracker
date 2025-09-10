import { Tip } from "./ClassTip";
import { reactive } from "vue";

/**
 * Handles all localStorage logic for tips
 */

export const TipRepository = {
  saveToStorage: function (tip: Tip) {
    tip.saveToLocalStorage();
  },

  saveAllToStorage: function (tips: Tip[]) {
    tips.forEach((tip: Tip) => {
      this.saveToStorage(tip);
    });
  },

  isValidTipKey: function (key: string): boolean {
    const prefix = Tip._prefix;
    return key.includes(prefix);
  },

  loadFromStorage: function (key: string) {
    const value = localStorage.getItem(key);
    if (value === null) {
      throw new Error(`Tip key '${key}' has no stored value`);
    }

    const splitKey = key.split(".");
    const splitValue = value.split(".");

    if (splitKey.length !== 3 || splitValue.length !== 2) {
      throw new Error(`Invalid tip data format for key: ${key}`);
    }

    const amount = parseInt(splitValue[0]);
    const date = splitKey[1];
    const type = splitValue[1];
    const shift = splitKey[2];

    const tip = reactive(new Tip(amount, date, type, shift));

    return tip;
  },

  loadAllFromStorage: function () {
    const tips = [] as Tip[];
    const storageLength = localStorage.length;

    for (let i = 0; i < storageLength; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      // Check for prefix used for key generation in Tip class
      if (this.isValidTipKey(key)) {
        const tip = this.loadFromStorage(key);
        tips.push(tip);
      } else continue;
    }

    return tips;
  },

  deleteFromStorage: function (tip: Tip) {
    tip.deleteFromLocalStorage();
  },

  exportTipsToJSON: function (tips: Tip[]) {},

  importTipsFromJSON: function (jsonString: string) {},

  downloadJSONFile(tips: Tip[], filename?: string) {},
};
