/**
 * Takes any date string or timestamp number that can be instantiated as a new Date()
 * and returns it in the format "YYYY-MM-DD".
 * Uses today's date by default if no parameter is provided.
 * Throws error if date parameter is invalid date.
 * @param {*} date
 * @returns {string} "2025-08-29"
 */

export function getYearMonthDayString(date?: any): string {
  if (!date) {
    date = new Date().toLocaleString(); // Default to today's date if none provided
  }

  const localeString = new Date(date).toLocaleString();
  if (localeString === "Invalid date") {
    throw new Error(`Invalid date: ${date} provided to getDateString()`);
  }

  return new Date(localeString).toISOString().split("T")[0];
}

export function daysAgo(x: number) {
  const date = new Date(new Date().toLocaleString());
  date.setDate(date.getDate() - x);
  return date;
}
