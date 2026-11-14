/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startParticleShow } from "../../scripts/CelebrationParticles";
import { CONFETTI_BURSTS, FIREWORK_ROCKETS, FIREWORK_FLIGHT_SECONDS, JACKPOT_BILLS_START_SECONDS } from "../../scripts/CelebrationTimings";

const WIDTH = 390;
const HEIGHT = 844;
const FRAME_SECONDS = 0.05;

let frameCallback;
let drawn; // per frame: the points particles were drawn at, and what shapes were drawn

/** A canvas context that only records where particles are drawn (translate) and which shapes. */
function fakeContext() {
  const context = {
    frame: { points: [], arcs: 0, lines: 0, rects: 0 },
    setTransform() {},
    clearRect() {
      drawn.push(context.frame);
      context.frame = { points: [], arcs: 0, lines: 0, rects: 0 };
    },
    save() {},
    restore() {},
    translate(x, y) {
      context.frame.points.push({ x, y });
    },
    rotate() {},
    scale() {},
    beginPath() {},
    arc() {
      context.frame.arcs++;
    },
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {
      context.frame.lines++;
    },
    fillRect() {
      context.frame.rects++;
    },
    strokeRect() {},
    fillText() {},
    roundRect() {},
  };
  return context;
}

/** Run a show for some seconds, frame by frame, returning what each frame drew. */
function run(show, seconds) {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => ({ width: WIDTH, height: HEIGHT });
  const context = fakeContext();
  canvas.getContext = () => context;
  const stop = startParticleShow(canvas, show, "#378e3c");
  let time = 0;
  frameCallback(time); // the first frame has no previous one
  for (let step = 0; step < seconds / FRAME_SECONDS; step++) {
    time += FRAME_SECONDS * 1000;
    frameCallback(time);
  }
  stop();
  return drawn.slice(0, -1); // the last entry is the clear made by stop()
}

const frameAt = (frames, seconds) => frames[Math.round(seconds / FRAME_SECONDS)];

beforeEach(() => {
  drawn = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frameCallback = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("confetti", () => {
  it("bursts several times, the first near the bottom and each next one higher", () => {
    const frames = run("confetti", 6);
    CONFETTI_BURSTS.forEach((burst, index) => {
      const burstY = HEIGHT * burst.heightFraction; // each burst is found near its own height
      const frame = frameAt(frames, burst.atSeconds + FRAME_SECONDS);
      const nearBurst = frame.points.filter((point) => Math.abs(point.y - burstY) < 120);
      expect(nearBurst.length, `burst ${index}`).toBeGreaterThanOrEqual(10);
    });
  });

  it("has no burst before its time, and pieces keep drifting down between bursts", () => {
    const frames = run("confetti", 6);
    expect(frameAt(frames, 0.1).points).toHaveLength(0); // the first burst is at 0.2 s
    const between = frameAt(frames, 1.3); // after burst 1, before burst 2 (1.4 s)
    expect(between.points.length).toBeGreaterThan(0);
  });

  it("still has pieces in the air near the end of the show", () => {
    const frames = run("confetti", 6);
    expect(frameAt(frames, 5.8).points.length).toBeGreaterThan(0);
  });
});

describe("fireworks", () => {
  it("each rocket leaves the bottom edge, rises with a trail, and bursts where it arrives", () => {
    const frames = run("fireworks", 6);
    const rocket = FIREWORK_ROCKETS[0];
    const launched = frameAt(frames, rocket.launchSeconds + FRAME_SECONDS * 2);
    expect(Math.max(...launched.points.map((point) => point.y))).toBeGreaterThan(HEIGHT * 0.8); // just off the bottom edge
    const midFlight = frameAt(frames, rocket.launchSeconds + FIREWORK_FLIGHT_SECONDS / 2);
    expect(midFlight.lines).toBeGreaterThan(3); // a visible trail
    const risen = Math.min(...midFlight.points.map((point) => point.y));
    expect(risen).toBeLessThan(HEIGHT * 0.75);
    expect(risen).toBeGreaterThan(HEIGHT * rocket.burstHeightFraction);
    const afterBurst = frameAt(frames, rocket.launchSeconds + FIREWORK_FLIGHT_SECONDS + 0.2);
    expect(afterBurst.points.length).toBeGreaterThan(40); // a ball of sparks
    const burstX = rocket.widthFraction * WIDTH;
    const nearBurst = afterBurst.points.filter((point) => Math.abs(point.x - burstX) < 140 && point.y < HEIGHT * 0.7);
    expect(nearBurst.length).toBeGreaterThan(40);
  });

  it("launches rockets all through the six seconds", () => {
    const frames = run("fireworks", 6);
    for (const rocket of FIREWORK_ROCKETS) {
      const frame = frameAt(frames, rocket.launchSeconds + 0.1);
      expect(frame.lines + frame.arcs, `rocket at ${rocket.launchSeconds}`).toBeGreaterThan(0);
    }
  });
});

describe("the bills over the jackpot", () => {
  it("start only when the reels land", () => {
    const frames = run("jackpotBills", 6);
    expect(frameAt(frames, JACKPOT_BILLS_START_SECONDS - 0.2).points).toHaveLength(0);
    expect(frameAt(frames, JACKPOT_BILLS_START_SECONDS + 0.5).points.length).toBeGreaterThan(0);
    expect(frameAt(frames, 5.9).points.length).toBeGreaterThan(5);
  });
});

describe("bills rain", () => {
  it("keeps bills falling through the whole six seconds", () => {
    const frames = run("billsRain", 6);
    for (const second of [0.5, 2, 4, 5.8]) expect(frameAt(frames, second).points.length, `at ${second} s`).toBeGreaterThan(3);
  });
});
