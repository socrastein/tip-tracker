import { Tip } from "./ClassTip";
import { TipRepository } from "./TipRepository";
import { getYearMonthDayString } from "./Dates";

/**
 * Backs up the locally-stored tips to the home server (Flask app at /tipApp).
 *
 * start() runs runBackupCheck() immediately and then once an hour.
 * Each check:
 *   1. Pings the home server (GET /tipApp/health, with a timeout) and
 *      verifies its identity token. This doubles as the "connected to the
 *      home network" check — browsers can't enumerate networks, but the
 *      server only exists on the home LAN, so if it answers AND presents
 *      our token we're home and it's really our server (not some unrelated
 *      service that happens to live at the same address on another LAN).
 *      Unreachable or unrecognized → skip.
 *   2. Skips if a backup was already created that day (one per day).
 *   3. Skips if the tips haven't changed since the last successful backup
 *      (compared against a canonical snapshot kept in localStorage).
 *   4. Otherwise POSTs ALL tips to /tipApp/tips, where the server archives
 *      them. Tracking is only written on success, so a failed attempt is
 *      retried on the next tick.
 *
 * The phone's localStorage stays the source of truth; this is a one-way
 * backup and never modifies local tips.
 */
export const BackupService = {
  // Home server address (Flask app). Can be overridden in localStorage under
  // SERVER_URL_KEY without rebuilding, e.g. if the home IP changes.
  DEFAULT_SERVER_URL: "http://192.168.0.2:5000",

  // Must match HEALTH_TOKEN in pythonServer/tipApp/routes.py. The server
  // presents it from GET /tipApp/health so we can refuse to talk to a
  // different server that happens to live at the same address.
  HEALTH_TOKEN: "tip-tracker-home-server",

  // localStorage keys for backup state. They must NOT contain Tip._prefix
  // ("tipTracker(storedTip)") — TipRepository treats any key containing it
  // as a tip and would try to parse these as tip data.
  SERVER_URL_KEY: "tipTracker(backup).serverUrl",
  LAST_BACKUP_DATE_KEY: "tipTracker(backup).lastBackupDate",
  LAST_PAYLOAD_KEY: "tipTracker(backup).lastPayload",

  BACKUP_INTERVAL_MS: 60 * 60 * 1000, // ping once an hour
  HEALTH_TIMEOUT_MS: 5 * 1000,
  POST_TIMEOUT_MS: 30 * 1000,

  _timer: null as number | null,

  getServerUrl(): string {
    return localStorage.getItem(this.SERVER_URL_KEY) || this.DEFAULT_SERVER_URL;
  },

  /**
   * True only if THIS is our home server: /tipApp/health answers AND presents
   * the expected identity token. A dead end, an unrelated service at the
   * same address, or a server presenting the wrong token all return false,
   * so tips are never saved to or loaded from an unverified server.
   */
  async verifyHomeServer(): Promise<boolean> {
    const url = `${this.getServerUrl()}/tipApp/health`;
    try {
      const response = await this._fetchWithTimeout(url, undefined, this.HEALTH_TIMEOUT_MS);
      if (!response.ok) {
        console.log(
          `[BackupService] ${url} responded with status ${response.status}, skipping backup`
        );
        return false;
      }
      const data = await response.json();
      if (data && typeof data === "object" && data.token === this.HEALTH_TOKEN) {
        return true;
      }
      console.log(
        `[BackupService] Server at ${url} did not present the expected identity — not the home server, skipping backup`
      );
      return false;
    } catch (error) {
      console.log(`[BackupService] Home server at ${url} unreachable:`, error);
      return false;
    }
  },

  /** fetch() that gives up after timeoutMs instead of hanging the check. */
  async _fetchWithTimeout(url: string, options: RequestInit | undefined, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /** True if a backup was already created today (local date). */
  hasBackupToday(): boolean {
    return localStorage.getItem(this.LAST_BACKUP_DATE_KEY) === getYearMonthDayString();
  },

  /**
   * Canonical snapshot of the tips: only the fields the server stores,
   * sorted by date then shift — so the same set of tips always produces
   * the same string no matter what order they're loaded in.
   */
  buildTipsPayload(tips: Tip[]): string {
    const payload = tips
      .map((tip) => ({
        amount: tip.amount,
        date: tip.date,
        type: tip.type,
        shift: tip.shift,
      }))
      .sort((a, b) =>
        a.date === b.date ? a.shift.localeCompare(b.shift) : a.date < b.date ? -1 : 1
      );
    return JSON.stringify(payload);
  },

  /** True if the tips differ from the snapshot taken at the last successful backup. */
  tipsChangedSinceLastBackup(tips: Tip[]): boolean {
    const lastPayload = localStorage.getItem(this.LAST_PAYLOAD_KEY);
    return lastPayload === null || lastPayload !== this.buildTipsPayload(tips);
  },

  /** POST all tips to the server, which archives them. True on success. */
  async sendTipsToServer(tips: Tip[]): Promise<boolean> {
    try {
      const response = await this._fetchWithTimeout(
        `${this.getServerUrl()}/tipApp/tips`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.buildTipsPayload(tips),
        },
        this.POST_TIMEOUT_MS
      );
      return response.ok;
    } catch (error) {
      console.error("[BackupService] Failed to send tips to server:", error);
      return false;
    }
  },

  /** Record a successful backup: today's date plus the snapshot just sent. */
  recordBackup(payload: string): void {
    localStorage.setItem(this.LAST_BACKUP_DATE_KEY, getYearMonthDayString());
    localStorage.setItem(this.LAST_PAYLOAD_KEY, payload);
  },

  /** One hourly check: ping → once-per-day guard → change check → send all. */
  async runBackupCheck(): Promise<void> {
    const stamp = () => new Date().toISOString();

    if (!(await this.verifyHomeServer())) {
      console.log(`[${stamp()}] [BackupService] Home server not verified, skipping backup`);
      return;
    }

    if (this.hasBackupToday()) {
      console.log(`[${stamp()}] [BackupService] Backup already created today, skipping`);
      return;
    }

    let tips: Tip[];
    try {
      // Fresh read from localStorage — the source of truth for "modified since last save".
      tips = TipRepository.loadAllFromStorage();
    } catch (error) {
      console.error(`[${stamp()}] [BackupService] Could not load tips for backup:`, error);
      return;
    }

    if (tips.length === 0) {
      // Nothing to back up — and the server refuses empty lists anyway.
      console.log(`[${stamp()}] [BackupService] No tips stored, nothing to back up`);
      return;
    }

    const lastPayload = localStorage.getItem(this.LAST_PAYLOAD_KEY);
    const payload = this.buildTipsPayload(tips);
    if (lastPayload !== null && lastPayload === payload) {
      console.log(`[${stamp()}] [BackupService] Tips unchanged since last backup, skipping`);
      return;
    }

    const success = await this.sendTipsToServer(tips);
    if (success) {
      this.recordBackup(payload);
      console.log(`[${stamp()}] [BackupService] Backed up ${tips.length} tips to the home server`);
    } else {
      // Leave tracking untouched so the next tick retries.
      console.warn(`[${stamp()}] [BackupService] Backup failed, will retry on the next check`);
    }
  },

  /**
   * Start the hourly checks (also runs one immediately).
   * Calling start() more than once is a no-op; stop() cancels the interval.
   */
  start(): void {
    if (this._timer !== null) return;
    this.runBackupCheck();
    this._timer = setInterval(() => {
      this.runBackupCheck();
    }, this.BACKUP_INTERVAL_MS);
    console.log(
      `[BackupService] Started — checking for a backup every ${this.BACKUP_INTERVAL_MS / 60000} minutes`
    );
  },

  stop(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },
};
