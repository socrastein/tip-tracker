/// <reference types="vitest" />
/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PACK_MAX_FILE_BYTES,
  PACK_MAX_TOTAL_BYTES,
  parseManifest,
  planSync,
  sha256Hex,
  syncCelebrationPack,
} from "../../scripts/CelebrationPackSync";
import { deletePackFile, loadStoredPackFiles, savePackFile } from "../../scripts/CelebrationPackStore";
import { celebrationState, endCelebration, showCelebration } from "../../scripts/CelebrationState";
import { createFakeIndexedDB } from "../MockIndexedDB";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const CAPS = { maxFileBytes: 10, maxTotalBytes: 25 };

/** A manifest entry for a made-up file. */
function entry(name, size = 5, sha256 = HASH_A) {
  const kind = /\.(mp3|m4a|ogg|wav)$/.test(name) ? "sound" : "image";
  return { name, kind, size, sha256 };
}

describe("parseManifest", () => {
  it("keeps valid entries and drops invalid ones", () => {
    const body = {
      files: [
        entry("tips.mp3"),
        entry("../escape.mp3"),
        entry("sub/dir.mp3"),
        entry("tips.txt"),
        { ...entry("wrongkind.gif"), kind: "sound" },
        { ...entry("badhash.gif"), sha256: "xyz" },
        { ...entry("zero.gif"), size: 0 },
        { ...entry("frac.gif"), size: 1.5 },
        "not an object",
        null,
      ],
    };
    expect(parseManifest(body).map((file) => file.name)).toEqual(["tips.mp3"]);
  });

  it("gives null for anything that is not a manifest", () => {
    for (const body of [null, undefined, {}, { files: "no" }, 5, []]) {
      expect(parseManifest(body)).toBeNull();
    }
  });
});

describe("planSync", () => {
  it("downloads new files", () => {
    const plan = planSync([entry("a.mp3"), entry("b.gif")], [], CAPS);
    expect(plan.toDownload.map((file) => file.name)).toEqual(["a.mp3", "b.gif"]);
    expect(plan.toDelete).toEqual([]);
  });

  it("downloads a file again when its hash changed, but not when it is unchanged", () => {
    const stored = [{ name: "a.mp3", sha256: HASH_A }, { name: "b.gif", sha256: HASH_A }];
    const plan = planSync([entry("a.mp3", 5, HASH_B), entry("b.gif", 5, HASH_A)], stored, CAPS);
    expect(plan.toDownload.map((file) => file.name)).toEqual(["a.mp3"]);
  });

  it("deletes stored files the server no longer lists", () => {
    const stored = [{ name: "gone.mp3", sha256: HASH_A }, { name: "keep.gif", sha256: HASH_A }];
    const plan = planSync([entry("keep.gif")], stored, CAPS);
    expect(plan.toDelete).toEqual(["gone.mp3"]);
    expect(plan.toDownload).toEqual([]);
  });

  it("accepts a file exactly at the per-file cap and refuses one byte over", () => {
    const plan = planSync([entry("ok.mp3", 10), entry("big.mp3", 11)], [], CAPS);
    expect(plan.toDownload.map((file) => file.name)).toEqual(["ok.mp3"]);
  });

  it("fills the total cap exactly and refuses what would go one byte over", () => {
    const manifest = [entry("a.mp3", 10), entry("b.mp3", 10), entry("c.mp3", 5), entry("d.mp3", 1)];
    const plan = planSync(manifest, [], CAPS);
    expect(plan.toDownload.map((file) => file.name)).toEqual(["a.mp3", "b.mp3", "c.mp3"]); // 25 bytes; d would be 26
  });

  it("counts files already on the device against the total cap", () => {
    const stored = [{ name: "a.mp3", sha256: HASH_A }, { name: "b.mp3", sha256: HASH_A }];
    const plan = planSync([entry("a.mp3", 10), entry("b.mp3", 10), entry("c.mp3", 6)], stored, CAPS);
    expect(plan.toDownload).toEqual([]); // 20 kept + 6 = 26 > 25
  });

  it("uses the same caps as the server", () => {
    expect(PACK_MAX_FILE_BYTES).toBe(8 * 1024 * 1024);
    expect(PACK_MAX_TOTAL_BYTES).toBe(40 * 1024 * 1024);
  });
});

describe("syncCelebrationPack", () => {
  let factory;
  let store;
  let files; // what the stub server has: name -> Blob
  let calls; // every URL fetched
  let failDownloadOf; // names whose download throws (a dropped connection)
  let recorded;

  /** The manifest entry for a stub-server file, with its real hash. */
  async function manifestEntry(name) {
    const blob = files.get(name);
    return { name, kind: entry(name).kind, size: blob.size, sha256: await sha256Hex(blob) };
  }

  /** The stub server: GET /tipApp/celebrations and GET /tipApp/celebrations/<name>. */
  async function fetchWithTimeout(url) {
    calls.push(url);
    const path = new URL(url).pathname;
    if (path === "/tipApp/celebrations") {
      return new Response(JSON.stringify({ files: await Promise.all([...files.keys()].map(manifestEntry)) }));
    }
    const name = decodeURIComponent(path.split("/").pop());
    if (failDownloadOf.has(name)) throw new TypeError("connection dropped");
    if (!files.has(name)) return new Response("missing", { status: 404 });
    return new Response(files.get(name));
  }

  function sync(overrides = {}) {
    return syncCelebrationPack({
      serverUrl: "http://home.test:5000",
      fetchWithTimeout,
      store,
      hasRoomFor: async () => true,
      recordStatus: (status) => recorded.push(status),
      ...overrides,
    });
  }

  const storedNames = async () => (await loadStoredPackFiles(factory)).map((file) => file.name).sort();

  beforeEach(() => {
    endCelebration();
    factory = createFakeIndexedDB();
    store = {
      load: () => loadStoredPackFiles(factory),
      save: (file) => savePackFile(file, factory),
      remove: (name) => deletePackFile(name, factory),
    };
    files = new Map([
      ["tips.mp3", new Blob(["song bytes"])],
      ["tips.gif", new Blob(["gif bytes"])],
    ]);
    calls = [];
    failDownloadOf = new Set();
    recorded = [];
  });

  it("downloads new files into the device store", async () => {
    const result = await sync();
    expect(result.added.sort()).toEqual(["tips.gif", "tips.mp3"]);
    expect(result.stoppedBecause).toBe("finished");
    expect(await storedNames()).toEqual(["tips.gif", "tips.mp3"]);
    const stored = (await loadStoredPackFiles(factory)).find((file) => file.name === "tips.mp3");
    expect(await stored.blob.text()).toBe("song bytes");
  });

  it("downloads nothing the second time when nothing changed", async () => {
    await sync();
    calls = [];
    const result = await sync();
    expect(result.added).toEqual([]);
    expect(calls).toEqual(["http://home.test:5000/tipApp/celebrations"]); // the manifest only
  });

  it("updates a file whose hash changed", async () => {
    await sync();
    files.set("tips.mp3", new Blob(["a different song"]));
    const result = await sync();
    expect(result.updated).toEqual(["tips.mp3"]);
    const stored = (await loadStoredPackFiles(factory)).find((file) => file.name === "tips.mp3");
    expect(await stored.blob.text()).toBe("a different song");
  });

  it("removes local files the server no longer has", async () => {
    await sync();
    files.delete("tips.gif");
    const result = await sync();
    expect(result.removed).toEqual(["tips.gif"]);
    expect(await storedNames()).toEqual(["tips.mp3"]);
  });

  it("survives an interrupted download: keeps what finished and resumes next time", async () => {
    failDownloadOf.add("tips.gif"); // manifest order: tips.mp3 downloads first, then tips.gif drops
    const first = await sync();
    expect(first.stoppedBecause).toBe("network");
    expect(await storedNames()).toEqual(["tips.mp3"]);

    failDownloadOf.clear();
    calls = [];
    const second = await sync();
    expect(second.added).toEqual(["tips.gif"]);
    expect(calls.some((url) => url.endsWith("/tips.mp3"))).toBe(false); // the finished file is not fetched again
  });

  it("never stores a truncated or altered download", async () => {
    const truncatingFetch = async (url) => {
      if (url.endsWith("/tips.mp3")) return new Response(new Blob(["song"])); // shorter than the manifest says
      return fetchWithTimeout(url);
    };
    const result = await sync({ fetchWithTimeout: truncatingFetch });
    expect(result.added).toEqual(["tips.gif"]);
    expect(await storedNames()).toEqual(["tips.gif"]);
  });

  it("never stores a file whose hash does not match, even at the right size", async () => {
    const swappingFetch = async (url) => {
      if (url.endsWith("/tips.mp3")) return new Response(new Blob(["song BYTES"])); // same 10 bytes, other content
      return fetchWithTimeout(url);
    };
    const result = await sync({ fetchWithTimeout: swappingFetch });
    expect(await storedNames()).toEqual(["tips.gif"]);
    expect(result.added).toEqual(["tips.gif"]);
  });

  it("stops quietly when storage is full, keeping what fit", async () => {
    const quota = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    let saves = 0;
    const result = await sync({
      store: {
        ...store,
        save: async (file) => {
          if (++saves > 1) throw quota;
          return store.save(file);
        },
      },
    });
    expect(result.stoppedBecause).toBe("storage-full");
    expect(await storedNames()).toEqual(["tips.mp3"]);
  });

  it("stops before downloading when the browser reports too little room", async () => {
    const result = await sync({ hasRoomFor: async () => false });
    expect(result.stoppedBecause).toBe("storage-full");
    expect(calls).toEqual(["http://home.test:5000/tipApp/celebrations"]);
  });

  it("respects the caps it is given", async () => {
    files.set("big.mp3", new Blob(["x".repeat(30)]));
    const result = await sync({ caps: { maxFileBytes: 20, maxTotalBytes: 1000 } });
    expect(result.added.sort()).toEqual(["tips.gif", "tips.mp3"]);
    expect(await storedNames()).not.toContain("big.mp3");
  });

  it("does not run during a celebration, and carries on afterwards", async () => {
    showCelebration("billsRain");
    expect(celebrationState.current).not.toBeNull();
    const paused = await sync();
    expect(paused.stoppedBecause).toBe("paused");
    expect(await storedNames()).toEqual([]);

    endCelebration();
    expect((await sync()).added.sort()).toEqual(["tips.gif", "tips.mp3"]);
  });

  it("downloads one file at a time", async () => {
    let inFlight = 0;
    let mostAtOnce = 0;
    const countingFetch = async (url) => {
      inFlight++;
      mostAtOnce = Math.max(mostAtOnce, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      try {
        return await fetchWithTimeout(url);
      } finally {
        inFlight--;
      }
    };
    await sync({ fetchWithTimeout: countingFetch });
    expect(mostAtOnce).toBe(1);
  });

  it("runs only once at a time", async () => {
    const [first, second] = await Promise.all([sync(), sync()]);
    expect([first.stoppedBecause, second.stoppedBecause].sort()).toEqual(["already-running", "finished"]);
  });

  it("encodes the file name in the download address", async () => {
    files = new Map([["we are@3+2.mp3", new Blob(["x"])]]);
    await sync();
    expect(calls[1]).toBe("http://home.test:5000/tipApp/celebrations/we%20are%403%2B2.mp3");
  });

  it("refuses manifest names that could leave the folder", async () => {
    const hostileFetch = async (url) => {
      calls.push(url);
      return new Response(JSON.stringify({ files: [entry("../../etc/passwd.mp3"), entry("ok.mp3")] }));
    };
    await sync({ fetchWithTimeout: hostileFetch });
    expect(calls.every((url) => !url.includes(".."))).toBe(true);
  });

  describe("every failure ends quietly without throwing", () => {
    const failures = {
      "the server being unreachable": async () => {
        throw new TypeError("Failed to fetch");
      },
      "a server error": async () => new Response("boom", { status: 500 }),
      "a response that is not JSON": async () => new Response("<html>"),
      "a response that is not a manifest": async () => new Response(JSON.stringify({ nope: true })),
    };
    for (const [name, failingFetch] of Object.entries(failures)) {
      it(`on ${name}`, async () => {
        await expect(sync({ fetchWithTimeout: failingFetch })).resolves.toBeDefined();
        expect(await storedNames()).toEqual([]);
      });
    }
  });

  it("records its last result for the menu", async () => {
    await sync();
    expect(recorded.at(-1)).toMatchObject({ fileCount: 2, outcome: "ok" });
    files.delete("tips.gif");
    await sync();
    expect(recorded.at(-1)).toMatchObject({ fileCount: 1, outcome: "ok" });
    await sync({ fetchWithTimeout: async () => new Response("no", { status: 500 }) });
    expect(recorded.at(-1).outcome).toBe("no-server-pack");
  });

  it("tells the app to refresh its prepared pack only when something changed", async () => {
    const onChanged = vi.fn();
    await sync({ onChanged });
    expect(onChanged).toHaveBeenCalledTimes(1);
    await sync({ onChanged });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
