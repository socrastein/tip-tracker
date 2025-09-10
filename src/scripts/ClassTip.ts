export class Tip {
  private _amount: number;
  private _date: string;
  private _type: string;
  private _shift: string;

  // Appended to key when saving tips so they can be distinguished from items
  // stored by other apps on the same GitHub profile
  // If you change this, make sure to update any stored data validation functions
  // in TipStorage that specifically look for this string
  static _prefix = "tipTracker(storedTip)";

  constructor(amount: number, date: string, type: string, shift: string) {
    try {
      // Tip amount is a positive value
      this._validateAmount(amount);

      // Date string is in proper YYYY-MM-DD format
      this._validateDate(date);

      // Type is either "Floor" or "Banquet"
      this._validateType(type);

      // Shift is either "Lunch" or "Dinner"
      this._validateShift(shift);
    } catch (error) {
      console.log(`${amount} ${date} ${type} ${shift}`);
      console.error(error);
    }

    this._amount = amount;
    this._date = date;
    this._type = type;
    this._shift = shift;
  }

  // _region Setters and Getters
  get amount() {
    return this._amount;
  }

  set amount(amount: number) {
    this._validateAmount(amount);
    this._amount = amount;
  }

  get date() {
    return this._date;
  }

  set date(date: string) {
    this._validateDate(date);
    this._date = date;
  }

  get type() {
    return this._type;
  }

  set type(type: string) {
    this._validateType(type);
    this._type = type;
  }

  get shift() {
    return this._shift;
  }

  set shift(shift: string) {
    this._validateShift(shift);
    this._shift = shift;
  }

  get prefix() {
    return Tip._prefix;
  }
  // _endregion

  // _region Property validation methods
  _validateAmount(amount: number) {
    if (!amount) {
      throw new Error(`Invalid amount provided for new Tip: ${amount}`);
    }
  }

  _validateDate(date: string) {
    if (date.length !== 10 || !date.includes("-")) {
      throw new Error(`Invalid date provided for new Tip: ${date}`);
    }
    let dateObj = new Date(date);
    if (dateObj.toLocaleString() === "Invalid date") {
      throw new Error(`Invalid date provided for new Tip: ${date}`);
    }
  }

  _validateType(type: string) {
    if (type !== "Banquet" && type !== "Floor") {
      throw new Error(`Invalid type provided for new Tip: ${type}`);
    }
  }

  _validateShift(shift: string) {
    if (shift !== "Lunch" && shift !== "Dinner") {
      throw new Error(`Invalid shift provided for new Tip: ${shift}`);
    }
  }
  // _endregion

  /**
   *@method
   *Saves the tip's properties to localStorage with an app-specific prefix so tips can
   *be easily identified, since all apps hosted on the same GitHub profile share
   *local storage. Overwrites stored tip if one is already saved under the same key.

   *Key is set to prefix.date.shift

   *Value is set to amount.type
   */
  saveToLocalStorage() {
    // Example key and value:
    // tipTracker(Stored Tip).2025-08-29.Dinner
    // 350.Banquet
    let key = `${Tip._prefix}.${this._date}.${this._shift}`;
    let value = `${this._amount}.${this._type}`;

    localStorage[key] = value;
  }

  deleteFromLocalStorage() {
    let key = `${Tip._prefix}.${this._date}.${this._shift}`;
    localStorage.removeItem(key);
  }
}
