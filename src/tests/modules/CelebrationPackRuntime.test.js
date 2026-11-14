/// <reference types="vitest" />
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// A fake audio engine: sounds "decode" to buffers whose length depends on the blob's text,
// except the blob "BROKEN", which cannot be decoded.
const SAMPLE_RATE = 10;
function fakeBuffer(seconds, channels = 1) {
  const data = Array.from({ length: channels }, () => Float32Array.from({ length: seconds * SAMPLE_RATE }, (_, i) => i));
  return {
    sampleRate: SAMPLE_RATE,
    length: seconds * SAMPLE_RATE,
    duration: seconds,
    numberOfChannels: channels,
    getChannelData: (channel) => data[channel],
    copyToChannel: function (source, channel) {
      this.written = this.written ?? [];
      this.written[channel] = Array.from(source);
    },
  };
}

vi.mock("../../scripts/CustomCelebrationAudio", () => ({
  decodeSound: async (blob) => {
    const text = await blob.text();
    if (text === "BROKEN") throw new Error("cannot decode");
    return fakeBuffer(Number(text));
  },
}));
vi.mock("../../scripts/CelebrationSounds", () => ({
  getAudioContext: () => ({ createBuffer: (channels, length) => ({ ...fakeBuffer(length / SAMPLE_RATE, channels), written: [] }) }),
}));

import {
  getPackCelebrations,
  getPackImageUrls,
  preparePackCelebrations,
  releasePackCelebrations,
} from "../../scripts/CelebrationPackRuntime";

/** A stored celebration with made-up media; a sound's text is its length in seconds. */
function stored(id, { sound = null, picture = null, startSeconds = 0, lengthSeconds = 5, name = id } = {}) {
  const medium = (text) => (text === null ? null : { size: text.length, sha256: "", blob: new Blob([text]) });
  return { id, name, startSeconds, lengthSeconds, sound: medium(sound), picture: medium(picture) };
}

describe("preparePackCelebrations", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    releasePackCelebrations();
    vi.restoreAllMocks();
  });

  it("makes one celebration per stored one, named by id and titled by its name", async () => {
    await preparePackCelebrations([
      stored("aaaaaaaaaaaa", { sound: "20", picture: "png", startSeconds: 2, lengthSeconds: 3, name: "Tips" }),
      stored("bbbbbbbbbbbb", { picture: "png" }),
      stored("cccccccccccc", { sound: "5" }),
    ]);
    const celebrations = getPackCelebrations();
    expect(celebrations.map((entry) => entry.name)).toEqual(["pack:aaaaaaaaaaaa", "pack:bbbbbbbbbbbb", "pack:cccccccccccc"]);
    const [both, pictureOnly, soundOnly] = celebrations;
    expect(both.title).toBe("Tips");
    expect(both.clip.length).toBe(30); // 3 seconds at 10 Hz, from 2 s into a 20 s sound
    expect(both.imageUrl).toMatch(/^blob:/);
    expect(pictureOnly.clip).toBeNull();
    expect(soundOnly.imageUrl).toBeNull();
  });

  it("lists every picture for sounds that have none of their own", async () => {
    await preparePackCelebrations([stored("aaaaaaaaaaaa", { picture: "1" }), stored("bbbbbbbbbbbb", { picture: "2" }), stored("cccccccccccc", { sound: "5" })]);
    expect(getPackImageUrls()).toHaveLength(2);
  });

  it("applies the clip length cap to a celebration asking for more", async () => {
    await preparePackCelebrations([stored("aaaaaaaaaaaa", { sound: "60", lengthSeconds: 60 })]);
    expect(getPackCelebrations()[0].clip.length).toBe(15 * SAMPLE_RATE);
  });

  it("a broken sound with a picture becomes a picture-only celebration", async () => {
    await preparePackCelebrations([stored("aaaaaaaaaaaa", { sound: "BROKEN", picture: "png" })]);
    const [celebration] = getPackCelebrations();
    expect(celebration.clip).toBeNull();
    expect(celebration.imageUrl).not.toBeNull();
  });

  it("drops a broken sound that has nothing else, and never throws", async () => {
    await expect(
      preparePackCelebrations([stored("aaaaaaaaaaaa", { sound: "BROKEN" }), stored("bbbbbbbbbbbb", { sound: "4" })]),
    ).resolves.toBeUndefined();
    expect(getPackCelebrations().map((entry) => entry.name)).toEqual(["pack:bbbbbbbbbbbb"]);
  });

  it("drops a sound that starts past its end", async () => {
    await preparePackCelebrations([stored("aaaaaaaaaaaa", { sound: "10", startSeconds: 50 })]);
    expect(getPackCelebrations()).toEqual([]);
  });

  it("replaces the earlier pack and frees its picture URLs", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    await preparePackCelebrations([stored("aaaaaaaaaaaa", { picture: "1" })]);
    await preparePackCelebrations([stored("bbbbbbbbbbbb", { picture: "2" })]);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(getPackCelebrations().map((entry) => entry.name)).toEqual(["pack:bbbbbbbbbbbb"]);
  });

  it("is empty for an empty pack", async () => {
    await preparePackCelebrations([]);
    expect(getPackCelebrations()).toEqual([]);
    expect(getPackImageUrls()).toEqual([]);
  });
});
