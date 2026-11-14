/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The pack's prepared celebrations, set by each test.
let prepared = [];
let imageUrls = [];
vi.mock("../../scripts/CelebrationPackRuntime", () => ({
  getPackCelebrations: () => prepared,
  getPackImageUrls: () => imageUrls,
}));
const unlock = vi.fn();
vi.mock("../../scripts/CelebrationSounds", () => ({
  unlockAudioContext: (...args) => unlock(...args),
  playCelebrationSound: vi.fn(),
  getAudioContext: vi.fn(),
}));
const playClip = vi.fn();
vi.mock("../../scripts/CustomCelebrationAudio", () => ({ playClip: (...args) => playClip(...args), decodeSound: vi.fn() }));

import { availableCelebrations, celebrateIfBigTip, playCelebration } from "../../scripts/BigTipCelebrator";
import { celebrationState, endCelebration } from "../../scripts/CelebrationState";
import { BUILT_IN_CELEBRATIONS } from "../../scripts/CelebrationRotation";
import { getGifPreloader } from "../../scripts/GifPreloader";
import { playCelebrationSound } from "../../scripts/CelebrationSounds";

const CLIP = { duration: 2 };

beforeEach(() => {
  localStorage.clear();
  endCelebration();
  prepared = [];
  imageUrls = [];
  unlock.mockReset().mockReturnValue({});
  playClip.mockReset();
  vi.mocked(playCelebrationSound).mockReset();
  getGifPreloader().setReady(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pack celebrations in the rotation", () => {
  it("join the built-ins once a pack is on the device", () => {
    prepared = [{ name: "pack:tips", clip: CLIP, imageUrl: null }];
    expect(availableCelebrations()).toEqual([...BUILT_IN_CELEBRATIONS, "pack:tips"]);
  });

  it("are simply absent with no pack", () => {
    expect(availableCelebrations()).toEqual([...BUILT_IN_CELEBRATIONS]);
  });

  it("can be chosen, and are never chosen twice in a row", () => {
    prepared = [{ name: "pack:tips", clip: CLIP, imageUrl: "blob:cat" }];
    const shown = [];
    for (let count = 0; count < 300; count++) celebrateIfBigTip(undefined, 700, (name) => shown.push(name));
    expect(shown).toContain("pack:tips");
    for (let index = 1; index < shown.length; index++) expect(shown[index]).not.toBe(shown[index - 1]);
  });
});

describe("playing a pack celebration", () => {
  it("plays a pair's clip and shows its picture", () => {
    prepared = [{ name: "pack:tips", clip: CLIP, imageUrl: "blob:cat" }];
    playCelebration("pack:tips");
    expect(playClip).toHaveBeenCalledWith({}, CLIP, { startSeconds: 0, lengthSeconds: 2 });
    expect(celebrationState.current.pictureUrl).toBe("blob:cat");
    expect(celebrationState.current.durationMs).toBe(4000); // the clip is short: the show keeps a minimum length
  });

  it("stays on screen a second past a long clip", () => {
    prepared = [{ name: "pack:tips", clip: { duration: 10 }, imageUrl: null }];
    playCelebration("pack:tips");
    expect(celebrationState.current.durationMs).toBe(11000);
  });

  it("gives a lone picture a synthesized sound", () => {
    prepared = [{ name: "pack:cat", clip: null, imageUrl: "blob:cat" }];
    playCelebration("pack:cat");
    expect(playClip).not.toHaveBeenCalled();
    expect(playCelebrationSound).toHaveBeenCalledTimes(1);
  });

  it("gives a lone sound a pack picture, or just bills when there is none", () => {
    prepared = [{ name: "pack:song", clip: CLIP, imageUrl: null }];
    playCelebration("pack:song");
    expect(celebrationState.current.pictureUrl).toBeNull();
    expect(celebrationState.current.gifUrl).toBeNull();

    imageUrls = ["blob:other"];
    playCelebration("pack:song");
    expect(celebrationState.current.pictureUrl).toBe("blob:other");
  });

  it("can give a lone sound the ready GIF", () => {
    prepared = [{ name: "pack:song", clip: CLIP, imageUrl: null }];
    getGifPreloader().setReady("https://gif/1");
    vi.spyOn(Math, "random").mockReturnValue(0);
    playCelebration("pack:song");
    expect(celebrationState.current.gifUrl).toBe("https://gif/1");
  });

  it("plays nothing, without error, for a pack celebration that has gone", () => {
    expect(() => playCelebration("pack:vanished")).not.toThrow();
    expect(celebrationState.current).toBeNull();
  });

  it("still shows the visuals when the pack's sound cannot start", () => {
    prepared = [{ name: "pack:tips", clip: CLIP, imageUrl: "blob:cat" }];
    unlock.mockImplementation(() => {
      throw new Error("audio is blocked");
    });
    expect(() => playCelebration("pack:tips")).not.toThrow();
    expect(celebrationState.current.name).toBe("pack:tips");
  });

  it("a broken pack celebration never stops a big tip from being celebrated safely", () => {
    prepared = [{ name: "pack:tips", clip: CLIP, imageUrl: "blob:cat" }];
    playClip.mockImplementation(() => {
      throw new Error("broken clip");
    });
    expect(() => celebrateIfBigTip(undefined, 700, () => playCelebration("pack:tips"))).not.toThrow();
  });
});
