/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp, nextTick } from "vue";

import CelebrationOverlay from "../../components/CelebrationOverlay.vue";
import { celebrationState, endCelebration, showCelebration } from "../../scripts/CelebrationState";
import { playCelebration } from "../../scripts/BigTipCelebrator";
import { getGifPreloader } from "../../scripts/GifPreloader";

let host;
let app;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); // jsdom has no canvas
  vi.spyOn(console, "warn").mockImplementation(() => {});
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp(CelebrationOverlay);
  app.mount(host);
});

afterEach(() => {
  endCelebration();
  app.unmount();
  host.remove();
  getGifPreloader().setReady(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function show(name, gifUrl) {
  showCelebration(name, { gifUrl });
  await nextTick();
  await nextTick();
}

describe("the GIF on a celebration", () => {
  it("is shown with the Powered By GIPHY attribution", async () => {
    await show("billsRain", "https://media0.giphy.com/media/a/200w.webp?cid=abc");
    expect(host.querySelector(".gifImage").getAttribute("src")).toBe("https://media0.giphy.com/media/a/200w.webp?cid=abc");
    expect(host.querySelector(".gifAttribution").textContent.trim()).toBe("Powered By GIPHY");
  });

  it("brings no attribution when there is no GIF", async () => {
    await show("billsRain", null);
    expect(host.querySelector(".gifImage")).toBeNull();
    expect(host.querySelector(".gifAttribution")).toBeNull();
  });

  it("hides the GIF and its attribution together when the image fails to draw", async () => {
    await show("confetti", "https://media0.giphy.com/media/a/200w.webp");
    host.querySelector(".gifImage").dispatchEvent(new Event("error"));
    await nextTick();
    expect(host.querySelector(".gifImage")).toBeNull();
    expect(host.querySelector(".gifAttribution")).toBeNull();
  });
});

describe("which celebrations take the ready GIF", () => {
  const url = "https://media0.giphy.com/media/a/200w.webp";

  it("billsRain, confetti and fireworks take it", () => {
    for (const name of ["billsRain", "confetti", "fireworks"]) {
      getGifPreloader().setReady(url);
      playCelebration(name);
      expect(celebrationState.current.gifUrl).toBe(url);
      expect(getGifPreloader().takeReady()).toBeNull(); // taken, once
    }
  });

  it("the banner and the jackpot leave it for the next celebration", () => {
    for (const name of ["club", "jackpot"]) {
      getGifPreloader().setReady(url);
      playCelebration(name);
      expect(celebrationState.current.gifUrl).toBeNull();
      expect(getGifPreloader().takeReady()).toBe(url);
    }
  });

  it("a celebration with no GIF ready simply runs without one", () => {
    getGifPreloader().setReady(null);
    expect(() => playCelebration("billsRain")).not.toThrow();
    expect(celebrationState.current.name).toBe("billsRain");
    expect(celebrationState.current.gifUrl).toBeNull();
  });
});
