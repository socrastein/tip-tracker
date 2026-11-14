/// <reference types="vitest" />
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { celebrationState, endCelebration } from "../../scripts/CelebrationState";
import { isCelebrationsLive } from "../../scripts/CelebrationsLive";
import { parseLiveSetting, syncCelebrationPack, sha256Hex } from "../../scripts/CelebrationPackSync";
import { deletePackCelebration, loadStoredPackCelebrations, savePackCelebration } from "../../scripts/CelebrationPackStore";
import { createFakeIndexedDB } from "../MockIndexedDB";

// The sync as a production build runs it (the dev server would count as live whatever the manifest says).
beforeEach(() => {
  localStorage.clear();
  endCelebration();
  vi.stubEnv("DEV", false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the manifest's live setting through the sync", () => {
  let factory;
  let store;
  let live; // what the stub server says: true, false, or undefined (an older server)
  let offline;
  const sound = new Blob(["song bytes"]);

  async function fetchWithTimeout(url) {
    if (offline) throw new TypeError("Failed to fetch");
    const path = new URL(url).pathname;
    if (path === "/tipApp/celebrations") {
      const body = {
        celebrations: [
          { id: "aaaaaaaaaaaa", name: "Gold", startSeconds: 0, lengthSeconds: 3, sound: { size: sound.size, sha256: await sha256Hex(sound) }, picture: null },
        ],
      };
      if (live !== undefined) body.live = live;
      return new Response(JSON.stringify(body));
    }
    return new Response(sound);
  }

  const sync = () =>
    syncCelebrationPack({ serverUrl: "http://home.test:5000", fetchWithTimeout, store, hasRoomFor: async () => true, recordStatus: () => {} });

  beforeEach(() => {
    factory = createFakeIndexedDB();
    store = {
      load: () => loadStoredPackCelebrations(factory),
      save: (celebration) => savePackCelebration(celebration, factory),
      remove: (id) => deletePackCelebration(id, factory),
    };
    live = false;
    offline = false;
  });

  it("stays dark on live false, yet still stores the published celebrations silently", async () => {
    await sync();
    expect(isCelebrationsLive()).toBe(false);
    expect((await store.load()).map((entry) => entry.id)).toEqual(["aaaaaaaaaaaa"]);
    expect(celebrationState.current).toBeNull(); // the sync shows nothing
  });

  it("flips to live after one manifest with live true, and stays live offline", async () => {
    live = true;
    await sync();
    expect(isCelebrationsLive()).toBe(true);
    offline = true;
    await sync(); // away from home: no answer at all
    expect(isCelebrationsLive()).toBe(true);
  });

  it("goes dark again at the next check-in that says live false", async () => {
    live = true;
    await sync();
    live = false;
    await sync();
    expect(isCelebrationsLive()).toBe(false);
  });

  it("keeps its setting when the server gives no answer, an error, or an older manifest without live", async () => {
    live = true;
    await sync();
    live = undefined;
    await sync();
    expect(isCelebrationsLive()).toBe(true);
    await syncCelebrationPack({
      serverUrl: "http://home.test:5000",
      fetchWithTimeout: async () => new Response("damaged", { status: 503 }),
      store,
      recordStatus: () => {},
    });
    expect(isCelebrationsLive()).toBe(true);
  });

  it("an older server without live never turns a dark phone live", async () => {
    live = undefined;
    await sync();
    expect(isCelebrationsLive()).toBe(false);
  });

  it("reads only a real boolean as the setting", () => {
    expect(parseLiveSetting({ live: true })).toBe(true);
    expect(parseLiveSetting({ live: false })).toBe(false);
    for (const body of [{}, { live: "true" }, { live: 1 }, { live: null }, null, undefined, []]) {
      expect(parseLiveSetting(body)).toBeNull();
    }
  });
});
