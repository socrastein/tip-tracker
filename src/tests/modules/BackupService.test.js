/// <reference types="vitest" />
/** @vitest-environment node  */

import { expect, it, describe, beforeEach, afterEach, vi } from "vitest";
import { setupMockLocalStorage } from "../MockLocalStorage";
import { mockTip } from "../MockTips";
import { TipRepository } from "../../scripts/TipRepository";
import { BackupService } from "../../scripts/BackupService";
import { getYearMonthDayString } from "../../scripts/Dates";

describe("BackupService", () => {
  setupMockLocalStorage();

  // Deliberately NOT in date order — canonicalization must sort them.
  const tips = [
    mockTip(100), // 2025-09-10 Banquet Dinner (default date)
    mockTip(250, "2025-09-11", "Floor", "Lunch"),
    mockTip(75, "2025-09-09"),
  ];

  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    BackupService.stop();
    delete globalThis.fetch;
    vi.useRealTimers();
  });

  const seedTips = () => TipRepository.saveAllToStorage(tips);

  // The home server's health endpoint, presenting the identity token.
  const healthOk = () => ({
    ok: true,
    json: async () => ({ app: "tipApp", token: BackupService.HEALTH_TOKEN }),
  });

  // Server up and answering everything.
  const serverUp = () =>
    fetchMock.mockImplementation((url) =>
      Promise.resolve(String(url).endsWith("/tipApp/health") ? healthOk() : { ok: true })
    );

  describe("buildTipsPayload", () => {
    it("is a canonical string independent of tip order", () => {
      const reversed = [...tips].reverse();
      expect(BackupService.buildTipsPayload(tips)).toEqual(
        BackupService.buildTipsPayload(reversed)
      );
    });

    it("sorts by date then shift and keeps only server fields", () => {
      const payload = JSON.parse(BackupService.buildTipsPayload(tips));
      expect(payload.map((t) => t.amount)).toEqual([75, 100, 250]);
      for (const tip of payload) {
        expect(Object.keys(tip).sort()).toEqual(["amount", "date", "shift", "type"]);
      }
    });
  });

  describe("hasBackupToday", () => {
    it("is false when no backup has been recorded", () => {
      expect(BackupService.hasBackupToday()).toBeFalsy();
    });

    it("is true after recording a backup today", () => {
      BackupService.recordBackup("{}");
      expect(BackupService.hasBackupToday()).toBeTruthy();
    });

    it("is false when the last backup was yesterday", () => {
      const yesterday = getYearMonthDayString(Date.now() - 24 * 60 * 60 * 1000);
      localStorage.setItem(BackupService.LAST_BACKUP_DATE_KEY, yesterday);
      expect(BackupService.hasBackupToday()).toBeFalsy();
    });
  });

  describe("runBackupCheck", () => {
    it("pings the server then POSTs all tips when everything is fresh", async () => {
      seedTips();
      serverUp();

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [healthUrl, postUrl] = fetchMock.mock.calls.map((call) => call[0]);
      expect(String(healthUrl).endsWith("/health")).toBeTruthy();
      expect(String(postUrl).endsWith("/tipApp/tips")).toBeTruthy();

      const [, postOptions] = fetchMock.mock.calls[1];
      expect(postOptions.method).toEqual("POST");
      const body = JSON.parse(postOptions.body);
      expect(body.map((t) => t.amount)).toEqual([75, 100, 250]);

      // Success recorded: today's date + the snapshot just sent.
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toEqual(
        getYearMonthDayString()
      );
      expect(localStorage.getItem(BackupService.LAST_PAYLOAD_KEY)).toEqual(
        BackupService.buildTipsPayload(tips)
      );
    });

    it("does nothing when the home server is unreachable", async () => {
      seedTips();
      fetchMock.mockRejectedValue(new Error("network down"));

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(1); // health ping only
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toBeNull();
      expect(localStorage.getItem(BackupService.LAST_PAYLOAD_KEY)).toBeNull();
    });

    it("skips the POST when a backup was already created today", async () => {
      seedTips();
      serverUp();
      localStorage.setItem(BackupService.LAST_BACKUP_DATE_KEY, getYearMonthDayString());

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(1); // health ping only
      expect(localStorage.getItem(BackupService.LAST_PAYLOAD_KEY)).toBeNull();
    });

    it("skips the POST when tips are unchanged since the last backup", async () => {
      seedTips();
      serverUp();
      localStorage.setItem(BackupService.LAST_PAYLOAD_KEY, BackupService.buildTipsPayload(tips));

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(1); // health ping only
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toBeNull();
    });

    it("does not record a backup when the POST fails, so the next tick retries", async () => {
      seedTips();
      fetchMock.mockImplementation((url) =>
        Promise.resolve(String(url).endsWith("/tipApp/health") ? healthOk() : { ok: false })
      );

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toBeNull();
      expect(localStorage.getItem(BackupService.LAST_PAYLOAD_KEY)).toBeNull();
    });

    it("does not POST an empty tip list", async () => {
      serverUp();

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(1); // health ping only
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toBeNull();
    });
  });

  describe("verifyHomeServer", () => {
    it("is true when the server presents the expected identity token", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(healthOk()));
      expect(await BackupService.verifyHomeServer()).toBeTruthy();
    });

    it("is false for a different server at the same address (token mismatch)", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ app: "tipApp", token: "some-other-server" }),
        })
      );
      expect(await BackupService.verifyHomeServer()).toBeFalsy();
    });

    it("is false when the response is not the expected JSON object", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => "<html>unrelated service</html>" })
      );
      expect(await BackupService.verifyHomeServer()).toBeFalsy();
    });

    it("is false when the server is unreachable", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));
      expect(await BackupService.verifyHomeServer()).toBeFalsy();
    });

    it("gates the backup: no POST when the identity does not verify", async () => {
      seedTips();
      fetchMock.mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ token: "wrong" }) })
      );

      await BackupService.runBackupCheck();

      expect(fetchMock).toHaveBeenCalledTimes(1); // health only, no POST
      expect(localStorage.getItem(BackupService.LAST_BACKUP_DATE_KEY)).toBeNull();
    });
  });

  describe("start", () => {
    it("runs a check immediately and then once an hour", async () => {
      vi.useFakeTimers();
      serverUp(); // no tips seeded, so each check is just the health ping

      BackupService.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 30 minutes: still no new check.
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // One hour later: the next hourly check.
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("ignores repeated start() calls", async () => {
      vi.useFakeTimers();
      serverUp();

      BackupService.start();
      BackupService.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
