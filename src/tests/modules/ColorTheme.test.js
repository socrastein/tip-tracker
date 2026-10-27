import { describe, it, expect, beforeEach } from "vitest";
import {
  ACCENTS,
  DEFAULT_ACCENT_ID,
  findAccent,
  loadAccentId,
  saveAccentId,
  applyAccent,
} from "../../scripts/ColorTheme";

const STORAGE_KEY = "tipTracker(themeColor)";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
});

describe("ColorTheme", () => {
  describe("findAccent", () => {
    it("finds an option by id", () => {
      expect(findAccent("blue")?.label).toBe("Blue");
    });

    it("finds an option by the hex older versions saved, ignoring case and spaces", () => {
      expect(findAccent(" #C8AC69 ")?.id).toBe("yellow");
    });

    it("returns undefined for nothing saved or an unknown value", () => {
      expect(findAccent(null)).toBeUndefined();
      expect(findAccent("#123456")).toBeUndefined();
    });
  });

  describe("loadAccentId", () => {
    it("falls back to the default when nothing is saved", () => {
      expect(loadAccentId()).toBe(DEFAULT_ACCENT_ID);
    });

    it("falls back to the default for an unknown saved value", () => {
      localStorage.setItem(STORAGE_KEY, "not-a-color");
      expect(loadAccentId()).toBe(DEFAULT_ACCENT_ID);
    });

    it("returns a saved id unchanged", () => {
      localStorage.setItem(STORAGE_KEY, "orange");
      expect(loadAccentId()).toBe("orange");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("orange");
    });

    it("migrates a legacy hex to its id and re-saves it", () => {
      localStorage.setItem(STORAGE_KEY, "#8f5173");
      expect(loadAccentId()).toBe("pink");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("pink");
    });

    it("migrates the old default hex by removing the key (defaults aren't saved)", () => {
      localStorage.setItem(STORAGE_KEY, "#378e3c");
      expect(loadAccentId()).toBe("green");
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("saveAccentId", () => {
    it("saves a non-default choice", () => {
      saveAccentId("magenta");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("magenta");
    });

    it("removes the key when the default is chosen", () => {
      localStorage.setItem(STORAGE_KEY, "magenta");
      saveAccentId(DEFAULT_ACCENT_ID);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("applyAccent", () => {
    it("sets the kit's accent tokens on <html> as a light/dark pair", () => {
      applyAccent("blue");
      const accent = document.documentElement.style.getPropertyValue("--accentFull");
      expect(accent).toBe("light-dark(#3c46ff, #777eff)");
    });

    it("falls back to the first option for an unknown id", () => {
      applyAccent("nope");
      const accent = document.documentElement.style.getPropertyValue("--accentFull");
      expect(accent).toContain(ACCENTS[0].light);
    });
  });
});
