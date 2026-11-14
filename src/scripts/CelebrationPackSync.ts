import { kindOfExtension } from "./CelebrationPackNames";
import type { PackFileKind } from "./CelebrationPackNames";
import { deletePackFile, loadStoredPackFiles, savePackFile } from "./CelebrationPackStore";
import type { StoredPackFile } from "./CelebrationPackStore";
import { recordPackSyncStatus } from "./CelebrationPackStatus";
import type { PackSyncStatus } from "./CelebrationPackStatus";
import { celebrationState } from "./CelebrationState";

/**
 * Keeps the device's copy of the celebration pack in step with the folder on
 * the home server. BackupService calls it once the home server has proved it
 * is the home server (its health check), so there is no second polling loop.
 *
 * It is built to never get in the way:
 * - one file at a time, never while a celebration is on screen (it stops and
 *   the next hourly check carries on, since a file is stored only when it is
 *   complete and its hash matches, an interrupted download just starts over);
 * - never throws, and any failure (offline, server error, full storage) just
 *   ends the run quietly;
 * - the caps below limit what is kept, and a full disk stops it politely.
 */

/** Same caps as the server (pythonServer tipApp/celebrations.py): the phone is the second line of defence. */
export const PACK_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const PACK_MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const MANIFEST_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const STORAGE_MARGIN_FACTOR = 2; // keep room for twice a file before downloading it
const SHA256_HEX = /^[0-9a-f]{64}$/;
// Same shape the server accepts: no slashes, so a name can only be a file in the pack folder.
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._@+()-]{0,120}\.[A-Za-z0-9]{1,5}$/;

export interface ManifestFile {
  name: string;
  kind: PackFileKind;
  size: number;
  sha256: string;
}

export interface SyncPlan {
  toDelete: string[]; // stored files the server no longer lists
  toDownload: ManifestFile[]; // new files and files whose hash changed, in manifest order
}

export interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
  stoppedBecause: "finished" | "paused" | "network" | "storage-full" | "no-manifest" | "already-running";
}

/** What the sync needs from the outside; all injectable so tests use stubs. */
export interface PackSyncDependencies {
  serverUrl: string;
  fetchWithTimeout: (url: string, timeoutMs: number) => Promise<Response>;
  store?: {
    load: () => Promise<StoredPackFile[]>;
    save: (file: StoredPackFile) => Promise<void>;
    remove: (name: string) => Promise<void>;
  };
  isPaused?: () => boolean;
  hasRoomFor?: (bytes: number) => Promise<boolean>;
  onChanged?: () => void;
  recordStatus?: (status: PackSyncStatus) => void;
  caps?: { maxFileBytes: number; maxTotalBytes: number };
}

let isSyncing = false;

/** True when a manifest entry has a safe name, a matching kind, a sane size and a real SHA-256. */
function isValidManifestFile(entry: unknown): entry is ManifestFile {
  if (typeof entry !== "object" || entry === null) return false;
  const file = entry as Partial<ManifestFile>;
  if (typeof file.name !== "string" || !SAFE_NAME.test(file.name) || file.name.includes("..")) return false;
  const kind = kindOfExtension(file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase());
  return (
    kind !== null &&
    kind === file.kind &&
    typeof file.size === "number" &&
    Number.isInteger(file.size) &&
    file.size > 0 &&
    typeof file.sha256 === "string" &&
    SHA256_HEX.test(file.sha256)
  );
}

/**
 * The usable files of a manifest response body.
 * @returns the valid entries (invalid ones dropped), or null when the body is not a manifest at all
 */
export function parseManifest(body: unknown): ManifestFile[] | null {
  const files = (body as { files?: unknown } | null)?.files;
  if (!Array.isArray(files)) return null;
  return files.filter(isValidManifestFile);
}

/**
 * Decide what to delete and what to download.
 * - Stored files missing from the manifest are deleted.
 * - A manifest file that is new, or stored with a different hash, is downloaded.
 * - A file over the per-file cap is never downloaded; once the files that
 *   will be kept plus those chosen reach the total cap, later ones are left out.
 * @param manifest  the server's valid files
 * @param stored  what is on the device now
 * @param caps  the per-file and total caps in bytes
 */
export function planSync(
  manifest: ManifestFile[],
  stored: Pick<StoredPackFile, "name" | "sha256">[],
  caps: { maxFileBytes: number; maxTotalBytes: number },
): SyncPlan {
  const manifestNames = new Set(manifest.map((file) => file.name));
  const storedHashes = new Map(stored.map((file) => [file.name, file.sha256]));
  const toDelete = stored.filter((file) => !manifestNames.has(file.name)).map((file) => file.name);
  const upToDate = manifest.filter((file) => storedHashes.get(file.name) === file.sha256);
  let totalBytes = upToDate.reduce((sum, file) => sum + file.size, 0);
  const toDownload: ManifestFile[] = [];
  for (const file of manifest) {
    if (storedHashes.get(file.name) === file.sha256) continue;
    if (file.size > caps.maxFileBytes || totalBytes + file.size > caps.maxTotalBytes) continue;
    totalBytes += file.size;
    toDownload.push(file);
  }
  return { toDelete, toDownload };
}

/** The SHA-256 of a blob as lower-case hex, the same form the server's manifest uses. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** True unless the browser reports too little free storage for a file of this size. */
async function browserHasRoomFor(bytes: number): Promise<boolean> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate || estimate.quota === undefined || estimate.usage === undefined) return true;
    return estimate.quota - estimate.usage > bytes * STORAGE_MARGIN_FACTOR;
  } catch {
    return true; // cannot tell: try, and let a real quota error stop us
  }
}

/** Whether an error is the browser saying storage is full. */
function isQuotaError(error: unknown): boolean {
  return error instanceof Error && error.name === "QuotaExceededError";
}

/** Download one file; null unless the whole file arrived and matches the manifest's size and hash. */
async function downloadVerified(file: ManifestFile, dependencies: PackSyncDependencies): Promise<Blob | null> {
  const url = `${dependencies.serverUrl}/tipApp/celebrations/${encodeURIComponent(file.name)}`;
  const response = await dependencies.fetchWithTimeout(url, DOWNLOAD_TIMEOUT_MS);
  if (!response.ok) return null;
  const blob = await response.blob();
  const isComplete = blob.size === file.size && (await sha256Hex(blob)) === file.sha256;
  return isComplete ? blob : null;
}

/** What happened to one planned file. */
type FileOutcome = "added" | "updated" | "skipped" | "paused" | "storage-full" | "network";

/**
 * Download and store one file. Stops the whole run (paused, storage-full or
 * network) or reports "skipped" when only this file failed its size or hash
 * check, which is retried at the next check.
 */
async function downloadOne(
  file: ManifestFile,
  isUpdate: boolean,
  dependencies: Required<PackSyncDependencies>,
): Promise<FileOutcome> {
  if (dependencies.isPaused()) return "paused";
  if (!(await dependencies.hasRoomFor(file.size))) return "storage-full";
  try {
    const blob = await downloadVerified(file, dependencies);
    if (blob === null) return "skipped";
    await dependencies.store.save({ name: file.name, kind: file.kind, size: file.size, sha256: file.sha256, blob });
    return isUpdate ? "updated" : "added";
  } catch (error) {
    return isQuotaError(error) ? "storage-full" : "network";
  }
}

/**
 * Download the planned files one at a time, recording what changed.
 * @returns why it stopped: "finished" when every file was handled, or
 *   "paused" (a celebration started), "storage-full" or "network" (it
 *   simply ends; the next check carries on)
 */
async function downloadFiles(
  plan: SyncPlan,
  storedNames: Set<string>,
  dependencies: Required<PackSyncDependencies>,
  result: SyncResult,
): Promise<SyncResult["stoppedBecause"]> {
  for (const file of plan.toDownload) {
    const outcome = await downloadOne(file, storedNames.has(file.name), dependencies);
    if (outcome === "added") result.added.push(file.name);
    else if (outcome === "updated") result.updated.push(file.name);
    else if (outcome !== "skipped") return outcome;
  }
  return "finished";
}

/** Fetch the manifest; null when the server did not give a usable one. */
async function fetchManifest(dependencies: PackSyncDependencies): Promise<ManifestFile[] | null> {
  const response = await dependencies.fetchWithTimeout(`${dependencies.serverUrl}/tipApp/celebrations`, MANIFEST_TIMEOUT_MS);
  return response.ok ? parseManifest(await response.json()) : null;
}

/**
 * Apply a manifest: delete what the server dropped, then download what is new or changed.
 * @param reportFileCount  told how many pack files the device holds once done
 */
async function syncFiles(
  manifest: ManifestFile[],
  dependencies: Required<PackSyncDependencies>,
  result: SyncResult,
  reportFileCount: (count: number) => void,
): Promise<void> {
  const stored = await dependencies.store.load();
  let fileCount = stored.length;
  reportFileCount(fileCount);
  const plan = planSync(manifest, stored, dependencies.caps);
  for (const name of plan.toDelete) {
    await dependencies.store.remove(name);
    result.removed.push(name);
    reportFileCount(--fileCount);
  }
  result.stoppedBecause = await downloadFiles(plan, new Set(stored.map((file) => file.name)), dependencies, result);
  reportFileCount(fileCount + result.added.length);
}

/** The given dependencies with the real store, pause rule, storage check and limits filled in. */
function withDefaults(dependencies: PackSyncDependencies): Required<PackSyncDependencies> {
  return {
    store: { load: loadStoredPackFiles, save: savePackFile, remove: deletePackFile },
    isPaused: () => celebrationState.current !== null,
    hasRoomFor: browserHasRoomFor,
    onChanged: () => {},
    recordStatus: recordPackSyncStatus,
    caps: { maxFileBytes: PACK_MAX_FILE_BYTES, maxTotalBytes: PACK_MAX_TOTAL_BYTES },
    ...dependencies,
  };
}

/** Hand the menu's status line what this sync achieved (a failure to record is ignored). */
function reportOutcome(result: SyncResult, fileCount: number, record: (status: PackSyncStatus) => void): void {
  if (result.stoppedBecause === "already-running") return;
  const outcomes: Record<Exclude<SyncResult["stoppedBecause"], "already-running">, PackSyncStatus["outcome"]> = {
    finished: "ok",
    paused: "paused",
    network: "network",
    "storage-full": "storage-full",
    "no-manifest": "no-server-pack",
  };
  try {
    record({ time: new Date().toISOString(), fileCount, outcome: outcomes[result.stoppedBecause] });
  } catch {
    // The status line is a convenience only.
  }
}

/**
 * Bring the device's pack in line with the server's. Never throws; runs at
 * most once at a time. Call it only after the home server has been verified.
 * @param dependencies  the server address, fetch, and (for tests) the store and limits
 */
export async function syncCelebrationPack(dependencies: PackSyncDependencies): Promise<SyncResult> {
  const result: SyncResult = { added: [], updated: [], removed: [], stoppedBecause: "finished" };
  let fileCount = 0; // pack files on the device once the sync is done
  if (isSyncing) return { ...result, stoppedBecause: "already-running" };
  isSyncing = true;
  const resolved = withDefaults(dependencies);
  try {
    const manifest = await fetchManifest(resolved);
    if (manifest === null) result.stoppedBecause = "no-manifest";
    else await syncFiles(manifest, resolved, result, (count) => (fileCount = count));
  } catch {
    result.stoppedBecause = "network"; // offline, timed out, or storage unreadable: quietly end
  } finally {
    isSyncing = false;
  }
  reportOutcome(result, fileCount, resolved.recordStatus);
  if (result.added.length + result.updated.length + result.removed.length > 0) {
    try {
      resolved.onChanged();
    } catch {
      // A failure refreshing the in-memory pack must not look like a sync failure.
    }
  }
  return result;
}
