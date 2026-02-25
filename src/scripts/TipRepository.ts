import { Tip } from "./ClassTip";

/**
 * Handles all localStorage logic for tips
 */

export const TipRepository = {
  saveToStorage: function (tip: Tip) {
    if (!(tip instanceof Tip)) {
      throw new Error("Cannot save item that isn't a Tip");
    }
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
    if (!this.isValidTipKey(key)) {
      throw new Error("Attempted to load item without proper key prefix");
    }
    const value = localStorage.getItem(key);
    if (value === null) {
      throw new Error(`Tip key '${key}' has no stored value`);
    }

    const splitKey = key.split(".");
    const splitValue = value.split(".");

    if (splitKey.length !== 3 || splitValue.length !== 2) {
      // For any tip that was accidentally stored with a decimal value
      if (typeof parseInt(splitValue[1]) == "number") {
        // Remove the decimal portion of the amount value and continue loading tip
        splitValue.splice(1, 1);
        // Resave the tip without the decimal value to prevent future loading issues
        const correctedValue = splitValue.join(".");
        localStorage.setItem(key, correctedValue);
      } else {
        throw new Error(`Invalid tip data format for key: ${key}`);
      }
    }

    const amount = parseInt(splitValue[0]);
    const date = splitKey[1];
    const type = splitValue[1];
    const shift = splitKey[2];

    const tip = new Tip(amount, date, type, shift);

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

  exportTipsToJSON: function (tips: Tip[]) {
    const valuesArray = [] as any[];
    for (const tip of tips) {
      const key = tip.storageKey;
      const value = tip.storageValue;

      const valuesObject = {
        key: value,
      };
      valuesArray.push(valuesObject);
    }
  },

  importTipsFromJSON: function (jsonString: string) {
    const tips = [] as Tip[];

    for (const [key, value] of Object.entries(jsonString)) {
      const split = value.split(".");
    }
  },

  // importLegacyTipsFromJSON: function (jsonString: string) {
  //   const tips = [] as Tip[];
  //   const tipMap = new Map<string, Tip>();
  //   const parsed = JSON.parse(jsonString);

  //   for (const [key, value] of Object.entries(parsed)) {
  //     const split = (value as string).split(".");
  //     if(split[0] === "0") continue; // Skip zero amount tips
  //     const tip = new Tip(parseInt(split[0]), split[1], split[2], "Dinner");
  //     // console.log(tip);
  //     // Check if date already exists in map
  //     if (!tipMap.has(tip.date)) {
  //       tipMap.set(tip.date, tip);
  //     } else {
  //       // Decide lunch or dinner based on amount
  //       // and then change shift of tip in tips array
  //       const existingTip = tipMap.get(tip.date);
  //       if (existingTip) {
  //         if (tip.amount > existingTip.amount) {
  //           existingTip.shift = "Lunch";
  //           tip.shift = "Dinner";
  //         } else {
  //           existingTip.shift = "Dinner";
  //           tip.shift = "Lunch";
  //         }
  //       }
  //       tips.push(tip);
  //     }
  //   }
  //   tips.push(...tipMap.values());
  //   return tips;
  // },

  downloadJSONFile(tips: Tip[], filename?: string) {},
};
