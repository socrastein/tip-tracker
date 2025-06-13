export function getTodayDateString() {
    const todayDate = new Date();
    const todayDay = todayDate.getDay();
    const todayMonth = todayDate.getMonth();
    const todayYear = todayDate.getYear() + 1900;

    const todayLocale = todayDate.toLocaleDateString();
    const localeList = todayLocale.split("/");
    const fullLocale = fillOutDateString(localeList);
    return `${fullLocale[2]}-${fullLocale[0]}-${fullLocale[1]}`;
}

// Add 0 in front of any day or month that is less than 10
const fillOutDateString = (dateArray) => {
    for (let number in dateArray) {
        if (Number(dateArray[number]) < 10) {
            dateArray[number] = "0" + dateArray[number];
        }
    }
    return dateArray;
};