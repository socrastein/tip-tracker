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
  sliceBuffer,
} from "../../scripts/CelebrationPackRuntime";

const file = (name, text) => ({ name, blob: new Blob([text]) });

describe("sliceBuffer", () => {
  it("copies exactly the clip's frames from each channel", () => {
    const source = fakeBuffer(10, 2);
    const clip = sliceBuffer({ createBuffer: (channels, length) => ({ ...fakeBuffer(length / SAMPLE_RATE, channels), written: [] }) }, source, 2, 3);
    expect(clip.length).toBe(30);
    expect(clip.written[0][0]).toBe(20); // frame 2 s * 10 Hz
    expect(clip.written[1].length).toBe(30);
  });

  it("stops at the end of the source", () => {
    const context = { createBuffer: (channels, length) => ({ ...fakeBuffer(length / SAMPLE_RATE, channels), written: [] }) };
    expect(sliceBuffer(context, fakeBuffer(10), 8, 5).length).toBe(20);
  });

  it("gives null when there is nothing to copy", () => {
    const context = { createBuffer: () => { throw new Error("should not create"); } };
    expect(sliceBuffer(context, fakeBuffer(10), 10, 3)).toBeNull();
    expect(sliceBuffer(context, fakeBuffer(10), 0, 0)).toBeNull();
  });
});

describe("preparePackCelebrations", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    releasePackCelebrations();
    vi.restoreAllMocks();
  });

  it("builds one celebration per base name, pairing sound and picture", async () => {
    await preparePackCelebrations([file("tips@2+3.mp3", "20"), file("tips.gif", "gif"), file("alone.png", "png"), file("song.wav", "5")]);
    const celebrations = getPackCelebrations();
    expect(celebrations.map((entry) => entry.name)).toEqual(["pack:alone", "pack:song", "pack:tips"]);

    const tips = celebrations.find((entry) => entry.name === "pack:tips");
    expect(tips.clip.length).toBe(30); // 3 seconds at 10 Hz, from 2 s into a 20 s sound
    expect(tips.imageUrl).toMatch(/^blob:/);
    expect(celebrations.find((entry) => entry.name === "pack:alone").clip).toBeNull();
    expect(celebrations.find((entry) => entry.name === "pack:song").imageUrl).toBeNull();
  });

  it("lists every picture for sounds that have none of their own", async () => {
    await preparePackCelebrations([file("a.png", "1"), file("b.gif", "2"), file("s.mp3", "5")]);
    expect(getPackImageUrls()).toHaveLength(2);
  });

  it("caps a sound with no length at the default maximum", async () => {
    await preparePackCelebrations([file("long.mp3", "60")]);
    expect(getPackCelebrations()[0].clip.length).toBe(15 * SAMPLE_RATE);
  });

  it("a broken sound with a picture becomes a picture-only celebration", async () => {
    await preparePackCelebrations([file("x.mp3", "BROKEN"), file("x.gif", "gif")]);
    const [celebration] = getPackCelebrations();
    expect(celebration.clip).toBeNull();
    expect(celebration.imageUrl).not.toBeNull();
  });

  it("drops a broken sound that has nothing else, and never throws", async () => {
    await expect(preparePackCelebrations([file("x.mp3", "BROKEN"), file("ok.mp3", "4")])).resolves.toBeUndefined();
    expect(getPackCelebrations().map((entry) => entry.name)).toEqual(["pack:ok"]);
  });

  it("drops a sound that starts past its end", async () => {
    await preparePackCelebrations([file("late@50.mp3", "10")]);
    expect(getPackCelebrations()).toEqual([]);
  });

  it("replaces the earlier pack and frees its picture URLs", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    await preparePackCelebrations([file("a.png", "1")]);
    await preparePackCelebrations([file("b.png", "2")]);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(getPackCelebrations().map((entry) => entry.name)).toEqual(["pack:b"]);
  });

  it("is empty for an empty pack", async () => {
    await preparePackCelebrations([]);
    expect(getPackCelebrations()).toEqual([]);
    expect(getPackImageUrls()).toEqual([]);
  });
});
