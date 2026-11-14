import type { Tip } from "./ClassTip";
import { getYearMonthDayString } from "./Dates";
import { TipRepository } from "./TipRepository";

/**
 * "Export Tips": save every tip to one JSON file (the same format as the home
 * server's archives) that can be kept or sent by message or email.
 * It only reads the tips it is given: it never saves, changes or migrates a
 * tip, never touches the backup bookkeeping, and never contacts the server.
 */

export type ExportResult =
  | { kind: "shared"; count: number }
  | { kind: "downloaded"; count: number; filename: string }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "failed" };

/** The browser pieces the export uses, injectable so tests need no real browser. */
export interface ExportEnvironment {
  today: () => string; // YYYY-MM-DD
  share: ((data: ShareData) => Promise<void>) | null; // null when sharing is not offered
  canShareFiles: (data: ShareData) => boolean;
  download: (tips: Tip[], filename: string) => void;
}

/** The name of the export file: tips-YYYY-MM-DD.json with today's date. */
export function exportFileName(today: string): string {
  return `tips-${today}.json`;
}

/** The real browser's sharing and download, with sharing feature-detected (never by user agent). */
function browserEnvironment(): ExportEnvironment {
  const canShare = typeof navigator.share === "function" && typeof navigator.canShare === "function";
  return {
    today: () => getYearMonthDayString(),
    share: canShare ? (data) => navigator.share(data) : null,
    canShareFiles: (data) => canShare && navigator.canShare(data),
    download: (tips, filename) => TipRepository.downloadJSONFile(tips, filename),
  };
}

/** True when the person closed the share sheet without sharing (not an error). */
function isShareCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** Save through the normal download, or report that the browser refused. */
function downloadTips(tips: Tip[], filename: string, environment: ExportEnvironment): ExportResult {
  try {
    environment.download(tips, filename);
    return { kind: "downloaded", count: tips.length, filename };
  } catch (error) {
    console.warn("[TipExporter] Download failed:", error);
    return { kind: "failed" };
  }
}

/**
 * Offer the file to the share sheet.
 * @returns shared or cancelled, or null when sharing is not possible or failed
 *   (the caller then downloads instead)
 */
async function tryShare(file: File, count: number, environment: ExportEnvironment): Promise<ExportResult | null> {
  const shareData: ShareData = { files: [file], title: "Tips" };
  if (environment.share === null || !environment.canShareFiles(shareData)) return null;
  try {
    await environment.share(shareData);
    return { kind: "shared", count };
  } catch (error) {
    if (isShareCancelled(error)) return { kind: "cancelled" };
    console.warn("[TipExporter] Share failed, downloading instead:", error);
    return null;
  }
}

/**
 * Export all the given tips. Call it straight from the button's click, so a
 * phone allows the share sheet.
 * - Where the browser can share files, the file goes to the share sheet
 *   (two taps to message or email it). Closing the sheet is "cancelled".
 *   Any other share failure falls back to a normal download.
 * - Elsewhere it downloads the file.
 * @param tips  every tip (read only)
 * @param environment  the browser pieces; the real ones by default
 * @returns what happened, for the message shown to the person
 */
export async function exportAllTips(
  tips: Tip[],
  environment: ExportEnvironment = browserEnvironment(),
): Promise<ExportResult> {
  if (tips.length === 0) return { kind: "empty" };
  const filename = exportFileName(environment.today());
  const file = new File([TipRepository.exportTipsToJSON(tips)], filename, { type: "application/json" });
  const shareResult = await tryShare(file, tips.length, environment);
  return shareResult ?? downloadTips(tips, filename, environment);
}

/**
 * The sentence shown (and announced by a screen reader) for an export result.
 * @returns the message, or null when nothing should be said (the share sheet was closed)
 */
export function describeExportResult(result: ExportResult): string | null {
  switch (result.kind) {
    case "shared":
      return `Shared ${countOfTips(result.count)}.`;
    case "downloaded":
      return `Saved ${countOfTips(result.count)} to ${result.filename}.`;
    case "empty":
      return "There are no tips to export yet.";
    case "failed":
      return "Your browser did not allow saving the file. Please try again.";
    case "cancelled":
      return null;
  }
}

function countOfTips(count: number): string {
  return `${count} ${count === 1 ? "tip" : "tips"}`;
}
