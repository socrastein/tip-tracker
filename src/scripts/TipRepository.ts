import { Tip } from "./ClassTip";
import { BackupService } from "./BackupService";

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

  /**
   * The tips as JSON text, in exactly the form the home server's archives use:
   * a list of {amount, date, type, shift}, sorted by date then shift. It is
   * BackupService's canonical backup payload, so one format serves both.
   * Only reads the tips it is given: nothing is saved or changed.
   * @param tips  the tips to export
   * @returns the JSON text
   */
  exportTipsToJSON: function (tips: Tip[]): string {
    return BackupService.buildTipsPayload(tips);
  },

  // Importing is planned separately: it writes her data, so it needs its own
  // careful design (validation, duplicates, a preview) and is deliberately not built yet.
  importTipsFromJSON: function (jsonString: string) {
    const tips = [] as Tip[];

    for (const [key, value] of Object.entries(jsonString)) {
      const split = value.split(".");
    }
  },


  /**
   * Save the tips as a JSON file through the browser's normal download.
   * @param tips  the tips to save
   * @param filename  the file name, for example "tips-2026-11-14.json"
   */
  downloadJSONFile(tips: Tip[], filename: string): void {
    const file = new Blob([this.exportTipsToJSON(tips)], { type: "application/json" });
    const address = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = address;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Freed after the browser has had time to start the download.
    setTimeout(() => URL.revokeObjectURL(address), 10_000);
  },
};
