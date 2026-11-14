/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import {
  BUILT_IN_CELEBRATION_MS,
  BUILT_IN_CELEBRATION_SECONDS,
  CONFETTI_BURSTS,
  FIREWORK_FLIGHT_SECONDS,
  FIREWORK_ROCKETS,
  JACKPOT_BILLS_START_SECONDS,
  JACKPOT_REEL_STOP_SECONDS,
} from "../../scripts/CelebrationTimings";

describe("built-in celebration timings", () => {
  it("every built-in lasts 6 seconds", () => {
    expect(BUILT_IN_CELEBRATION_SECONDS).toBe(6);
    expect(BUILT_IN_CELEBRATION_MS).toBe(6000);
  });

  it("confetti goes off in several bursts, each higher than the last, spread over the show", () => {
    expect(CONFETTI_BURSTS.length).toBeGreaterThanOrEqual(4);
    for (let index = 1; index < CONFETTI_BURSTS.length; index++) {
      expect(CONFETTI_BURSTS[index].atSeconds).toBeGreaterThan(CONFETTI_BURSTS[index - 1].atSeconds);
      expect(CONFETTI_BURSTS[index].heightFraction).toBeLessThan(CONFETTI_BURSTS[index - 1].heightFraction); // smaller is nearer the top
    }
    expect(CONFETTI_BURSTS[0].heightFraction).toBeGreaterThan(0.75); // the first near the bottom
    expect(CONFETTI_BURSTS[CONFETTI_BURSTS.length - 1].heightFraction).toBeLessThan(0.25); // the last near the top
    expect(CONFETTI_BURSTS[CONFETTI_BURSTS.length - 1].atSeconds).toBeLessThan(BUILT_IN_CELEBRATION_SECONDS);
  });

  it("several firework rockets at different heights and positions, all bursting before the show ends", () => {
    expect(FIREWORK_ROCKETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(FIREWORK_ROCKETS.map((rocket) => rocket.burstHeightFraction)).size).toBe(FIREWORK_ROCKETS.length);
    expect(new Set(FIREWORK_ROCKETS.map((rocket) => rocket.widthFraction)).size).toBe(FIREWORK_ROCKETS.length);
    const launches = FIREWORK_ROCKETS.map((rocket) => rocket.launchSeconds);
    expect([...launches].sort((a, b) => a - b)).toEqual(launches);
    for (const rocket of FIREWORK_ROCKETS) {
      expect(rocket.launchSeconds + FIREWORK_FLIGHT_SECONDS).toBeLessThan(BUILT_IN_CELEBRATION_SECONDS - 1); // sparks need a second to fade
      expect(rocket.burstHeightFraction).toBeLessThan(0.5); // bursts in the upper half
    }
  });

  it("the jackpot's reels stop one after another and the bills start when the last one lands", () => {
    const stops = [...JACKPOT_REEL_STOP_SECONDS];
    expect([...stops].sort((a, b) => a - b)).toEqual(stops);
    expect(JACKPOT_BILLS_START_SECONDS).toBeGreaterThanOrEqual(stops[2]);
    expect(JACKPOT_BILLS_START_SECONDS).toBeLessThan(stops[2] + 0.5);
    expect(JACKPOT_BILLS_START_SECONDS).toBeLessThan(BUILT_IN_CELEBRATION_SECONDS - 1);
  });
});
