/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { describeExportResult, exportAllTips, exportFileName } from "../../scripts/TipExporter";
import { BackupService } from "../../scripts/BackupService";
import { TipRepository } from "../../scripts/TipRepository";
import { mockTip } from "../MockTips";

// Deliberately out of order: the export must sort them like the backup does.
const TIPS = [
  mockTip(100, "2026-11-10"),
  mockTip(250, "2026-11-09", "Floor", "Lunch"),
  mockTip(75, "2026-11-09"),
];

/** A fake browser: records shares and downloads. */
function environment(overrides = {}) {
  const shared = [];
  const downloaded = [];
  return {
    shared,
    downloaded,
    today: () => "2026-11-14",
    share: async (data) => void shared.push(data),
    canShareFiles: () => true,
    download: (tips, filename) => void downloaded.push({ tips, filename }),
    ...overrides,
  };
}

describe("the exported text", () => {
  it("is exactly the canonical backup payload for the same tips", () => {
    expect(TipRepository.exportTipsToJSON(TIPS)).toBe(BackupService.buildTipsPayload(TIPS));
  });

  it("is a list sorted by date then shift, with only amount, date, type and shift", () => {
    const parsed = JSON.parse(TipRepository.exportTipsToJSON(TIPS));
    expect(parsed.map((tip) => `${tip.date} ${tip.shift}`)).toEqual([
      "2026-11-09 Dinner",
      "2026-11-09 Lunch",
      "2026-11-10 Dinner",
    ]);
    for (const tip of parsed) expect(Object.keys(tip).sort()).toEqual(["amount", "date", "shift", "type"]);
  });

  it("is the same list the server stores (a plain list, not wrapped)", () => {
    expect(Array.isArray(JSON.parse(TipRepository.exportTipsToJSON(TIPS)))).toBe(true);
  });

  it("is the text inside the shared file", async () => {
    const env = environment();
    await exportAllTips(TIPS, env);
    const file = env.shared[0].files[0];
    const text = await new Promise((resolve) => {
      const reader = new FileReader(); // jsdom's File has no text() method
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });
    expect(text).toBe(BackupService.buildTipsPayload(TIPS));
  });
});

describe("exportFileName", () => {
  it("is tips-YYYY-MM-DD.json", () => {
    expect(exportFileName("2026-11-14")).toBe("tips-2026-11-14.json");
  });
});

describe("exportAllTips", () => {
  it("shares the file when the browser can share files", async () => {
    const env = environment();
    const result = await exportAllTips(TIPS, env);
    expect(result).toEqual({ kind: "shared", count: 3 });
    expect(env.shared).toHaveLength(1);
    expect(env.shared[0].files[0].name).toBe("tips-2026-11-14.json");
    expect(env.shared[0].files[0].type).toBe("application/json");
    expect(env.downloaded).toEqual([]);
  });

  it("downloads when the browser cannot share at all", async () => {
    const env = environment({ share: null });
    const result = await exportAllTips(TIPS, env);
    expect(result).toEqual({ kind: "downloaded", count: 3, filename: "tips-2026-11-14.json" });
    expect(env.downloaded).toHaveLength(1);
  });

  it("downloads when the browser can share but not files", async () => {
    const env = environment({ canShareFiles: () => false });
    const result = await exportAllTips(TIPS, env);
    expect(result.kind).toBe("downloaded");
    expect(env.shared).toEqual([]);
  });

  it("treats a closed share sheet as cancelled: no download, nothing alarming", async () => {
    const env = environment({
      share: async () => {
        throw new DOMException("Share canceled", "AbortError");
      },
    });
    const result = await exportAllTips(TIPS, env);
    expect(result).toEqual({ kind: "cancelled" });
    expect(env.downloaded).toEqual([]);
    expect(describeExportResult(result)).toBeNull();
  });

  it("falls back to a download when sharing fails for another reason", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = environment({
      share: async () => {
        throw new DOMException("not allowed", "NotAllowedError");
      },
    });
    const result = await exportAllTips(TIPS, env);
    expect(result.kind).toBe("downloaded");
    expect(env.downloaded).toHaveLength(1);
  });

  it("does nothing for an empty catalogue", async () => {
    const env = environment();
    const result = await exportAllTips([], env);
    expect(result).toEqual({ kind: "empty" });
    expect(env.shared).toEqual([]);
    expect(env.downloaded).toEqual([]);
  });

  it("reports a failure when the browser refuses the download", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = environment({
      share: null,
      download: () => {
        throw new Error("blocked");
      },
    });
    expect(await exportAllTips(TIPS, env)).toEqual({ kind: "failed" });
  });

  it("detects sharing by feature, never by user agent", async () => {
    // A browser with a phone-like user agent but no share support still just downloads.
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    const env = environment({ share: null });
    expect((await exportAllTips(TIPS, env)).kind).toBe("downloaded");
  });
});

describe("export is read only", () => {
  let setItem;
  let removeItem;

  beforeEach(() => {
    localStorage.clear();
    setItem = vi.spyOn(Storage.prototype, "setItem");
    removeItem = vi.spyOn(Storage.prototype, "removeItem");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes and removes nothing in localStorage when sharing", async () => {
    await exportAllTips(TIPS, environment());
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("writes and removes nothing in localStorage when downloading with the real download", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const env = environment({
      share: null,
      download: (tips, filename) => TipRepository.downloadJSONFile(tips, filename),
    });
    expect((await exportAllTips(TIPS, env)).kind).toBe("downloaded");
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("does not touch the tips it is given", async () => {
    const before = JSON.stringify(TIPS.map((tip) => [tip.amount, tip.date, tip.type, tip.shift]));
    await exportAllTips(TIPS, environment());
    expect(JSON.stringify(TIPS.map((tip) => [tip.amount, tip.date, tip.type, tip.shift]))).toBe(before);
  });

  it("makes no network request", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    await exportAllTips(TIPS, environment());
    expect(fetchSpy).not.toHaveBeenCalled();
    delete globalThis.fetch;
  });
});

describe("TipRepository.downloadJSONFile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("clicks a link whose download name is the file name, then frees the address", () => {
    vi.useFakeTimers();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      expect(this.download).toBe("tips-2026-11-14.json");
      expect(this.href).toBe("blob:test");
    });
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    TipRepository.downloadJSONFile(TIPS, "tips-2026-11-14.json");
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull(); // the temporary link is removed
    vi.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    vi.useRealTimers();
  });
});

describe("describeExportResult", () => {
  it("says what was saved or shared, with the count and file name", () => {
    expect(describeExportResult({ kind: "downloaded", count: 1352, filename: "tips-2026-11-14.json" })).toBe(
      "Saved 1352 tips to tips-2026-11-14.json.",
    );
    expect(describeExportResult({ kind: "shared", count: 1352 })).toBe("Shared 1352 tips.");
  });

  it("uses the singular for one tip", () => {
    expect(describeExportResult({ kind: "shared", count: 1 })).toBe("Shared 1 tip.");
  });

  it("says plainly when there is nothing to export or the browser refuses", () => {
    expect(describeExportResult({ kind: "empty" })).toBe("There are no tips to export yet.");
    expect(describeExportResult({ kind: "failed" })).toMatch(/did not allow saving/);
  });
});
