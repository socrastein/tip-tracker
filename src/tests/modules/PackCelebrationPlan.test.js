/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import { planPackCelebration } from "../../scripts/PackCelebrationPlan";
import { BUILT_IN_CELEBRATIONS } from "../../scripts/CelebrationRotation";

const clip = {};
const NEVER_NEEDED = () => {
  throw new Error("random should not be needed");
};

describe("planPackCelebration", () => {
  it("shows a pair's own picture with its own sound", () => {
    const plan = planPackCelebration({ clip, imageUrl: "blob:pair" }, ["blob:pair", "blob:other"], true, NEVER_NEEDED);
    expect(plan).toEqual({ pictureUrl: "blob:pair", useGif: false, builtInSound: null });
  });

  it("gives a lone picture a built-in sound", () => {
    const plan = planPackCelebration({ clip: null, imageUrl: "blob:lone" }, ["blob:lone"], false, () => 0);
    expect(plan.pictureUrl).toBe("blob:lone");
    expect(plan.builtInSound).toBe(BUILT_IN_CELEBRATIONS[0]);
  });

  it("gives a lone sound a random pack picture", () => {
    const pictures = ["blob:a", "blob:b"];
    expect(planPackCelebration({ clip, imageUrl: null }, pictures, false, () => 0).pictureUrl).toBe("blob:a");
    expect(planPackCelebration({ clip, imageUrl: null }, pictures, false, () => 0.99).pictureUrl).toBe("blob:b");
  });

  it("can give a lone sound the ready GIF instead, among the pictures", () => {
    const plan = planPackCelebration({ clip, imageUrl: null }, ["blob:a"], true, () => 0.99);
    expect(plan).toEqual({ pictureUrl: null, useGif: true, builtInSound: null });
  });

  it("uses the GIF alone when the pack has no pictures", () => {
    const plan = planPackCelebration({ clip, imageUrl: null }, [], true, () => 0);
    expect(plan.useGif).toBe(true);
  });

  it("falls back to just the bills when there is no picture and no GIF", () => {
    const plan = planPackCelebration({ clip, imageUrl: null }, [], false, NEVER_NEEDED);
    expect(plan).toEqual({ pictureUrl: null, useGif: false, builtInSound: null });
  });
});
