import { deletePackCelebration, loadStoredPackCelebrations, savePackCelebration } from "./CelebrationPackStore";
import type { StoredMedium, StoredPackCelebration } from "./CelebrationPackStore";
import { recordPackSyncStatus } from "./CelebrationPackStatus";
import type { PackSyncStatus } from "./CelebrationPackStatus";
import { MAX_PACK_CLIP_SECONDS } from "./CelebrationClip";
import { celebrationState } from "./CelebrationState";

/**
 * Keeps the device's copy of the celebration pack in step with the PUBLISHED
 * celebrations on the home server. BackupService calls it once the home
 * server has proved it is the home server (its health check), so there is no
 * second polling loop.
 *
 * It is built to never get in the way:
 * - one file at a time, never while a celebration is on screen (it stops and
 *   the next hourly check carries on);
 * - a celebration is stored only when all its files are complete and match
 *   the manifest's size and hash, so an interrupted download just starts over
 *   and the phone never plays half a celebration;
 * - never throws, and any failure (offline, server error, full storage) just
 *   ends the run quietly;
 * - the caps below limit what is kept, and a full disk stops it politely.
 */

/** Same caps as the server (pythonServer tipApp/celebration_store.py): the phone is the second line of defence. */
export const PACK_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const PACK_MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const MANIFEST_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const STORAGE_MARGIN_FACTOR = 2; // keep room for twice a celebration's files before downloading it
const SHA256_HEX = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[0-9a-f]{12}$/;
const MAX_START_SECONDS = 3600;
const MAX_NAME_LENGTH = 60;

export type MediumSlot = "sound" | "picture";
const SLOTS: MediumSlot[] = ["sound", "picture"];

/** What the manifest says about one medium. */
export interface ManifestMedium {
  size: number;
  sha256: string;
}

/** One published celebration as the server's manifest lists it. */
export interface ManifestCelebration {
  id: string;
  name: string;
  startSeconds: number;
  lengthSeconds: number;
  sound: ManifestMedium | null;
  picture: ManifestMedium | null;
}

export interface SyncPlan {
  toDelete: string[]; // stored celebrations the server no longer publishes
  toSync: ManifestCelebration[]; // new or changed celebrations, in manifest order
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
    load: () => Promise<StoredPackCelebration[]>;
    save: (celebration: StoredPackCelebration) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  isPaused?: () => boolean;
  hasRoomFor?: (bytes: number) => Promise<boolean>;
  onChanged?: () => void;
  recordStatus?: (status: PackSyncStatus) => void;
  caps?: { maxFileBytes: number; maxTotalBytes: number };
}

let isSyncing = false;

/** True for a medium entry with a sane size and a real SHA-256 (or null, meaning none). */
function isValidMedium(value: unknown): value is ManifestMedium | null {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const medium = value as Partial<ManifestMedium>;
  return (
    typeof medium.size === "number" &&
    Number.isInteger(medium.size) &&
    medium.size > 0 &&
    typeof medium.sha256 === "string" &&
    SHA256_HEX.test(medium.sha256)
  );
}

/** True for a celebration entry with a safe id, sane times, and at least one medium. */
function isValidCelebration(entry: unknown): entry is ManifestCelebration {
  if (typeof entry !== "object" || entry === null) return false;
  const value = entry as Partial<ManifestCelebration>;
  return (
    typeof value.id === "string" &&
    SAFE_ID.test(value.id) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= MAX_NAME_LENGTH &&
    typeof value.startSeconds === "number" &&
    value.startSeconds >= 0 &&
    value.startSeconds <= MAX_START_SECONDS &&
    typeof value.lengthSeconds === "number" &&
    value.lengthSeconds > 0 &&
    value.lengthSeconds <= MAX_PACK_CLIP_SECONDS &&
    isValidMedium(value.sound ?? null) &&
    isValidMedium(value.picture ?? null) &&
    (value.sound ?? value.picture) != null
  );
}

/**
 * The usable celebrations of a manifest response body.
 * @returns the valid entries (invalid ones dropped), or null when the body is not a manifest at all
 */
export function parseManifest(body: unknown): ManifestCelebration[] | null {
  const celebrations = (body as { celebrations?: unknown } | null)?.celebrations;
  if (!Array.isArray(celebrations)) return null;
  return celebrations.filter(isValidCelebration).map((entry) => ({
    ...entry,
    sound: entry.sound ?? null,
    picture: entry.picture ?? null,
  }));
}

/** The media a manifest celebration has, as [slot, medium] pairs. */
function mediaOf(celebration: ManifestCelebration): [MediumSlot, ManifestMedium][] {
  return SLOTS.flatMap((slot) =>
    celebration[slot] ? [[slot, celebration[slot] as ManifestMedium] as [MediumSlot, ManifestMedium]] : [],
  );
}

function totalSize(celebration: ManifestCelebration): number {
  return mediaOf(celebration).reduce((sum, [, medium]) => sum + medium.size, 0);
}

/** Whether the device already holds exactly what the manifest says (same text, times and file hashes). */
function isUpToDate(manifest: ManifestCelebration, stored: StoredPackCelebration | undefined): boolean {
  if (stored === undefined) return false;
  return (
    stored.name === manifest.name &&
    stored.startSeconds === manifest.startSeconds &&
    stored.lengthSeconds === manifest.lengthSeconds &&
    SLOTS.every((slot) => (stored[slot]?.sha256 ?? null) === (manifest[slot]?.sha256 ?? null))
  );
}

/**
 * Decide what to delete and what to sync.
 * - Stored celebrations the manifest no longer lists are deleted.
 * - A manifest celebration that is new, or differs from the stored one, is synced.
 * - One with a file over the per-file cap is never synced; once the
 *   celebrations kept as they are plus those chosen reach the total cap,
 *   later ones are left out.
 * @param manifest  the server's valid, published celebrations
 * @param stored  what is on the device now
 * @param caps  the per-file and total caps in bytes
 */
export function planSync(
  manifest: ManifestCelebration[],
  stored: StoredPackCelebration[],
  caps: { maxFileBytes: number; maxTotalBytes: number },
): SyncPlan {
  const storedById = new Map(stored.map((celebration) => [celebration.id, celebration]));
  const listed = new Set(manifest.map((celebration) => celebration.id));
  const toDelete = stored.filter((celebration) => !listed.has(celebration.id)).map((celebration) => celebration.id);
  const upToDate = manifest.filter((celebration) => isUpToDate(celebration, storedById.get(celebration.id)));
  let totalBytes = upToDate.reduce((sum, celebration) => sum + totalSize(celebration), 0);
  const toSync: ManifestCelebration[] = [];
  for (const celebration of manifest) {
    if (isUpToDate(celebration, storedById.get(celebration.id))) continue;
    const hasOversizedFile = mediaOf(celebration).some(([, medium]) => medium.size > caps.maxFileBytes);
    if (hasOversizedFile || totalBytes + totalSize(celebration) > caps.maxTotalBytes) continue;
    totalBytes += totalSize(celebration);
    toSync.push(celebration);
  }
  return { toDelete, toSync };
}

/** The SHA-256 of a blob as lower-case hex, the same form the server's manifest uses. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** True unless the browser reports too little free storage for this many bytes. */
async function browserHasRoomFor(bytes: number): Promise<boolean> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate || estimate.quota === undefined || estimate.usage === undefined) return true;
    return estimate.quota - estimate.usage > bytes * STORAGE_MARGIN_FACTOR;
  } catch {
    return true; // cannot tell: try, and let a real quota error stop us
  }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof Error && error.name === "QuotaExceededError";
}

/** Download one medium; null unless the whole file arrived and matches the manifest's size and hash. */
async function downloadVerified(
  url: string,
  medium: ManifestMedium,
  dependencies: PackSyncDependencies,
): Promise<StoredMedium | null> {
  const response = await dependencies.fetchWithTimeout(url, DOWNLOAD_TIMEOUT_MS);
  if (!response.ok) return null;
  const blob = await response.blob();
  const isComplete = blob.size === medium.size && (await sha256Hex(blob)) === medium.sha256;
  return isComplete ? { size: medium.size, sha256: medium.sha256, blob } : null;
}

/** Why a celebration's sync did not finish (other than "skipped", which concerns that celebration alone). */
type StopReason = "paused" | "storage-full" | "network" | "skipped";

/** The result of getting one medium: the medium, or the reason to stop. */
type MediumStep = { medium: StoredMedium } | { stop: StopReason };

/**
 * Get one medium: the stored copy when its hash still matches, otherwise a
 * verified download (unless a celebration is on screen, or there is no room).
 */
async function obtainMedium(
  request: { celebrationId: string; slot: MediumSlot; wanted: ManifestMedium },
  kept: StoredMedium | null | undefined,
  dependencies: Required<PackSyncDependencies>,
): Promise<MediumStep> {
  const { celebrationId, slot, wanted } = request;
  if (kept && kept.sha256 === wanted.sha256) return { medium: kept };
  if (dependencies.isPaused()) return { stop: "paused" };
  if (!(await dependencies.hasRoomFor(wanted.size))) return { stop: "storage-full" };
  const url = `${dependencies.serverUrl}/tipApp/celebrations/media/${celebrationId}/${slot}`;
  const medium = await downloadVerified(url, wanted, dependencies);
  // A bad download skips this celebration only: it is tried again at the next check.
  return medium === null ? { stop: "skipped" } : { medium };
}

/** All of a celebration's media, fetched one at a time; or the reason that ended it. */
async function obtainAllMedia(
  manifest: ManifestCelebration,
  stored: StoredPackCelebration | undefined,
  dependencies: Required<PackSyncDependencies>,
): Promise<{ media: Record<MediumSlot, StoredMedium | null> } | { stop: StopReason }> {
  const media: Record<MediumSlot, StoredMedium | null> = { sound: null, picture: null };
  for (const [slot, wanted] of mediaOf(manifest)) {
    const step = await obtainMedium({ celebrationId: manifest.id, slot, wanted }, stored?.[slot], dependencies);
    if ("stop" in step) return step;
    media[slot] = step.medium;
  }
  return { media };
}

/**
 * Bring one celebration up to date: get its media, then store the whole
 * record at once (never half a celebration).
 * @returns "added" or "updated", or the reason it did not finish
 */
async function syncOne(
  manifest: ManifestCelebration,
  stored: StoredPackCelebration | undefined,
  dependencies: Required<PackSyncDependencies>,
): Promise<"added" | "updated" | StopReason> {
  try {
    const result = await obtainAllMedia(manifest, stored, dependencies);
    if ("stop" in result) return result.stop;
    const { id, name, startSeconds, lengthSeconds } = manifest;
    await dependencies.store.save({ id, name, startSeconds, lengthSeconds, ...result.media });
    return stored === undefined ? "added" : "updated";
  } catch (error) {
    return isQuotaError(error) ? "storage-full" : "network";
  }
}

/** What a run of syncOne calls achieved, and why it ended. */
type SyncProgress = Pick<SyncResult, "added" | "updated" | "stoppedBecause">;

/**
 * Sync the planned celebrations one at a time.
 * @returns what was added or updated, and why it stopped: "finished" when all
 *   were handled, or "paused" (a celebration started), "storage-full" or
 *   "network" (it simply ends; the next check carries on)
 */
async function syncCelebrations(
  toSync: ManifestCelebration[],
  storedById: Map<string, StoredPackCelebration>,
  dependencies: Required<PackSyncDependencies>,
): Promise<SyncProgress> {
  const progress: SyncProgress = { added: [], updated: [], stoppedBecause: "finished" };
  for (const celebration of toSync) {
    const outcome = await syncOne(celebration, storedById.get(celebration.id), dependencies);
    if (outcome === "added") progress.added.push(celebration.id);
    else if (outcome === "updated") progress.updated.push(celebration.id);
    else if (outcome !== "skipped") return { ...progress, stoppedBecause: outcome };
  }
  return progress;
}

/** Fetch the manifest; null when the server did not give a usable one. */
async function fetchManifest(dependencies: PackSyncDependencies): Promise<ManifestCelebration[] | null> {
  const response = await dependencies.fetchWithTimeout(`${dependencies.serverUrl}/tipApp/celebrations`, MANIFEST_TIMEOUT_MS);
  return response.ok ? parseManifest(await response.json()) : null;
}

/**
 * Apply a manifest: delete what the server no longer publishes, then sync what is new or changed.
 * @param reportCount  told how many celebrations the device holds once done
 */
async function syncAgainstManifest(
  manifest: ManifestCelebration[],
  dependencies: Required<PackSyncDependencies>,
  result: SyncResult,
  reportCount: (count: number) => void,
): Promise<void> {
  const stored = await dependencies.store.load();
  let count = stored.length;
  reportCount(count);
  const plan = planSync(manifest, stored, dependencies.caps);
  for (const id of plan.toDelete) {
    await dependencies.store.remove(id);
    result.removed.push(id);
    reportCount(--count);
  }
  const storedById = new Map(stored.map((celebration) => [celebration.id, celebration]));
  const progress = await syncCelebrations(plan.toSync, storedById, dependencies);
  Object.assign(result, progress); // added, updated and why it stopped
  reportCount(count + result.added.length);
}

/** The given dependencies with the real store, pause rule, storage check and limits filled in. */
function withDefaults(dependencies: PackSyncDependencies): Required<PackSyncDependencies> {
  return {
    store: {
      load: loadStoredPackCelebrations,
      save: savePackCelebration,
      remove: deletePackCelebration,
    },
    isPaused: () => celebrationState.current !== null,
    hasRoomFor: browserHasRoomFor,
    onChanged: () => {},
    recordStatus: recordPackSyncStatus,
    caps: {
      maxFileBytes: PACK_MAX_FILE_BYTES,
      maxTotalBytes: PACK_MAX_TOTAL_BYTES,
    },
    ...dependencies,
  };
}

/** Hand the menu's status line what this sync achieved (a failure to record is ignored). */
function reportOutcome(result: SyncResult, count: number, record: (status: PackSyncStatus) => void): void {
  if (result.stoppedBecause === "already-running") return;
  const outcomes: Record<Exclude<SyncResult["stoppedBecause"], "already-running">, PackSyncStatus["outcome"]> = {
    finished: "ok",
    paused: "paused",
    network: "network",
    "storage-full": "storage-full",
    "no-manifest": "no-server-pack",
  };
  try {
    record({
      time: new Date().toISOString(),
      celebrationCount: count,
      outcome: outcomes[result.stoppedBecause],
    });
  } catch {
    // The status line is a convenience only.
  }
}

/** Tell the app to re-prepare its pack, but only if this sync changed anything. */
function notifyIfChanged(result: SyncResult, onChanged: () => void): void {
  if (result.added.length + result.updated.length + result.removed.length === 0) return;
  try {
    onChanged();
  } catch {
    // A failure refreshing the in-memory pack must not look like a sync failure.
  }
}

/** Run one sync against the server; returns how it went and how many celebrations the device holds. */
async function runSync(resolved: Required<PackSyncDependencies>): Promise<{ result: SyncResult; count: number }> {
  const result: SyncResult = { added: [], updated: [], removed: [], stoppedBecause: "finished" };
  let count = 0; // celebrations on the device once the sync is done
  try {
    const manifest = await fetchManifest(resolved);
    if (manifest === null) result.stoppedBecause = "no-manifest";
    else await syncAgainstManifest(manifest, resolved, result, (newCount) => (count = newCount));
  } catch {
    result.stoppedBecause = "network"; // offline, timed out, or storage unreadable: quietly end
  }
  return { result, count };
}

/**
 * Bring the device's pack in line with the server's published celebrations.
 * Never throws; runs at most once at a time. Call it only after the home
 * server has been verified.
 * @param dependencies  the server address, fetch, and (for tests) the store and limits
 */
export async function syncCelebrationPack(dependencies: PackSyncDependencies): Promise<SyncResult> {
  if (isSyncing) return { added: [], updated: [], removed: [], stoppedBecause: "already-running" };
  isSyncing = true;
  const resolved = withDefaults(dependencies);
  try {
    const { result, count } = await runSync(resolved);
    reportOutcome(result, count, resolved.recordStatus);
    notifyIfChanged(result, resolved.onChanged);
    return result;
  } finally {
    isSyncing = false;
  }
}
