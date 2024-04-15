const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const scrollToTopButton = document.getElementById("scrollToTopButton");
window.onscroll = function () {
  scrollFunction();
};

const scrollFunction = () => {
  if (
    document.body.scrollTop > 300 ||
    document.documentElement.scrollTop > 300
  ) {
    scrollToTopButton.classList.remove("hidden");
    scrollToTopButton.classList.remove("fadeOut");
    scrollToTopButton.classList.add("fadeIn");
  } else {
    scrollToTopButton.classList.remove("fadeIn");
    scrollToTopButton.classList.add("fadeOut");
  }
};

// Factory function that returns tip record object containing:
// Date, Amount, Type (i.e. banquet or floor), Cash/Credit
// Calculates and stores year, month and pay period
const NewTip = (amount, date, type, currency, notes = "", key = "") => {
  return { amount, date, type, currency, notes, key };
};

/////////////////////
// RECORD SORTING //
///////////////////

// Array that stores all tip objects ever recorded
const tipsRecord = [];

// Takes date in format '2020-11-23' and gets a DateString that includes day of week
const dayOfWeek = (date) => {
  splitDate = date.split("-");

  year = Number(splitDate[0]);
  month = Number(splitDate[1]);
  day = Number(splitDate[2]);

  date = new Date(`${year},${month},${day}`);
  localDate = date.toDateString();

  return localDate.substring(0, 3); // pulls 3 letter day, e.g. Tue, from DateString
};

const sortTipsDate = async () => {
  tipsRecord.sort(function (a, b) {
    let date1 = Number(a.date.replaceAll("-", ""));
    let date2 = Number(b.date.replaceAll("-", ""));

    return date1 - date2;
  });
};

//////////////////////
// SYSTEM MESSAGES //
////////////////////

const displayError = (message) => {
  if (message) {
    systemMessage.classList.remove("fadeOut");
    systemMessage.style.color = "red";
    systemMessage.style.backgroundColor = "rgba(33,33,33,.75)"
    systemMessage.innerHTML = message;
    setTimeout(displayFade, 3000);
  } else {
    systemMessage.innerHTML = "";
  }
};

const displayConfirmation = (message) => {
  if (message) {
    systemMessage.classList.remove("fadeOut");
    systemMessage.style.color = "green";
    systemMessage.style.backgroundColor = "rgba(33,33,33,.75)"
    systemMessage.innerHTML = message;
    setTimeout(displayFade, 2000);
  } else {
    systemMessage.innerHTML = "";
  }
};

const displayFade = () => {
  systemMessage.classList.add("fadeOut");
};

/////////////////////
// ADD TIP WINDOW //
///////////////////

// Used to check the addTipDate.value field which takes form 2023-02-08
const validateDate = (dateString) => {
  if (dateString) {
    let dateArray = dateString.split("-");
    let year = dateArray[0];
    let month = dateArray[1];
    let day = dateArray[2];

    if (
      1980 <= year &&
      year <= todayYear &&
      1 <= month &&
      month <= 12 &&
      1 <= day &&
      day <= 31
    ) {
      return true;
    } else return false;
  }
  return false;
};

// Add 0 in front of any day or month that is less than 10
const fillOutDateString = (dateArray) => {
  for (let number in dateArray) {
    if (Number(dateArray[number]) < 10) {
      dateArray[number] = "0" + dateArray[number];
    }
  }
  return dateArray;
};

// Creates display and input elements for adding new tips
// when confirmation checkmark is clicked
const addTipWindow = (collapse = true) => {
  addTipButton.classList.add("hidden");
  blurContainer.classList.remove("hidden");
  addTipContainer.classList.remove("hidden");
  if (collapse) {
    collapseExpanded();
  }
};

// Hides display and input elements for adding new tips
// when "X" button is clicked
const closeTipWindow = () => {
  addTipButton.classList.remove("hidden");
  addTipContainer.classList.add("hidden");
  blurContainer.classList.add("hidden");
  addTipTitle.innerHTML = "NEW TIP";
  addTipAmount.value = "";
  addTipHours.value = "";
  addTipAcceptButton.setAttribute("onclick", "confirmNewTip()");
};

// Grabs data entered into TipWindow to add a new tip object to tipsRecord
// with the NewTip constructor only if amount and date entered are both valid
const confirmNewTip = async () => {
  let dateValid = validateDate(addTipDate.value);

  if (dateValid) {
    let tip = NewTip(
      addTipAmount.value,
      addTipDate.value,
      addTipType.value,
      "Card",
      addTipHours.value
    );
    await storeTip(tip);
    tipsRecord.push(tip);
    displayConfirmation("NEW TIP ADDED");
    closeTipWindow();
    displayHistory();
  } else displayError("DATE IS INVALID");
};

const confirmEditTip = (key) => {
  let dateValid = validateDate(addTipDate.value);

  let tipIndex = tipsRecord.findIndex((tip) => tip.key === key);
  let tip = tipsRecord[tipIndex];

  if (dateValid) {
    localStorage.removeItem(key);
    tip.amount = addTipAmount.value;
    tip.date = addTipDate.value;
    tip.type = addTipType.value;
    tip.currency = "Card";
    tip.notes = addTipHours.value;
    
    storeTip(tip);
    displayConfirmation("TIP UPDATED");
    closeTipWindow();
    displayHistory();
  } else displayError("DATE IS INVALID");
};

const editTip = (editButton) => {
  let key = editButton.parentNode.parentNode.getAttribute("id");
  let tipIndex = tipsRecord.findIndex((tip) => tip.key === key);
  let tip = tipsRecord[tipIndex];

  addTipWindow((collapse = false));
  addTipTitle.innerHTML = "EDIT TIP";
  addTipAmount.value = tip.amount;
  addTipDate.value = tip.date;
  addTipType.value = tip.type;
  addTipHours.value = tip.notes;

  addTipAcceptButton.setAttribute("onclick", `confirmEditTip("${key}")`);
};

///////////////////
// DISPLAY DATA //
/////////////////

// Calculates tip totals for all items in tipsRecord if no range or type is given
// Range is an array with two values: beginning and end date
// Type is either 'Banquet' or 'Floor'
const getTipTotals = (range = undefined) => {
  if (range) {
    let startDate = range[0].replace("-", "");
    let endDate = range[1].replace("-", "");
    // Dates converted to numbers for easy integer comparison (earlier < later);
  }
  let total = 0;

  let average = Math.round(total / tipsRecord.length);
  console.log(`Average tip = ${average}`);
  return total;
};

//////////////////////
// DISPLAY HISTORY //
////////////////////

// Appends a child div to historyContainer containing the info from a tip object
const appendHistory = async (tip, insertionPoint = null) => {
  let tipContainer = document.createElement("div");
  tipContainer.setAttribute("id", tip.key);
  tipContainer.classList.add("tipContainer");
  if (tip.type === "Banquet") {
    tipContainer.classList.add("banquet");
  }
  // Info element that only displays tip date and amount at first,
  // but can be expanded with tipIcons to show rest of object data
  let tipInfo = document.createElement("div");
  tipInfo.classList.add("tipInfo");
  let shortDate = tip.date.substring(5);
  tipInfo.innerHTML = `<b>${shortDate}</b> <br> $${tip.amount} | ${tip.notes}`;

  // Create icon buttons that go on side of every tip container
  let tipIcons = document.createElement("div");
  tipIcons.classList.add("tipIcons");

  let expandButton = document.createElement("img");
  expandButton.classList.add("tipIcon");
  expandButton.setAttribute("src", "./icons/more.svg");
  expandButton.setAttribute("onclick", "expandTip(this)");
  tipIcons.appendChild(expandButton);

  tipContainer.appendChild(tipInfo);
  tipContainer.appendChild(tipIcons);

  historyContainer.insertBefore(tipContainer, insertionPoint);
};

// Appends a break point between tips to indicate a new pay period
// pay periods are 1-15 and 15-end of month
const appendDivider = async (tipTotal, hoursTotal, numberOfTips) => {
  let average = Math.round(tipTotal / numberOfTips);
  let divider = document.createElement("div");
  divider.innerHTML = `$${tipTotal} total | $${average} average <br> ${hoursTotal} hours`;
  divider.classList.add("divider");
  historyContainer.insertBefore(divider, null);
};

const expandTip = (expandButton) => {
  let key = expandButton.parentNode.parentNode.getAttribute("id");
  let tip = tipsRecord.find((tip) => tip.key === key);
  let tipContainer = expandButton.parentNode.parentNode;
  let tipIcons = expandButton.parentNode;
  let tipInfo = tipContainer.querySelector(".tipInfo");

  // Collapse any other tip that's currently expanded
  collapseExpanded();

  tipContainer.classList.add("expanded");

  expandButton.setAttribute("src", "./icons/arrow.svg");
  expandButton.style.transform = "rotate(-90deg)";
  expandButton.setAttribute("onclick", "collapseTip(this)");
  expandButton.classList.add("collapseButton");

  day = dayOfWeek(tip.date);
  tipInfo.innerHTML = `<b>${tip.date}</b> ${day} <br> $${tip.amount} <br> ${tip.type} | ${tip.notes}`;
  if(tip.notes) tipInfo.innerHTML += ' hrs';

  let editButton = document.createElement("img");
  editButton.setAttribute("class", "tipIcon editButton");
  editButton.setAttribute("src", "./icons/settings.svg");
  editButton.setAttribute("onclick", "editTip(this)");
  tipIcons.appendChild(editButton);

  let deleteButton = document.createElement("img");
  deleteButton.setAttribute("class", "tipIcon deleteButton");
  deleteButton.setAttribute("src", "./icons/close.svg");
  deleteButton.setAttribute("onclick", "deleteTip(this)");
  tipIcons.appendChild(deleteButton);
};

const collapseTip = (collapseButton) => {
  let key = collapseButton.parentNode.parentNode.getAttribute("id");
  let tip = tipsRecord.find((tip) => tip.key === key);
  let tipContainer = collapseButton.parentNode.parentNode;
  let tipIcons = collapseButton.parentNode;
  let tipInfo = tipContainer.querySelector(".tipInfo");
  let deleteButton = tipIcons.querySelector(".deleteButton");
  let editButton = tipIcons.querySelector(".editButton");

  tipContainer.classList.remove("expanded");
  tipContainer.style.lineHeight = "1.75";

  collapseButton.setAttribute("src", "./icons/more.svg");
  collapseButton.style.transform = "";
  collapseButton.setAttribute("onclick", "expandTip(this)");

  let shortDate = tip.date.substring(5);
  tipInfo.innerHTML = `<b>${shortDate}</b> <br> $${tip.amount} | ${tip.notes}`;

  deleteButton.remove();
  editButton.remove();
};

const collapseExpanded = () => {
  let expandedTip = document.querySelector(".expanded");
  if (expandedTip) {
    collapseButton = expandedTip.querySelector(".collapseButton");
    collapseTip(collapseButton);
  }
};

////////////////////
// LOCAL STORAGE //
//////////////////

const checkRecordTotals = () => {
  console.log(`tipRecord total = ${tipsRecord.length}`);
  console.log(`localStorage total = ${localStorage.length}`);
  let displayCount =
    historyContainer.getElementsByClassName("tipContainer").length;
  console.log(`tipsDisplayed total = ${displayCount}`);
};

const storageAvailable = (type) => {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
};

console.log(`localStorage availability: ` + storageAvailable("localStorage"));

// Takes tip object and adds it to localStorage at specified key
const storeTip = async (tip) => {
  let key = tip.date;

  // Keep incrementing counter for additional tips on same day
  // until you find an unused key value
  if (localStorage[key] !== undefined) {
    for (j = 2; ; j++) {
      key = `${tip.date} ${j}`;
      if (localStorage[key] !== undefined) {
        continue;
      } else break;
    }
  }
  localStorage[
    key
  ] = `${tip.amount}.${tip.date}.${tip.type}.${tip.currency}.${tip.notes}`;
  tip.key = key;
};

// Takes tip element's id key and uses it to delete
// the corresponding entries in tipsRecord and localStorage
const deleteTip = async (deleteButton) => {
  if (confirm("Are you sure you want to delete this tip?")) {
    let key = deleteButton.parentNode.parentNode.getAttribute("id");
    // Delete from tipsRecord array
    let tipIndex = tipsRecord.findIndex((tip) => tip.key === key);
    tipsRecord.splice(tipIndex, 1);
    // Delete from localStorage
    localStorage.removeItem(key);
    // Delete element from HTML
    let tipElement = document.getElementById(key);
    tipElement.remove();
    displayError("TIP DELETED");
    displayHistory();
  } else return;
};

// Grabs all the values from localStorage which take the form 246.2021-06-30.Banquet.false
// tip.date.type.currency.notes
const loadTipFromStorage = (key) => {
  let storedTip = localStorage.getItem(key);
  let splitTip = storedTip.split(".");
  return NewTip(
    splitTip[0], //amount
    splitTip[1], //date
    splitTip[2], //type
    splitTip[3], //currency
    splitTip[4], //notes
    key
  );
};

// Iterate through localStorage values and load them into tipsRecord array
// Use localStorage.getItem(localStorage.key(i)) to get the value of each item
// Amount.date.type.currency.notes e.g. '121.2021-11-04.Banquet.Card.Double: Lunch'
const loadAllFromStorage = async () => {
  for (let i = 0; i < localStorage.length; i++) {
    let storedTip = localStorage.getItem(localStorage.key(i));
    let splitTip = storedTip.split(".");
    let tip = NewTip(
      splitTip[0], //amount
      splitTip[1], //date
      splitTip[2], //type
      splitTip[3], //currency
      splitTip[4], //notes
      localStorage.key(i)
    );
    tipsRecord.push(tip);
  }
};

////////////////////////
// ELEMENT VARIABLES //
//////////////////////

// Error message container at top of page
const systemMessage = document.getElementById("systemMessage");

// Blur container used to blur behind addTipContainer when adding or editing a tip
const blurContainer = document.getElementById("blurContainer");

// Main Container holds everything underneath the date
const mainContainer = document.getElementById("mainContainer");

// History Container displays tips pulled from localStorage
const historyContainer = document.getElementById("historyContainer");

// Add tips button
const addTipButton = document.getElementById("addTipButton");

// Add Tip Form input elements
const addTipContainer = document.getElementById("addTipContainer");
const addTipTitle = document.getElementById("addTipTitle");
const addTipAcceptButton = document.getElementById("addTipAcceptButton");

const addTipAmount = document.getElementById("addTipAmount");
const addTipDate = document.getElementById("addTipDate");
const addTipType = document.getElementById("addTipType");
const addTipHours = document.getElementById("addTipHours");

const todayDate = new Date();
const todayDay = todayDate.getDay();
const todayMonth = todayDate.getMonth();
const todayYear = todayDate.getYear() + 1900;

// Get date string in format that can be used for setting default value in
// input type=date
const todayLocale = todayDate.toLocaleDateString();
const localeList = todayLocale.split("/");
const fullLocale = fillOutDateString(localeList);
const localeISO = `${fullLocale[2]}-${fullLocale[0]}-${fullLocale[1]}`;

////////////////////////////
// LOADING SUMMER'S TIPS //
//////////////////////////


const displayHistory = async () => {
  historyContainer.innerHTML = "";
  await sortTipsDate();
  let length = tipsRecord.length - 1;

  let firstPeriod = false;
  let secondPeriod = false;
  let latestTip = tipsRecord[length];

  let day = Number(latestTip.date.substring(8));
  if (day <= 15) {
    firstPeriod = true;
  } else secondPeriod = true;

  let tipTotal = 0;
  let hoursTotal = 0;
  let numberOfTips = 0;

  for (i in tipsRecord) {
    let tip = tipsRecord[length - i];
    let day = Number(tip.date.substring(8));

    if (firstPeriod && day > 15) {
      appendDivider(tipTotal, hoursTotal, numberOfTips);
      firstPeriod = false;
      secondPeriod = true;
      tipTotal = 0;
      numberOfTips = 0;
      hoursTotal = 0;
    }
    if (secondPeriod && day <= 15) {
      appendDivider(tipTotal, hoursTotal, numberOfTips);
      secondPeriod = false;
      firstPeriod = true;
      tipTotal = 0;
      numberOfTips = 0;
      hoursTotal = 0;
    }

    tipTotal += Number(tip.amount);
    hoursTotal += Number(tip.notes);
    numberOfTips++;
    appendHistory(tip);
  }
};

const loadPage = async () => {
  await loadAllFromStorage();
  await displayHistory();
};

loadPage();
setTimeout(displayFade, 3000);
addTipDate.value = localeISO;
