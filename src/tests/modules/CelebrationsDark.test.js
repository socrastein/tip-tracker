/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp, h } from "vue";

// Everything a celebration could do out loud is watched: unlocking the audio context and playing a clip.
const unlock = vi.fn();
vi.mock("../../scripts/CelebrationSounds", () => ({
  unlockAudioContext: (...args) => unlock(...args),
  playCelebrationSound: vi.fn(),
  getAudioContext: vi.fn(),
}));
const playClip = vi.fn();
vi.mock("../../scripts/CustomCelebrationAudio", () => ({ playClip: (...args) => playClip(...args), decodeSound: vi.fn() }));
// A pack celebration is on the device, so a leak would have something to play.
vi.mock("../../scripts/CelebrationPackRuntime", () => ({
  getPackCelebrations: () => [{ name: "pack:aaaaaaaaaaaa", title: "Pack", clip: { duration: 2 }, imageUrl: "blob:cat" }],
  getPackImageUrls: () => ["blob:cat"],
  preparePackCelebrations: vi.fn(),
}));

import { celebrateIfBigTip, playCelebration } from "../../scripts/BigTipCelebrator";
import { celebrationState, endCelebration } from "../../scripts/CelebrationState";
import { BUILT_IN_CELEBRATIONS } from "../../scripts/CelebrationRotation";
import {
  celebrationSetupRouteGuard,
  isCelebrationsLive,
  onLiveChanged,
  recordLiveSetting,
} from "../../scripts/CelebrationsLive";
import { applyLiveSetting, startCelebrationFeatures } from "../../scripts/CelebrationsLifecycle";
import { configureGifSource, getGifPreloader } from "../../scripts/GifPreloader";
import { createGiphyGifSource } from "../../scripts/GiphyGifSource";
import { recordPackSyncStatus } from "../../scripts/CelebrationPackStatus";
import NavBarMenu from "../../components/NavBarMenu.vue";
import { createMemoryHistory, createRouter } from "vue-router";

/** Stop functions of the listeners a test registered, so one test's listeners never run in the next. */
let stopListening = [];
function startFeatures(features) {
  stopListening.push(startCelebrationFeatures(features));
}

beforeEach(() => {
  localStorage.clear();
  endCelebration();
  unlock.mockReset().mockReturnValue({});
  playClip.mockReset();
  configureGifSource(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("DEV", false); // a production build: import.meta.env.DEV is false there
});

afterEach(() => {
  stopListening.forEach((stop) => stop());
  stopListening = [];
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Mount the menu the way the nav bar does and return its text and links. */
async function mountMenu() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({ render: () => h(NavBarMenu) });
  app.use(router);
  app.mount(host);
  const text = host.textContent;
  const links = [...host.querySelectorAll("a")].map((link) => link.textContent.trim());
  app.unmount();
  host.remove();
  return { text, links };
}

describe("a production build is dark by default", () => {
  it("is not live until the home server has said so", () => {
    expect(isCelebrationsLive()).toBe(false);
  });

  it("celebrates nothing on a 600 dollar tip, built-ins included, and never touches audio", () => {
    const shown = [];
    for (let count = 0; count < 50; count++) celebrateIfBigTip(undefined, 700, (name) => shown.push(name));
    celebrateIfBigTip(undefined, 700); // the real player
    expect(shown).toEqual([]);
    expect(celebrationState.current).toBeNull();
    expect(unlock).not.toHaveBeenCalled();
    expect(playClip).not.toHaveBeenCalled();
    expect(localStorage.getItem("tipTracker(celebration).lastShown")).toBeNull(); // not even a rotation memory
  });

  it("plays nothing when a celebration is played directly, for any built-in or pack name", () => {
    for (const name of [...BUILT_IN_CELEBRATIONS, "custom", "pack:aaaaaaaaaaaa"]) playCelebration(name);
    expect(celebrationState.current).toBeNull();
    expect(unlock).not.toHaveBeenCalled();
  });

  it("keeps the menu free of Celebration Setup and the Pack line, even with a sync status stored", async () => {
    recordPackSyncStatus({ time: "2026-11-13T18:40:00.000Z", celebrationCount: 2, outcome: "ok" });
    const menu = await mountMenu();
    expect(menu.links).toEqual(["Home", "Stats Page"]);
    expect(menu.text).not.toMatch(/celebrat/i);
    expect(menu.text).not.toContain("Pack:");
  });

  it("sends the celebration setup address Home", () => {
    expect(celebrationSetupRouteGuard()).toEqual({ name: "home" });
  });

  it("makes no request to the GIF provider and decodes nothing at start-up", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const features = {
      prepareCustom: vi.fn(),
      preparePack: vi.fn(),
      startGifs: vi.fn(() => {
        configureGifSource(createGiphyGifSource("made-up-key", fetchSpy));
        getGifPreloader().preloadNext();
      }),
      stopGifs: vi.fn(() => configureGifSource(null)),
    };
    startFeatures(features);
    await Promise.resolve();
    expect(features.startGifs).not.toHaveBeenCalled();
    expect(features.prepareCustom).not.toHaveBeenCalled();
    expect(features.preparePack).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    delete globalThis.fetch;
  });
});

describe("going live and dark", () => {
  it("starts the features the moment the phone turns live, and stops the GIFs when it goes dark", () => {
    const features = { prepareCustom: vi.fn(), preparePack: vi.fn(), startGifs: vi.fn(), stopGifs: vi.fn() };
    startFeatures(features);
    recordLiveSetting(true);
    expect(features.startGifs).toHaveBeenCalledTimes(1);
    expect(features.preparePack).toHaveBeenCalledTimes(1);
    expect(features.prepareCustom).toHaveBeenCalledTimes(1);
    recordLiveSetting(true); // the same answer again changes nothing
    expect(features.startGifs).toHaveBeenCalledTimes(1);
    features.stopGifs.mockClear();
    recordLiveSetting(false);
    expect(features.stopGifs).toHaveBeenCalledTimes(1);
  });

  it("applyLiveSetting only starts things when live", () => {
    const features = { prepareCustom: vi.fn(), preparePack: vi.fn(), startGifs: vi.fn(), stopGifs: vi.fn() };
    applyLiveSetting(false, features);
    expect(features.startGifs).not.toHaveBeenCalled();
    applyLiveSetting(true, features);
    expect(features.startGifs).toHaveBeenCalled();
  });

  it("celebrates, shows the menu items and opens the setup page once live", async () => {
    recordLiveSetting(true);
    recordPackSyncStatus({ time: "2026-11-13T18:40:00.000Z", celebrationCount: 2, outcome: "ok" });
    const shown = [];
    for (let count = 0; count < 100; count++) celebrateIfBigTip(undefined, 700, (name) => shown.push(name));
    expect(shown.length).toBeGreaterThan(0);
    expect(celebrationSetupRouteGuard()).toBe(true);
    const menu = await mountMenu();
    expect(menu.links).toContain("Celebration Setup");
    expect(menu.text).toContain("Pack: 2 celebrations");
  });

  it("plays the celebration and unlocks sound when live", () => {
    recordLiveSetting(true);
    playCelebration("pack:aaaaaaaaaaaa");
    expect(celebrationState.current?.name).toBe("pack:aaaaaaaaaaaa");
    expect(unlock).toHaveBeenCalled();
  });

  it("tells listeners only when the setting really changes, and a listener can stop listening", () => {
    const listener = vi.fn();
    const stop = onLiveChanged(listener);
    recordLiveSetting(false); // dark already
    expect(listener).not.toHaveBeenCalled();
    recordLiveSetting(true);
    expect(listener).toHaveBeenCalledWith(true);
    stop();
    recordLiveSetting(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("is dark again if storage cannot be read", () => {
    recordLiveSetting(true);
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isCelebrationsLive()).toBe(false);
  });
});

describe("the dev server counts as live", () => {
  it("celebrates and shows the menu items without any manifest", async () => {
    vi.stubEnv("DEV", true);
    expect(isCelebrationsLive()).toBe(true);
    const shown = [];
    for (let count = 0; count < 50; count++) celebrateIfBigTip(undefined, 700, (name) => shown.push(name));
    expect(shown.length).toBeGreaterThan(0);
    expect((await mountMenu()).links).toContain("Celebration Setup");
  });
});
