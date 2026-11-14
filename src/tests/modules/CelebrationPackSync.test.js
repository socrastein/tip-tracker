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
import {
  deletePackCelebration,
  loadStoredPackCelebrations,
  savePackCelebration,
} from "../../scripts/CelebrationPackStore";
import { celebrationState, endCelebration, showCelebration } from "../../scripts/CelebrationState";
import { createFakeIndexedDB } from "../MockIndexedDB";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const CAPS = { maxFileBytes: 10, maxTotalBytes: 25 };
const ID_ONE = "111111111111";
const ID_TWO = "222222222222";
const ID_THREE = "333333333333";

/** A manifest medium of a made-up size and hash. */
const medium = (size = 5, sha256 = HASH_A) => ({ size, sha256 });

/** A manifest celebration with a sound of the given size (and no picture) unless told otherwise. */
function manifestEntry(id, overrides = {}) {
  return { id, name: "Made Up", startSeconds: 1, lengthSeconds: 2, sound: medium(), picture: null, ...overrides };
}

/** A stored celebration as the phone keeps it. */
function storedEntry(id, overrides = {}) {
  const stored = (size, sha256) => ({ size, sha256, blob: new Blob(["x".repeat(size)]) });
  return { id, name: "Made Up", startSeconds: 1, lengthSeconds: 2, sound: stored(5, HASH_A), picture: null, ...overrides };
}

describe("parseManifest", () => {
  it("keeps valid celebrations and drops invalid ones", () => {
    const body = {
      celebrations: [
        manifestEntry(ID_ONE),
        manifestEntry("../escape"),
        manifestEntry("ABCDEF123456"),
        manifestEntry(ID_TWO, { name: "" }),
        manifestEntry(ID_TWO, { name: "x".repeat(61) }),
        manifestEntry(ID_TWO, { sound: medium(5, "xyz") }),
        manifestEntry(ID_TWO, { sound: medium(0) }),
        manifestEntry(ID_TWO, { sound: medium(1.5) }),
        manifestEntry(ID_TWO, { sound: null, picture: null }),
        manifestEntry(ID_TWO, { lengthSeconds: 0 }),
        manifestEntry(ID_TWO, { startSeconds: -1 }),
        "not an object",
        null,
      ],
    };
    expect(parseManifest(body).map((entry) => entry.id)).toEqual([ID_ONE]);
  });

  it("accepts a length exactly at the clip cap and refuses one over it", () => {
    const body = { celebrations: [manifestEntry(ID_ONE, { lengthSeconds: 15 }), manifestEntry(ID_TWO, { lengthSeconds: 15.5 })] };
    expect(parseManifest(body).map((entry) => entry.id)).toEqual([ID_ONE]);
  });

  it("accepts a picture-only celebration and fills the missing sound with null", () => {
    const [entry] = parseManifest({ celebrations: [{ ...manifestEntry(ID_ONE), sound: undefined, picture: medium() }] });
    expect(entry.sound).toBeNull();
    expect(entry.picture).toEqual(medium());
  });

  it("gives null for anything that is not a manifest", () => {
    for (const body of [null, undefined, {}, { celebrations: "no" }, { files: [] }, 5, []]) {
      expect(parseManifest(body)).toBeNull();
    }
  });
});

describe("planSync", () => {
  it("syncs new celebrations", () => {
    const plan = planSync([manifestEntry(ID_ONE), manifestEntry(ID_TWO)], [], CAPS);
    expect(plan.toSync.map((entry) => entry.id)).toEqual([ID_ONE, ID_TWO]);
    expect(plan.toDelete).toEqual([]);
  });

  it("leaves an unchanged celebration alone", () => {
    const plan = planSync([manifestEntry(ID_ONE)], [storedEntry(ID_ONE)], CAPS);
    expect(plan.toSync).toEqual([]);
  });

  it("syncs a celebration again when a file's hash, its times or its name changed", () => {
    const stored = [storedEntry(ID_ONE), storedEntry(ID_TWO), storedEntry(ID_THREE)];
    const manifest = [
      manifestEntry(ID_ONE, { sound: medium(5, HASH_B) }),
      manifestEntry(ID_TWO, { startSeconds: 4 }),
      manifestEntry(ID_THREE, { name: "Renamed" }),
    ];
    expect(planSync(manifest, stored, CAPS).toSync.map((entry) => entry.id)).toEqual([ID_ONE, ID_TWO, ID_THREE]);
  });

  it("syncs a celebration that gained a picture", () => {
    const plan = planSync([manifestEntry(ID_ONE, { picture: medium(3, HASH_B) })], [storedEntry(ID_ONE)], CAPS);
    expect(plan.toSync.map((entry) => entry.id)).toEqual([ID_ONE]);
  });

  it("deletes stored celebrations the server no longer publishes", () => {
    const plan = planSync([manifestEntry(ID_TWO)], [storedEntry(ID_ONE), storedEntry(ID_TWO)], CAPS);
    expect(plan.toDelete).toEqual([ID_ONE]);
    expect(plan.toSync).toEqual([]);
  });

  it("accepts a file exactly at the per-file cap and refuses one byte over", () => {
    const plan = planSync([manifestEntry(ID_ONE, { sound: medium(10) }), manifestEntry(ID_TWO, { sound: medium(11) })], [], CAPS);
    expect(plan.toSync.map((entry) => entry.id)).toEqual([ID_ONE]);
  });

  it("fills the total cap exactly and refuses what would go one byte over", () => {
    const manifest = [
      manifestEntry(ID_ONE, { sound: medium(10) }),
      manifestEntry(ID_TWO, { sound: medium(10) }),
      manifestEntry(ID_THREE, { sound: medium(5) }),
      manifestEntry("444444444444", { sound: medium(1) }),
    ];
    const plan = planSync(manifest, [], CAPS);
    expect(plan.toSync.map((entry) => entry.id)).toEqual([ID_ONE, ID_TWO, ID_THREE]); // 25 bytes; the fourth would be 26
  });

  it("counts a celebration's sound and picture together against the total cap", () => {
    const both = manifestEntry(ID_ONE, { sound: medium(10), picture: medium(10, HASH_B) });
    const plan = planSync([both, manifestEntry(ID_TWO, { sound: medium(6) })], [], CAPS);
    expect(plan.toSync.map((entry) => entry.id)).toEqual([ID_ONE]); // 20 + 6 would be 26
  });

  it("counts celebrations already on the device against the total cap", () => {
    const stored = [storedEntry(ID_ONE), storedEntry(ID_TWO)];
    const manifest = [
      manifestEntry(ID_ONE, { sound: medium(10) }),
      manifestEntry(ID_TWO, { sound: medium(10) }),
      manifestEntry(ID_THREE, { sound: medium(6) }),
    ];
    const kept = stored.map((entry) => ({ ...entry, sound: { ...entry.sound, size: 10 } }));
    expect(planSync(manifest, kept, CAPS).toSync).toEqual([]); // 20 kept + 6 = 26 > 25
  });

  it("uses the same caps as the server", () => {
    expect(PACK_MAX_FILE_BYTES).toBe(8 * 1024 * 1024);
    expect(PACK_MAX_TOTAL_BYTES).toBe(40 * 1024 * 1024);
  });
});

describe("syncCelebrationPack", () => {
  let factory;
  let store;
  let server; // what the stub server publishes: id -> { name, startSeconds, lengthSeconds, sound: Blob|null, picture: Blob|null }
  let calls; // every URL fetched
  let failDownloadOf; // "<id>/<slot>" strings whose download throws (a dropped connection)
  let recorded;

  /** The manifest entry for a stub-server celebration, with real sizes and hashes. */
  async function manifestFor(id) {
    const { name, startSeconds, lengthSeconds, sound, picture } = server.get(id);
    const describeBlob = async (blob) => (blob ? { size: blob.size, sha256: await sha256Hex(blob) } : null);
    return { id, name, startSeconds, lengthSeconds, sound: await describeBlob(sound), picture: await describeBlob(picture) };
  }

  /** The stub server: GET /tipApp/celebrations and GET /tipApp/celebrations/media/<id>/<slot>. */
  async function fetchWithTimeout(url) {
    calls.push(url);
    const path = new URL(url).pathname;
    if (path === "/tipApp/celebrations") {
      return new Response(JSON.stringify({ celebrations: await Promise.all([...server.keys()].map(manifestFor)) }));
    }
    const [, , , , id, slot] = path.split("/");
    if (failDownloadOf.has(`${id}/${slot}`)) throw new TypeError("connection dropped");
    const blob = server.get(id)?.[slot];
    return blob ? new Response(blob) : new Response("missing", { status: 404 });
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

  const storedIds = async () => (await loadStoredPackCelebrations(factory)).map((entry) => entry.id).sort();
  const storedEntryFor = async (id) => (await loadStoredPackCelebrations(factory)).find((entry) => entry.id === id);

  beforeEach(() => {
    endCelebration();
    factory = createFakeIndexedDB();
    store = {
      load: () => loadStoredPackCelebrations(factory),
      save: (celebration) => savePackCelebration(celebration, factory),
      remove: (id) => deletePackCelebration(id, factory),
    };
    server = new Map([
      [ID_ONE, { name: "Both", startSeconds: 2, lengthSeconds: 3, sound: new Blob(["song bytes"]), picture: new Blob(["pic bytes"]) }],
      [ID_TWO, { name: "Sound", startSeconds: 0, lengthSeconds: 5, sound: new Blob(["other song"]), picture: null }],
    ]);
    calls = [];
    failDownloadOf = new Set();
    recorded = [];
  });

  it("downloads new celebrations, with their times and name, into the device store", async () => {
    const result = await sync();
    expect(result.added.sort()).toEqual([ID_ONE, ID_TWO]);
    expect(result.stoppedBecause).toBe("finished");
    const both = await storedEntryFor(ID_ONE);
    expect(both).toMatchObject({ name: "Both", startSeconds: 2, lengthSeconds: 3 });
    expect(await both.sound.blob.text()).toBe("song bytes");
    expect(await both.picture.blob.text()).toBe("pic bytes");
    expect((await storedEntryFor(ID_TWO)).picture).toBeNull();
  });

  it("asks for media by id and slot", async () => {
    await sync();
    expect(calls).toContain(`http://home.test:5000/tipApp/celebrations/media/${ID_ONE}/sound`);
    expect(calls).toContain(`http://home.test:5000/tipApp/celebrations/media/${ID_ONE}/picture`);
    expect(calls).not.toContain(`http://home.test:5000/tipApp/celebrations/media/${ID_TWO}/picture`);
  });

  it("downloads nothing the second time when nothing changed", async () => {
    await sync();
    calls = [];
    const result = await sync();
    expect(result.added).toEqual([]);
    expect(calls).toEqual(["http://home.test:5000/tipApp/celebrations"]); // the manifest only
  });

  it("updates a celebration whose sound changed, without fetching its unchanged picture", async () => {
    await sync();
    server.get(ID_ONE).sound = new Blob(["a different song"]);
    calls = [];
    const result = await sync();
    expect(result.updated).toEqual([ID_ONE]);
    expect(calls.some((url) => url.endsWith(`${ID_ONE}/picture`))).toBe(false);
    expect(await (await storedEntryFor(ID_ONE)).sound.blob.text()).toBe("a different song");
  });

  it("updates only the record, downloading no media, when just its times or name changed", async () => {
    await sync();
    Object.assign(server.get(ID_TWO), { name: "Renamed", startSeconds: 7 });
    calls = [];
    const result = await sync();
    expect(result.updated).toEqual([ID_TWO]);
    expect(calls).toEqual(["http://home.test:5000/tipApp/celebrations"]);
    expect(await storedEntryFor(ID_TWO)).toMatchObject({ name: "Renamed", startSeconds: 7 });
  });

  it("removes a celebration that was unpublished", async () => {
    await sync();
    server.delete(ID_ONE);
    const result = await sync();
    expect(result.removed).toEqual([ID_ONE]);
    expect(await storedIds()).toEqual([ID_TWO]);
  });

  it("removes a picture that was taken off a celebration", async () => {
    await sync();
    server.get(ID_ONE).picture = null;
    await sync();
    expect((await storedEntryFor(ID_ONE)).picture).toBeNull();
  });

  it("stores nothing of a celebration whose download was interrupted, and resumes next time", async () => {
    failDownloadOf.add(`${ID_ONE}/picture`); // its sound arrives, then the connection drops
    const first = await sync();
    expect(first.stoppedBecause).toBe("network");
    expect(await storedIds()).toEqual([]); // never half a celebration

    failDownloadOf.clear();
    const second = await sync();
    expect(second.added.sort()).toEqual([ID_ONE, ID_TWO]);
  });

  it("never stores a truncated download, and still syncs the others", async () => {
    const truncatingFetch = async (url) => {
      if (url.endsWith(`${ID_ONE}/sound`)) return new Response(new Blob(["song"])); // shorter than the manifest says
      return fetchWithTimeout(url);
    };
    const result = await sync({ fetchWithTimeout: truncatingFetch });
    expect(result.added).toEqual([ID_TWO]);
    expect(await storedIds()).toEqual([ID_TWO]);
  });

  it("never stores a file whose hash does not match, even at the right size", async () => {
    const swappingFetch = async (url) => {
      if (url.endsWith(`${ID_ONE}/sound`)) return new Response(new Blob(["song BYTES"])); // same 10 bytes, other content
      return fetchWithTimeout(url);
    };
    const result = await sync({ fetchWithTimeout: swappingFetch });
    expect(await storedIds()).toEqual([ID_TWO]);
    expect(result.added).toEqual([ID_TWO]);
  });

  it("stops quietly when storage is full, keeping what fit", async () => {
    const quota = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    let saves = 0;
    const result = await sync({
      store: {
        ...store,
        save: async (celebration) => {
          if (++saves > 1) throw quota;
          return store.save(celebration);
        },
      },
    });
    expect(result.stoppedBecause).toBe("storage-full");
    expect(await storedIds()).toEqual([ID_ONE]);
  });

  it("stops before downloading when the browser reports too little room", async () => {
    const result = await sync({ hasRoomFor: async () => false });
    expect(result.stoppedBecause).toBe("storage-full");
    expect(calls).toEqual(["http://home.test:5000/tipApp/celebrations"]);
  });

  it("respects the caps it is given", async () => {
    server.set("444444444444", { name: "Big", startSeconds: 0, lengthSeconds: 1, sound: new Blob(["x".repeat(30)]), picture: null });
    const result = await sync({ caps: { maxFileBytes: 20, maxTotalBytes: 1000 } });
    expect(result.added.sort()).toEqual([ID_ONE, ID_TWO]);
    expect(await storedIds()).not.toContain("444444444444");
  });

  it("does not run during a celebration, and carries on afterwards", async () => {
    showCelebration("billsRain");
    expect(celebrationState.current).not.toBeNull();
    const paused = await sync();
    expect(paused.stoppedBecause).toBe("paused");
    expect(await storedIds()).toEqual([]);

    endCelebration();
    expect((await sync()).added.sort()).toEqual([ID_ONE, ID_TWO]);
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

  it("refuses manifest ids that could leave the media path", async () => {
    const hostileFetch = async (url) => {
      calls.push(url);
      return new Response(JSON.stringify({ celebrations: [manifestEntry("../../etc/passwd")] }));
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
      "a damaged index (503)": async () => new Response("damaged", { status: 503 }),
      "a response that is not JSON": async () => new Response("<html>"),
      "a response that is not a manifest": async () => new Response(JSON.stringify({ nope: true })),
    };
    for (const [name, failingFetch] of Object.entries(failures)) {
      it(`on ${name}`, async () => {
        await expect(sync({ fetchWithTimeout: failingFetch })).resolves.toBeDefined();
        expect(await storedIds()).toEqual([]);
      });
    }
  });

  it("keeps what is on the device when the server cannot be reached or gives no manifest", async () => {
    await sync();
    await sync({ fetchWithTimeout: async () => new Response("boom", { status: 500 }) });
    expect(await storedIds()).toEqual([ID_ONE, ID_TWO]);
  });

  it("records its last result for the menu", async () => {
    await sync();
    expect(recorded.at(-1)).toMatchObject({ celebrationCount: 2, outcome: "ok" });
    server.delete(ID_ONE);
    await sync();
    expect(recorded.at(-1)).toMatchObject({ celebrationCount: 1, outcome: "ok" });
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
