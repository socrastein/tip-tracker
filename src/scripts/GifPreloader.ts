import type { GifSource } from "./GifSource";
import { GIF_SEARCH_PHRASES } from "./GifPhrases";

/**
 * Keeps the NEXT celebration GIF ready, so a celebration never waits for the
 * network: one GIF is found and loaded in the background (when the app opens
 * and after each celebration uses one), and a celebration only takes what is
 * already there. If nothing is ready the celebration just runs without a GIF.
 *
 * Provider rules (GIPHY): the URL is held in memory only, in this one slot,
 * for a single use; it is never written to localStorage, IndexedDB or any
 * file, and it is dropped as soon as a celebration takes it.
 * With no GIF source (no API key) every call does nothing and no request is made.
 */

const IMAGE_LOAD_TIMEOUT_MS = 8000;
const REFILL_DELAY_MS = 1500; // after a celebration starts, so the refill never competes with it

export interface GifPreloader {
  /** Find and load the next GIF in the background. Never rejects. */
  preloadNext(): Promise<void>;
  /** Hand over the ready GIF's URL, once, or null when none is ready. Never waits. */
  takeReady(): string | null;
  /** Put a ready GIF in by hand (the dev preview's stub image). */
  setReady(url: string | null): void;
}

/** Load an image into the browser's cache; resolves true when it loaded in time. */
export function loadImageInBackground(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(false), IMAGE_LOAD_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    image.src = url;
  });
}

/**
 * Create a preloader.
 * @param source  the GIF provider, or null to switch the feature off
 * @param options  injectable pieces for tests: the phrases, the random source, the image loader
 */
export function createGifPreloader(
  source: GifSource | null,
  options: {
    phrases?: string[];
    random?: () => number;
    loadImage?: (url: string) => Promise<boolean>;
  } = {},
): GifPreloader {
  const phrases = options.phrases ?? GIF_SEARCH_PHRASES;
  const random = options.random ?? Math.random;
  const loadImage = options.loadImage ?? loadImageInBackground;
  let readyUrl: string | null = null;
  let lastTakenUrl: string | null = null;
  let isPreloading = false;

  async function preloadNext(): Promise<void> {
    if (source === null || readyUrl !== null || isPreloading || phrases.length === 0) return;
    isPreloading = true;
    try {
      const phrase = phrases[Math.floor(random() * phrases.length)];
      const url = await source.findRandomGif(phrase, lastTakenUrl);
      if (url !== null && url !== lastTakenUrl && (await loadImage(url))) readyUrl = url;
    } catch {
      // A failed refill only means no GIF next time.
    } finally {
      isPreloading = false;
    }
  }

  function takeReady(): string | null {
    const url = readyUrl;
    readyUrl = null;
    if (url === null) return null;
    lastTakenUrl = url;
    setTimeout(() => void preloadNext(), REFILL_DELAY_MS);
    return url;
  }

  function setReady(url: string | null): void {
    readyUrl = url;
  }

  return { preloadNext, takeReady, setReady };
}

/** The app's preloader. Starts switched off; main.js turns it on when there is a key. */
let appPreloader: GifPreloader = createGifPreloader(null);

/** Switch the app's GIFs on (or off, with null) by giving it a provider. */
export function configureGifSource(source: GifSource | null): void {
  appPreloader = createGifPreloader(source);
}

/** The app's preloader (what the celebrations and main.js use). */
export function getGifPreloader(): GifPreloader {
  return appPreloader;
}
