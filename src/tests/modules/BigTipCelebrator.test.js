/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { celebrateIfBigTip, availableCelebrations } from "../../scripts/BigTipCelebrator";
import { BUILT_IN_CELEBRATIONS } from "../../scripts/CelebrationRotation";
import { celebrationState, endCelebration } from "../../scripts/CelebrationState";
import { TipRepository } from "../../scripts/TipRepository";
import { mockTip } from "../MockTips";

describe("celebrateIfBigTip", () => {
  beforeEach(() => {
    localStorage.clear();
    endCelebration();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not play for a new 599 tip but does for a new 600 tip", () => {
    const play = vi.fn();
    celebrateIfBigTip(undefined, 599, play);
    expect(play).not.toHaveBeenCalled();
    celebrateIfBigTip(undefined, 600, play);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("plays when an edit raises a tip from 550 to 650", () => {
    const play = vi.fn();
    celebrateIfBigTip(550, 650, play);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("does not play when an edit changes a tip from 650 to 700", () => {
    const play = vi.fn();
    celebrateIfBigTip(650, 700, play);
    expect(play).not.toHaveBeenCalled();
  });

  it("never plays on load: reading stored tips, even huge ones, shows no celebration", () => {
    mockTip(5000, "2026-10-01").saveToLocalStorage();
    const loaded = TipRepository.loadAllFromStorage();
    expect(loaded).toHaveLength(1);
    expect(celebrationState.current).toBeNull();
  });

  it("only offers the built-in celebrations while the custom one is not set up", () => {
    expect(availableCelebrations()).toEqual([...BUILT_IN_CELEBRATIONS]);
  });

  it("never plays the same celebration twice in a row over many big tips", () => {
    const shown = [];
    for (let count = 0; count < 200; count++) {
      celebrateIfBigTip(undefined, 700, (name) => shown.push(name));
    }
    expect(shown).toHaveLength(200);
    for (let index = 1; index < shown.length; index++) {
      expect(shown[index]).not.toBe(shown[index - 1]);
    }
    expect(new Set(shown).size).toBeGreaterThanOrEqual(4);
  });

  it("does not repeat the one shown before the app was last closed", () => {
    celebrateIfBigTip(undefined, 700, () => {});
    const lastShown = localStorage.getItem("tipTracker(celebration).lastShown");
    for (let count = 0; count < 50; count++) {
      let second = null;
      localStorage.setItem("tipTracker(celebration).lastShown", lastShown);
      celebrateIfBigTip(undefined, 700, (name) => (second = name));
      expect(second).not.toBe(lastShown);
    }
  });

  it("keeps its remembered state out of the tip key space", () => {
    celebrateIfBigTip(undefined, 700, () => {});
    expect(TipRepository.loadAllFromStorage()).toHaveLength(0);
  });

  it("swallows a celebration that throws", () => {
    const failing = () => {
      throw new Error("canvas exploded");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => celebrateIfBigTip(undefined, 700, failing)).not.toThrow();
  });
});
