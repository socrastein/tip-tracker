/**
 * Accent color ("Color Theme" in the nav menu).
 *
 * Each option is a light/dark pair, tuned so it passes WCAG AA (4.5:1) both as text on every
 * app surface and behind button text, in its own mode. They're applied by overriding the style
 * kit's accent tokens (--accentFull, --accentMuted) on <html>, so every kit component and every
 * app style that uses the accent follows the choice.
 */

export interface AccentOption {
  /** Stable name saved in localStorage */
  id: string;
  /** Shown to the user (and read by screen readers) */
  label: string;
  /** Accent in light mode: dark enough for text on light surfaces and behind white text */
  light: string;
  /** Accent in dark mode: light enough for text on dark surfaces and behind dark text */
  dark: string;
  /** The hex this option was saved as before options had ids (one-time migration) */
  legacyHex: string;
}

export const ACCENTS: AccentOption[] = [
  { id: "green", label: "Green", light: "#2c7130", dark: "#3e9f43", legacyHex: "#378e3c" },
  { id: "blue", label: "Blue", light: "#3c46ff", dark: "#777eff", legacyHex: "#646cff" },
  { id: "purple", label: "Purple", light: "#6c5a91", dark: "#9485b3", legacyHex: "#6c5a91" },
  { id: "magenta", label: "Magenta", light: "#900090", dark: "#ff95ff", legacyHex: "#900090" },
  { id: "pink", label: "Pink", light: "#8d5071", dark: "#b47b9a", legacyHex: "#8f5173" },
  { id: "orange", label: "Orange", light: "#975034", dark: "#c67859", legacyHex: "#b7613f" },
  { id: "yellow", label: "Yellow", light: "#77612c", dark: "#a7883d", legacyHex: "#c8ac69" },
];

/** The app's accent when nothing was chosen. Never saved, like the style kit's defaults. */
export const DEFAULT_ACCENT_ID = "green";

/** Kept from the old version so existing choices carry over. */
const STORAGE_KEY = "tipTracker(themeColor)";

/** Finds an option by id, or by the hex it was saved as in older versions. */
export function findAccent(savedValue: string | null): AccentOption | undefined {
  if (savedValue === null) return undefined;
  const normalized = savedValue.trim().toLowerCase();
  return ACCENTS.find((option) => option.id === normalized || option.legacyHex === normalized);
}

/** Saves the choice; choosing the default removes the key instead. */
export function saveAccentId(id: string): void {
  try {
    if (id === DEFAULT_ACCENT_ID) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage blocked (some private windows): the choice still applies for this visit.
  }
}

/** The saved accent's id, migrating a legacy hex to its id; the default if nothing valid is saved. */
export function loadAccentId(): string {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_ACCENT_ID;
  }

  const option = findAccent(saved);
  if (!option) return DEFAULT_ACCENT_ID;

  const isLegacyHex = saved !== option.id;
  if (isLegacyHex) saveAccentId(option.id);
  return option.id;
}

/**
 * Applies an accent by overriding the kit's accent tokens on <html>. Hover colors are derived:
 * darker in light mode and lighter in dark mode, so button text gains contrast on hover.
 */
export function applyAccent(id: string): void {
  const option = ACCENTS.find((candidate) => candidate.id === id) ?? ACCENTS[0];
  const hoverLight = `color-mix(in srgb, ${option.light} 80%, black)`;
  const hoverDark = `color-mix(in srgb, ${option.dark} 80%, white)`;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--accentFull", `light-dark(${option.light}, ${option.dark})`);
  rootStyle.setProperty("--accentMuted", `light-dark(${hoverLight}, ${hoverDark})`);
}

/** Run once at startup (main.js), before mounting, so the first render has the right accent. */
export function applySavedAccent(): void {
  const id = loadAccentId();
  applyAccent(id);
}
