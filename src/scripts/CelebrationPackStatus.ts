/**
 * The last result of the celebration pack sync, kept for the menu's status
 * line (next to "Last saved") so the owner can see whether packs are arriving.
 * Only a time, a file count and a short reason are stored: no pack content
 * and nothing that could be mistaken for a tip (the key is outside the tip prefix).
 */

const STATUS_KEY = "tipTracker(pack).lastSync";

export interface PackSyncStatus {
  time: string; // ISO time of the sync
  fileCount: number; // pack files on the device after it
  outcome: "ok" | "no-server-pack" | "network" | "storage-full" | "paused";
}

/** Remember a sync's result. Failure to write is ignored. */
export function recordPackSyncStatus(status: PackSyncStatus): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  } catch {
    // The status line is a convenience only.
  }
}

/** The remembered result, or null when there is none (or it is unreadable). */
export function getPackSyncStatus(): PackSyncStatus | null {
  try {
    const stored = localStorage.getItem(STATUS_KEY);
    if (stored === null) return null;
    const parsed = JSON.parse(stored) as Partial<PackSyncStatus>;
    const isValid =
      typeof parsed.time === "string" &&
      !Number.isNaN(new Date(parsed.time).getTime()) &&
      typeof parsed.fileCount === "number" &&
      typeof parsed.outcome === "string";
    return isValid ? (parsed as PackSyncStatus) : null;
  } catch {
    return null;
  }
}

/** The status as one short line for the menu, for example "Pack: 3 files, Nov 13 @ 11:40 AM". */
export function describePackSyncStatus(status: PackSyncStatus): string {
  const time = new Date(status.time);
  const day = time.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const files = `${status.fileCount} ${status.fileCount === 1 ? "file" : "files"}`;
  const problems: Record<PackSyncStatus["outcome"], string> = {
    ok: "",
    paused: "",
    "no-server-pack": ", server gave no pack",
    network: ", could not reach the server",
    "storage-full": ", storage full",
  };
  return `Pack: ${files}, ${day} @ ${clock}${problems[status.outcome]}`;
}
