/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createGifPreloader } from "../../scripts/GifPreloader";
import { GIF_SEARCH_PHRASES } from "../../scripts/GifPhrases";

/** A source stub returning the given URLs one after another, remembering what it was asked. */
function sourceReturning(...urls) {
  const calls = [];
  let index = 0;
  return {
    calls,
    findRandomGif: vi.fn(async (phrase, excludedUrl) => {
      calls.push({ phrase, excludedUrl });
      return urls[index++ % urls.length];
    }),
  };
}

const alwaysLoads = async () => true;

describe("GifPreloader", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the four named search phrases", () => {
    expect(GIF_SEARCH_PHRASES).toEqual(["dancing cat", "celebration dance", "make it rain money", "happy dance"]);
  });

  it("searches for a phrase from the list", async () => {
    const source = sourceReturning("https://gif/1");
    for (const [random, expected] of [[0, "dancing cat"], [0.99, "happy dance"]]) {
      const preloader = createGifPreloader(source, { random: () => random, loadImage: alwaysLoads });
      await preloader.preloadNext();
      expect(source.calls.at(-1).phrase).toBe(expected);
    }
  });

  it("is off without a source: no request, nothing ready", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("no network call expected");
    });
    const preloader = createGifPreloader(null);
    await preloader.preloadNext();
    expect(preloader.takeReady()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("never makes the tap path wait: takeReady answers at once, even mid-fetch", async () => {
    let finishSearch;
    const source = { findRandomGif: () => new Promise((resolve) => (finishSearch = resolve)) };
    const preloader = createGifPreloader(source, { loadImage: alwaysLoads });

    const preloading = preloader.preloadNext();
    expect(preloader.takeReady()).toBeNull(); // synchronous, nothing ready yet

    finishSearch("https://gif/1");
    await preloading;
    expect(preloader.takeReady()).toBe("https://gif/1");
  });

  it("hands each GIF over once", async () => {
    const preloader = createGifPreloader(sourceReturning("https://gif/1"), { loadImage: alwaysLoads });
    await preloader.preloadNext();
    expect(preloader.takeReady()).toBe("https://gif/1");
    expect(preloader.takeReady()).toBeNull();
  });

  it("quietly refills after a GIF is taken, asking for something other than the one just used", async () => {
    const source = sourceReturning("https://gif/1", "https://gif/2");
    const preloader = createGifPreloader(source, { loadImage: alwaysLoads });
    await preloader.preloadNext();
    preloader.takeReady();
    expect(source.findRandomGif).toHaveBeenCalledTimes(1); // not on the tap itself

    await vi.advanceTimersByTimeAsync(2000);
    expect(source.findRandomGif).toHaveBeenCalledTimes(2);
    expect(source.calls[1].excludedUrl).toBe("https://gif/1");
    expect(preloader.takeReady()).toBe("https://gif/2");
  });

  it("never repeats the previous GIF even if the provider offers it again", async () => {
    const source = sourceReturning("https://gif/1", "https://gif/1", "https://gif/2");
    const preloader = createGifPreloader(source, { loadImage: alwaysLoads });
    await preloader.preloadNext();
    expect(preloader.takeReady()).toBe("https://gif/1");
    await vi.advanceTimersByTimeAsync(2000); // refill gets gif/1 again: refused
    expect(preloader.takeReady()).toBeNull();
    await preloader.preloadNext();
    expect(preloader.takeReady()).toBe("https://gif/2");
  });

  it("does not start a second search while one is running or a GIF is already ready", async () => {
    const source = sourceReturning("https://gif/1");
    const preloader = createGifPreloader(source, { loadImage: alwaysLoads });
    await Promise.all([preloader.preloadNext(), preloader.preloadNext()]);
    await preloader.preloadNext();
    expect(source.findRandomGif).toHaveBeenCalledTimes(1);
  });

  describe("every failure leaves no GIF, without throwing", () => {
    it("when the search finds nothing", async () => {
      const preloader = createGifPreloader(sourceReturning(null), { loadImage: alwaysLoads });
      await expect(preloader.preloadNext()).resolves.toBeUndefined();
      expect(preloader.takeReady()).toBeNull();
    });

    it("when the search throws", async () => {
      const source = { findRandomGif: async () => { throw new Error("boom"); } };
      const preloader = createGifPreloader(source, { loadImage: alwaysLoads });
      await expect(preloader.preloadNext()).resolves.toBeUndefined();
      expect(preloader.takeReady()).toBeNull();
    });

    it("when the image will not load (offline, slow, broken)", async () => {
      const preloader = createGifPreloader(sourceReturning("https://gif/1"), { loadImage: async () => false });
      await preloader.preloadNext();
      expect(preloader.takeReady()).toBeNull();
    });

    it("and a later search still works after a failure", async () => {
      const source = sourceReturning(null, "https://gif/2");
      const preloader = createGifPreloader(source, { loadImage: alwaysLoads });
      await preloader.preloadNext();
      await preloader.preloadNext();
      expect(preloader.takeReady()).toBe("https://gif/2");
    });
  });

  it("keeps the GIF in memory only: nothing is written to localStorage", async () => {
    const preloader = createGifPreloader(sourceReturning("https://gif/1"), { loadImage: alwaysLoads });
    await preloader.preloadNext();
    preloader.takeReady();
    expect(localStorage.length).toBe(0);
  });

  it("lets the dev preview put a stand-in image in by hand", () => {
    const preloader = createGifPreloader(null);
    preloader.setReady("data:image/svg+xml,sample");
    expect(preloader.takeReady()).toBe("data:image/svg+xml,sample");
  });
});
