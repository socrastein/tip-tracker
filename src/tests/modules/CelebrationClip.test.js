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
  MAX_PACK_CLIP_SECONDS,
  prepareClip,
  resolveClip,
  sliceBuffer,
} from "../../scripts/CelebrationClip";

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

describe("resolveClip", () => {
  it("keeps a clip that fits inside the sound", () => {
    expect(resolveClip(2, 3, 20)).toEqual({ startSeconds: 2, lengthSeconds: 3 });
  });

  it("caps the length at the clip maximum, exactly at the bound", () => {
    expect(resolveClip(0, MAX_PACK_CLIP_SECONDS, 60).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
    expect(resolveClip(0, MAX_PACK_CLIP_SECONDS + 1, 60).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
  });

  it("stops at the end of the sound", () => {
    expect(resolveClip(8, 5, 10)).toEqual({ startSeconds: 8, lengthSeconds: 2 });
  });

  it("plays nothing when the start is at or past the end", () => {
    expect(resolveClip(10, 3, 10).lengthSeconds).toBe(0);
    expect(resolveClip(50, 3, 10)).toEqual({ startSeconds: 10, lengthSeconds: 0 });
  });

  it("treats a negative start as the beginning", () => {
    expect(resolveClip(-4, 3, 10).startSeconds).toBe(0);
  });
});

describe("prepareClip", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodes the sound and cuts exactly the clip asked for", async () => {
    const clip = await prepareClip(new Blob(["20"]), 2, 3);
    expect(clip.length).toBe(30); // 3 seconds at 10 Hz
    expect(clip.written[0][0]).toBe(20); // frame 2 s * 10 Hz
  });

  it("gives null for a sound that cannot be decoded, without throwing", async () => {
    expect(await prepareClip(new Blob(["BROKEN"]), 0, 3)).toBeNull();
  });

  it("gives null when the start is past the end of the sound", async () => {
    expect(await prepareClip(new Blob(["10"]), 50, 3)).toBeNull();
  });
});
