export const TipStorage = {
    allTips: [],

    loadTip: (dateKey) => {

    },

    loadAllTips: (dateRangeObj) => {

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