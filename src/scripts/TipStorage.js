import { Tip } from "./ClassTip";

export const TipStorage = {
    allTips: [],

    isTipDataValid: (splitData) => {
        const dateString = splitData[1];
        if (dateString === undefined) {
            return false;
        }
        const dateTest = new Date(dateString);
        if (dateTest.toString() === "Invalid Date") {
            return false;
        } else {
            return true;
        }

    },

    loadTip: (dateKey) => {
        const storedTipData = localStorage.getItem(localStorage.key(dateKey));
        if (storedTipData === undefined) {
            console.log(`Couldn't load tip: no storage entry found for key ${dateKey}`);
        }
        const splitData = storedTipData.split(".");
        if (this.isTipDataValid(splitData)) {
            const tip = new Tip(splitData[0], splitData[1]);
            tip.type = splitData[2];
            tip.currency = splitData[3];
            tip.notes = splitData[4];
            tip.key = localStorage.key(i);
            return tip;
        } else {
            console.log("Could not load entry; does not appear to be tip data:");
            console.log(storedTipData);
        }
    },

    loadAllTips: () => {
        for (let i = 0; i < localStorage.length; i++) {
            const tip = this.loadTip(localStorage.key(i));
            if (tip) this.allTips.push(tip);
        }
        console.log(`${this.allTips.length} tips loaded from local storage`);
    },

    saveTip: (tipObj) => {
        let key = tipObj.date;

        // Keep incrementing counter for multiple tips on same day
        // until you find an unused key value
        if (localStorage[key] !== undefined) {
            for (j = 2; ; j++) {
                key = `${tipObj.date} ${j}`;
                if (localStorage[key] !== undefined) {
                    continue;
                } else break;
            }
        }

        localStorage[
            key
        ] = `${tipObj.amount}.${tipObj.date}.${tipObj.type}.${tipObj.currency}.${tipObj.notes}`;
        tipObj.key = key;
    },

    editTip: (dateKey) => {

    },

    deleteTip: (dateKey) => {
        // Find entry in allTips array and remove
        let tipIndex = allTips.findIndex((tip) => tip.key === dateKey);
        allTips.splice(tipIndex, 1);

        // Delete from localStorage
        if (localStorage[dateKey] === undefined) {
            console.error(`Could not delete tip; key not found in local storage:`);
            console.log(dateKey);
        } else {
            localStorage.removeItem(dateKey);
            console.log("Deleted tip from localStorage:");
            console.log(dateKey);
        }
    }
};