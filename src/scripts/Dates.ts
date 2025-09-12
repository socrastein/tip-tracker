/**
 * Takes any date string or timestamp number that can be instantiated as a new Date()
 * and returns it in the format "YYYY-MM-DD".
 * Uses today's date by default if no parameter is provided.
 * Throws error if date parameter is invalid date.
 * @param {*} date
 * @returns {string} "2025-08-29"
 */

export function getYearMonthDayString(date?: any): string {
  let targetDate: Date;

  if (date === null) {
    throw new Error(`Invalid date: null provided to getYearMonthDayString()`);
  } else if (date === undefined || date === 0) {
    targetDate = new Date(); // Default to today
  } else if (typeof date === "string" && /^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
    // Parse YYYY-MM-DD as local date to avoid timezone issues
    const [year, month, day] = date.split("-").map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    targetDate = new Date(date);
  }

  if (isNaN(targetDate.getTime())) {
    throw new Error(
      `Invalid date: ${date} provided to getYearMonthDayString()`
    );
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function daysAgo(x: number) {
  if (!Number.isInteger(x)) {
    throw new Error(`daysAgo() expects an integer, got ${x}`);
  }
  const date = new Date();
  date.setDate(date.getDate() - x);
  return date;
}
