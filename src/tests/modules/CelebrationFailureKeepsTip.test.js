/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp, nextTick } from "vue";

// Every celebration step that touches the browser throws: a broken celebration
// must still leave the tip saved.
vi.mock("../../scripts/CelebrationSounds", () => ({
  unlockAudioContext: () => {
    throw new Error("audio is broken");
  },
  playCelebrationSound: () => {
    throw new Error("sound is broken");
  },
  getAudioContext: () => {
    throw new Error("audio is broken");
  },
}));
vi.mock("../../scripts/CelebrationState", () => ({
  celebrationState: { current: null },
  showCelebration: () => {
    throw new Error("overlay is broken");
  },
  endCelebration: () => {},
}));

import AddTipForm from "../../components/AddTipForm.vue";
import { TipStore } from "../../scripts/TipStore";
import { TipRepository } from "../../scripts/TipRepository";

let host;
let app;

beforeEach(() => {
  localStorage.clear();
  TipStore.setAllTips([]);
  TipStore.setGroupedTips([]);
  host = document.createElement("div");
  document.body.appendChild(host);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  app?.unmount();
  host.remove();
  vi.restoreAllMocks();
});

async function enterAmountAndConfirm(amount) {
  app = createApp(AddTipForm, { autoFocus: false, isBeingEdited: false, targetTip: null });
  app.mount(host);
  const input = host.querySelector("#newTipAmount");
  input.value = String(amount);
  input.dispatchEvent(new Event("input"));
  await nextTick();
  host.querySelector(".confirmationContainer button.confirm").click();
  await nextTick();
}

describe("a celebration that fails", () => {
  it("still leaves a 650 dollar tip stored in memory and in localStorage", async () => {
    await enterAmountAndConfirm(650);
    expect(TipStore.getAllTips()).toHaveLength(1);
    expect(TipStore.getAllTips()[0].amount).toBe(650);
    expect(TipRepository.loadAllFromStorage().map((tip) => tip.amount)).toEqual([650]);
  });

  it("does not show an error to the user for the failed celebration", async () => {
    await enterAmountAndConfirm(650);
    expect(host.querySelector(".errorMessage")).toBeNull();
    expect(document.body.querySelector(".errorMessage")).toBeNull();
  });
});
