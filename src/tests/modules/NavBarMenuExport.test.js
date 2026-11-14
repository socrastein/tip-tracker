/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import NavBarMenu from "../../components/NavBarMenu.vue";
import { TipStore } from "../../scripts/TipStore";
import { mockTip } from "../MockTips";

let host;
let app;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 14, 12) });
  localStorage.clear();
  TipStore.setAllTips([mockTip(100, "2026-11-10"), mockTip(75, "2026-11-09")]);
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  host = document.createElement("div");
  document.body.appendChild(host);
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
  app = createApp(NavBarMenu).use(router);
  app.mount(host);
});

afterEach(() => {
  app.unmount();
  host.remove();
  TipStore.setAllTips([]);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function clickExport() {
  host.querySelector(".exportButton").click();
  for (let round = 0; round < 5; round++) await nextTick();
}

describe("the Export Tips menu item", () => {
  it("is a labelled button in the menu", () => {
    const button = host.querySelector(".exportButton");
    expect(button.textContent.trim()).toBe("Export Tips");
    expect(button.tagName).toBe("BUTTON");
  });

  it("confirms a download in words, in a polite live region", async () => {
    await clickExport();
    const message = host.querySelector(".exportMessage");
    expect(message.getAttribute("role")).toBe("status");
    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.textContent).toBe("Saved 2 tips to tips-2026-11-14.json.");
  });

  it("says so when there are no tips", async () => {
    TipStore.setAllTips([]);
    await clickExport();
    expect(host.querySelector(".exportMessage").textContent).toBe("There are no tips to export yet.");
  });

  it("changes nothing in localStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    await clickExport();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });
});
