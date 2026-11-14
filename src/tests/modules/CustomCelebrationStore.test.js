/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_LENGTH_SECONDS,
  clearCustomCelebration,
  loadCustomCelebration,
  sanitizeClipTimes,
  saveCustomCelebration,
} from "../../scripts/CustomCelebrationStore";
import { clampClip } from "../../scripts/CustomCelebrationAudio";
import { createFakeIndexedDB } from "../MockIndexedDB";

function makeCelebration(overrides = {}) {
  return {
    sound: new Blob(["fake audio bytes"], { type: "audio/mpeg" }),
    soundName: "song.mp3",
    image: new Blob(["fake image bytes"], { type: "image/gif" }),
    imageName: "cat.gif",
    startSeconds: 42.5,
    lengthSeconds: 3,
    ...overrides,
  };
}

describe("custom celebration storage (fake IndexedDB)", () => {
  let factory;

  beforeEach(() => {
    factory = createFakeIndexedDB();
    localStorage.clear();
  });

  it("is empty before anything is saved", async () => {
    expect(await loadCustomCelebration(factory)).toBeNull();
  });

  it("saves and loads the sound, picture, names and clip times", async () => {
    const celebration = makeCelebration();
    await saveCustomCelebration(celebration, factory);

    const loaded = await loadCustomCelebration(factory);
    expect(loaded.sound).toBe(celebration.sound);
    expect(loaded.image).toBe(celebration.image);
    expect(loaded.soundName).toBe("song.mp3");
    expect(loaded.imageName).toBe("cat.gif");
    expect(loaded.startSeconds).toBe(42.5);
    expect(loaded.lengthSeconds).toBe(3);
  });

  it("keeps a celebration without a picture", async () => {
    await saveCustomCelebration(makeCelebration({ image: null, imageName: "" }), factory);
    const loaded = await loadCustomCelebration(factory);
    expect(loaded.image).toBeNull();
  });

  it("replaces the earlier celebration when saved again", async () => {
    await saveCustomCelebration(makeCelebration({ soundName: "first.mp3" }), factory);
    await saveCustomCelebration(makeCelebration({ soundName: "second.mp3" }), factory);
    expect((await loadCustomCelebration(factory)).soundName).toBe("second.mp3");
  });

  it("removes the celebration so it leaves the rotation", async () => {
    await saveCustomCelebration(makeCelebration(), factory);
    await clearCustomCelebration(factory);
    expect(await loadCustomCelebration(factory)).toBeNull();
  });

  it("writes nothing to localStorage, where tips and the backup state live", async () => {
    await saveCustomCelebration(makeCelebration(), factory);
    expect(localStorage.length).toBe(0);
  });

  it("treats a damaged record as not set up", async () => {
    const database = await new Promise((resolve) => {
      const request = factory.open("tipTrackerCelebration", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("custom");
      request.onsuccess = () => resolve(request.result);
    });
    database.transaction("custom", "readwrite").objectStore("custom").put({ sound: "not a blob" }, "slot");
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await loadCustomCelebration(factory)).toBeNull();
  });
});

describe("sanitizeClipTimes", () => {
  it("defaults the length to 3 seconds and the start to 0", () => {
    expect(DEFAULT_LENGTH_SECONDS).toBe(3);
    expect(sanitizeClipTimes(NaN, NaN)).toEqual({ startSeconds: 0, lengthSeconds: 3 });
  });

  it("keeps good values", () => {
    expect(sanitizeClipTimes(12.5, 2)).toEqual({ startSeconds: 12.5, lengthSeconds: 2 });
  });

  it("replaces a negative start with 0 and a zero or negative length with the default", () => {
    expect(sanitizeClipTimes(-1, 0)).toEqual({ startSeconds: 0, lengthSeconds: 3 });
    expect(sanitizeClipTimes(5, -2)).toEqual({ startSeconds: 5, lengthSeconds: 3 });
  });
});

describe("clampClip", () => {
  it("leaves a clip inside the sound as asked", () => {
    expect(clampClip(30, 10, 3)).toEqual({ offset: 10, length: 3 });
  });

  it("stops at the end of the sound when the length runs past it", () => {
    expect(clampClip(30, 28, 3)).toEqual({ offset: 28, length: 2 });
  });

  it("plays nothing when the start is at or past the end", () => {
    expect(clampClip(30, 30, 3).length).toBe(0);
    expect(clampClip(30, 99, 3).length).toBe(0);
  });
});
