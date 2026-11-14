/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp, nextTick } from "vue";

import CelebrationOverlay from "../../components/CelebrationOverlay.vue";
import { celebrationState, endCelebration, showCelebration } from "../../scripts/CelebrationState";
import { BUILT_IN_CELEBRATION_MS } from "../../scripts/CelebrationTimings";

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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function show(name = "billsRain") {
  showCelebration(name);
  await nextTick();
  await nextTick();
}

const overlay = () => host.querySelector(".celebration");
const closeButton = () => host.querySelector("button.celebrationClose");
const tap = () => overlay().dispatchEvent(new Event("pointerdown", { bubbles: true }));

describe("closing a celebration", () => {
  it("shows no close button until the first tap", async () => {
    await show();
    expect(closeButton()).toBeNull();
  });

  it("a tap shows the round X button but does not end the celebration", async () => {
    await show();
    tap();
    await nextTick();
    expect(closeButton()).not.toBeNull();
    expect(celebrationState.current).not.toBeNull();
    tap();
    await nextTick();
    expect(celebrationState.current).not.toBeNull();
  });

  it("the button is a real button with an accessible name, and ending the celebration is all it does", async () => {
    await show();
    tap();
    await nextTick();
    const button = closeButton();
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Close Celebration");
    expect(button.closest("[aria-hidden=true]")).toBeNull(); // not hidden from assistive technology with the decoration
    button.click();
    expect(celebrationState.current).toBeNull();
  });

  it("runs its full length and ends on its own, taking the button with it", async () => {
    await show();
    tap();
    await nextTick();
    vi.advanceTimersByTime(BUILT_IN_CELEBRATION_MS - 1);
    expect(celebrationState.current).not.toBeNull();
    vi.advanceTimersByTime(1);
    await nextTick();
    expect(celebrationState.current).toBeNull();
    expect(closeButton()).toBeNull();
    expect(overlay()).toBeNull();
  });

  it("every built-in lasts the same 6 seconds by default", async () => {
    expect(BUILT_IN_CELEBRATION_MS).toBe(6000);
    for (const name of ["billsRain", "confetti", "fireworks", "club", "jackpot"]) {
      await show(name);
      vi.advanceTimersByTime(5999);
      expect(celebrationState.current?.name, name).toBe(name);
      vi.advanceTimersByTime(1);
      await nextTick();
      expect(celebrationState.current, name).toBeNull();
    }
  });

  it("Escape closes it", async () => {
    await show();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(celebrationState.current).toBeNull();
  });

  it("the first Tab shows the button and moves focus to it, so a keyboard can reach it", async () => {
    await show();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    await nextTick();
    await nextTick();
    expect(closeButton()).not.toBeNull();
    expect(document.activeElement).toBe(closeButton());
  });

  it("other keys do nothing", async () => {
    await show();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    await nextTick();
    expect(closeButton()).toBeNull();
    expect(celebrationState.current).not.toBeNull();
  });

  it("a new celebration starts without the button, and no listener is left after one ends", async () => {
    await show();
    tap();
    await nextTick();
    showCelebration("confetti");
    await nextTick();
    await nextTick();
    expect(closeButton()).toBeNull();
    endCelebration();
    await nextTick();
    showCelebration("fireworks"); // a later celebration is not closed by an earlier one's leftovers
    await nextTick();
    await nextTick();
    expect(celebrationState.current?.name).toBe("fireworks");
    expect(closeButton()).toBeNull();
  });
});

describe("what a tap does to the page beneath", () => {
  it("is stopped by the celebration: the tap lands on the overlay, which has no way through", async () => {
    const underneath = vi.fn();
    const button = document.createElement("button");
    button.addEventListener("click", underneath);
    document.body.appendChild(button);
    await show();
    tap();
    overlay().dispatchEvent(new Event("click", { bubbles: true }));
    expect(underneath).not.toHaveBeenCalled();
    button.remove();
  });
});
