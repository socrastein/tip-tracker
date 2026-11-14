/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import {
  MAX_PACK_CLIP_SECONDS,
  MAX_PACK_START_SECONDS,
  pairPackFiles,
  parsePackFileName,
  resolveClip,
} from "../../scripts/CelebrationPackNames";

describe("parsePackFileName", () => {
  it("reads a plain sound: from the start, no length given", () => {
    expect(parsePackFileName("tips.mp3")).toEqual({
      name: "tips.mp3",
      kind: "sound",
      baseName: "tips",
      startSeconds: 0,
      lengthSeconds: null,
    });
  });

  it("reads @start+length: tips@12.5+3.mp3 is 3 seconds from 12.5 s", () => {
    const parsed = parsePackFileName("tips@12.5+3.mp3");
    expect(parsed.baseName).toBe("tips");
    expect(parsed.startSeconds).toBe(12.5);
    expect(parsed.lengthSeconds).toBe(3);
  });

  it("reads @start alone: the length is left to the default", () => {
    const parsed = parsePackFileName("tips@12.5.mp3");
    expect(parsed.baseName).toBe("tips");
    expect(parsed.startSeconds).toBe(12.5);
    expect(parsed.lengthSeconds).toBeNull();
  });

  it("reads whole-second values", () => {
    const parsed = parsePackFileName("song@30+5.m4a");
    expect(parsed.startSeconds).toBe(30);
    expect(parsed.lengthSeconds).toBe(5);
  });

  it("accepts a length of exactly the cap and clamps one just above it", () => {
    expect(parsePackFileName(`a@0+${MAX_PACK_CLIP_SECONDS}.mp3`).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
    expect(parsePackFileName("a@0+15.01.mp3").lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
    expect(parsePackFileName("a@0+999.mp3").lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
  });

  it("treats a length of 0 as not given", () => {
    expect(parsePackFileName("a@5+0.mp3").lengthSeconds).toBeNull();
    expect(parsePackFileName("a@5+0.0.mp3").lengthSeconds).toBeNull();
  });

  it("accepts a start of exactly the maximum and clamps one just above it", () => {
    expect(parsePackFileName(`a@${MAX_PACK_START_SECONDS}.mp3`).startSeconds).toBe(MAX_PACK_START_SECONDS);
    expect(parsePackFileName(`a@${MAX_PACK_START_SECONDS + 0.5}+2.mp3`).startSeconds).toBe(MAX_PACK_START_SECONDS);
  });

  it("accepts a start of 0", () => {
    expect(parsePackFileName("a@0+3.mp3").startSeconds).toBe(0);
  });

  it("does not read a suffix that is not a plain number", () => {
    for (const name of ["a@x.mp3", "a@-3.mp3", "a@1+.mp3", "a@+3.mp3", "a@1..5.mp3", "a@1+2+3.mp3"]) {
      const parsed = parsePackFileName(name);
      expect(parsed.startSeconds).toBe(0);
      expect(parsed.lengthSeconds).toBeNull();
    }
  });

  it("reads pictures, and never reads a suffix from them", () => {
    const parsed = parsePackFileName("cat@3.gif");
    expect(parsed.kind).toBe("image");
    expect(parsed.baseName).toBe("cat@3");
    expect(parsed.startSeconds).toBe(0);
  });

  it("is case-insensitive for extensions and base names", () => {
    expect(parsePackFileName("Tips.MP3").baseName).toBe("tips");
    expect(parsePackFileName("Tips.MP3").kind).toBe("sound");
  });

  it("gives null for names with no usable extension", () => {
    for (const name of ["notes.txt", "tips", ".mp3", "tips.mp4", ""]) {
      expect(parsePackFileName(name)).toBeNull();
    }
  });
});

describe("pairPackFiles", () => {
  it("pairs a sound and a picture that share a base name", () => {
    const [celebration] = pairPackFiles(["tips.mp3", "tips.gif"]);
    expect(celebration.baseName).toBe("tips");
    expect(celebration.sound.name).toBe("tips.mp3");
    expect(celebration.image.name).toBe("tips.gif");
  });

  it("pairs a sound with a start+length suffix with the plain picture name", () => {
    const [celebration] = pairPackFiles(["tips@12.5+3.mp3", "tips.gif"]);
    expect(celebration.sound.startSeconds).toBe(12.5);
    expect(celebration.image.name).toBe("tips.gif");
  });

  it("keeps a lone sound as a sound-only celebration", () => {
    const [celebration] = pairPackFiles(["song.ogg"]);
    expect(celebration.sound.name).toBe("song.ogg");
    expect(celebration.image).toBeNull();
  });

  it("keeps a lone picture as a picture-only celebration", () => {
    const [celebration] = pairPackFiles(["cat.png"]);
    expect(celebration.sound).toBeNull();
    expect(celebration.image.name).toBe("cat.png");
  });

  it("pairs regardless of case and lists celebrations in base-name order", () => {
    const result = pairPackFiles(["Zed.gif", "alpha.wav", "ZED.mp3", "alpha.PNG"]);
    expect(result.map((entry) => entry.baseName)).toEqual(["alpha", "zed"]);
    expect(result[1].sound.name).toBe("ZED.mp3");
    expect(result[1].image.name).toBe("Zed.gif");
  });

  it("uses the first sound in name order when two share a base name", () => {
    const [celebration] = pairPackFiles(["tips@2.mp3", "tips.mp3"]);
    expect(celebration.sound.name).toBe("tips.mp3");
  });

  it("ignores names the rule cannot read", () => {
    expect(pairPackFiles(["notes.txt", "x"])).toEqual([]);
  });

  it("gives nothing for an empty pack", () => {
    expect(pairPackFiles([])).toEqual([]);
  });
});

describe("resolveClip", () => {
  const plain = { startSeconds: 0, lengthSeconds: null };

  it("plays a short sound from the start for its whole length", () => {
    expect(resolveClip(plain, 7)).toEqual({ startSeconds: 0, lengthSeconds: 7 });
  });

  it("caps the default length at the maximum, at the bound itself", () => {
    expect(resolveClip(plain, MAX_PACK_CLIP_SECONDS).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
    expect(resolveClip(plain, MAX_PACK_CLIP_SECONDS + 1).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
    expect(resolveClip(plain, 200).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
  });

  it("uses the asked start and length when the sound is long enough", () => {
    expect(resolveClip({ startSeconds: 12.5, lengthSeconds: 3 }, 60)).toEqual({ startSeconds: 12.5, lengthSeconds: 3 });
  });

  it("stops at the end of the sound when the length runs past it", () => {
    expect(resolveClip({ startSeconds: 58, lengthSeconds: 5 }, 60)).toEqual({ startSeconds: 58, lengthSeconds: 2 });
  });

  it("plays nothing when the start is at or past the end", () => {
    expect(resolveClip({ startSeconds: 60, lengthSeconds: 3 }, 60).lengthSeconds).toBe(0);
    expect(resolveClip({ startSeconds: 90, lengthSeconds: 3 }, 60)).toEqual({ startSeconds: 60, lengthSeconds: 0 });
  });

  it("applies the default cap after a start", () => {
    expect(resolveClip({ startSeconds: 10, lengthSeconds: null }, 100).lengthSeconds).toBe(MAX_PACK_CLIP_SECONDS);
  });
});
