import { Tip } from "./ClassTip";

export const TipLegacy = {
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

  upgradeToLatest: function () {},

  loadLegacyTips: function () {},

  cleanupLegacyTips: function () {},

  convertLegacyTips: function () {},
};
