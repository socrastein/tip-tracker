/// <reference types="vitest" />
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupMockLocalStorage } from "../MockLocalStorage";
import { mockTip } from "../MockTips";
import { TipRepository } from "../../scripts/TipRepository";
import { BackupService } from "../../scripts/BackupService";
import { recordPackSyncStatus, getPackSyncStatus, describePackSyncStatus } from "../../scripts/CelebrationPackStatus";

describe("BackupService hook for the celebration pack", () => {
  setupMockLocalStorage();
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    TipRepository.saveAllToStorage([mockTip(100)]);
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    BackupService.onHomeServerVerified = null;
    delete globalThis.fetch;
    vi.restoreAllMocks();
  });

  const healthOk = () => ({ ok: true, json: async () => ({ app: "tipApp", token: BackupService.HEALTH_TOKEN }) });

  it("runs after the health check succeeds, riding on that one check", async () => {
    const listener = vi.fn();
    BackupService.onHomeServerVerified = listener;
    fetchMock.mockResolvedValueOnce(healthOk()).mockResolvedValue({ ok: true });
    await BackupService.runBackupCheck();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/tipApp/health"))).toHaveLength(1);
  });

  it("does not run when the health check fails", async () => {
    const listener = vi.fn();
    BackupService.onHomeServerVerified = listener;
    fetchMock.mockRejectedValue(new Error("network down"));
    await BackupService.runBackupCheck();
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not run when the server answers with the wrong identity", async () => {
    const listener = vi.fn();
    BackupService.onHomeServerVerified = listener;
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token: "someone else" }) });
    await BackupService.runBackupCheck();
    expect(listener).not.toHaveBeenCalled();
  });

  it("a failing listener never stops the backup", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    BackupService.onHomeServerVerified = () => {
      throw new Error("pack sync exploded");
    };
    fetchMock.mockResolvedValueOnce(healthOk()).mockResolvedValue({ ok: true });
    await BackupService.runBackupCheck();
    const posted = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(posted).toBeDefined();
  });

  it("keeps pack data out of the backup payload", async () => {
    const payload = JSON.parse(BackupService.buildTipsPayload(TipRepository.loadAllFromStorage()));
    expect(Object.keys(payload[0]).sort()).toEqual(["amount", "date", "shift", "type"]);
  });
});

describe("pack sync status line", () => {
  setupMockLocalStorage();
  beforeEach(() => localStorage.clear());

  it("remembers and describes the last result", () => {
    recordPackSyncStatus({ time: "2026-11-13T18:40:00.000Z", fileCount: 3, outcome: "ok" });
    const status = getPackSyncStatus();
    expect(status.fileCount).toBe(3);
    expect(describePackSyncStatus(status)).toMatch(/^Pack: 3 files, /);
  });

  it("says why a sync failed", () => {
    const base = { time: "2026-11-13T18:40:00.000Z", fileCount: 1 };
    expect(describePackSyncStatus({ ...base, outcome: "network" })).toContain("could not reach the server");
    expect(describePackSyncStatus({ ...base, outcome: "storage-full" })).toContain("storage full");
    expect(describePackSyncStatus({ ...base, outcome: "no-server-pack" })).toContain("server gave no pack");
    expect(describePackSyncStatus({ ...base, outcome: "ok" })).toMatch(/^Pack: 1 file, /);
  });

  it("is empty when nothing is stored or the record is damaged", () => {
    expect(getPackSyncStatus()).toBeNull();
    localStorage.setItem("tipTracker(pack).lastSync", "{broken");
    expect(getPackSyncStatus()).toBeNull();
    localStorage.setItem("tipTracker(pack).lastSync", JSON.stringify({ time: "nope", fileCount: 1, outcome: "ok" }));
    expect(getPackSyncStatus()).toBeNull();
  });

  it("uses a key that the tip loader never reads", () => {
    recordPackSyncStatus({ time: "2026-11-13T18:40:00.000Z", fileCount: 3, outcome: "ok" });
    expect(TipRepository.loadAllFromStorage()).toEqual([]);
  });
});
