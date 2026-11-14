/// <reference types="vitest" />
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createGiphyGifSource } from "../../scripts/GiphyGifSource";

/** A GIPHY-shaped search result. */
function result(id, overrides = {}) {
  return {
    id,
    rating: "g",
    images: {
      fixed_width: {
        url: `https://media0.giphy.com/media/${id}/200w.gif?cid=abc&rid=200w.gif`,
        webp: `https://media0.giphy.com/media/${id}/200w.webp?cid=abc&rid=200w.webp`,
      },
    },
    ...overrides,
  };
}

function okResponse(data) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

describe("GiphyGifSource", () => {
  let fetchStub;

  beforeEach(() => {
    localStorage.clear();
    fetchStub = vi.fn();
  });

  it("always asks for family-safe (rating g) results, with the key and the phrase", async () => {
    fetchStub.mockResolvedValue(okResponse([result("a")]));
    await createGiphyGifSource("test-key", fetchStub).findRandomGif("dancing cat", null);

    const requested = new URL(fetchStub.mock.calls[0][0]);
    expect(requested.origin + requested.pathname).toBe("https://api.giphy.com/v1/gifs/search");
    expect(requested.searchParams.get("rating")).toBe("g");
    expect(requested.searchParams.get("q")).toBe("dancing cat");
    expect(requested.searchParams.get("api_key")).toBe("test-key");
  });

  it("returns one of the results, chosen at random, with the URL exactly as given", async () => {
    fetchStub.mockResolvedValue(okResponse([result("a"), result("b"), result("c")]));
    const first = await createGiphyGifSource("k", fetchStub, () => 0).findRandomGif("x", null);
    const last = await createGiphyGifSource("k", fetchStub, () => 0.999999).findRandomGif("x", null);
    expect(first).toBe("https://media0.giphy.com/media/a/200w.webp?cid=abc&rid=200w.webp");
    expect(last).toBe("https://media0.giphy.com/media/c/200w.webp?cid=abc&rid=200w.webp");
  });

  it("uses the phone-sized 200 pixel rendition, falling back from WebP to GIF", async () => {
    const gifOnly = result("g1");
    delete gifOnly.images.fixed_width.webp;
    fetchStub.mockResolvedValue(okResponse([gifOnly]));
    const url = await createGiphyGifSource("k", fetchStub).findRandomGif("x", null);
    expect(url).toBe("https://media0.giphy.com/media/g1/200w.gif?cid=abc&rid=200w.gif");
  });

  it("never returns the excluded (previous) URL", async () => {
    fetchStub.mockResolvedValue(okResponse([result("a"), result("b")]));
    const previous = "https://media0.giphy.com/media/a/200w.webp?cid=abc&rid=200w.webp";
    for (const value of [0, 0.5, 0.999999]) {
      const url = await createGiphyGifSource("k", fetchStub, () => value).findRandomGif("x", previous);
      expect(url).not.toBe(previous);
    }
  });

  it("gives no GIF when the only result is the excluded one", async () => {
    fetchStub.mockResolvedValue(okResponse([result("a")]));
    const previous = "https://media0.giphy.com/media/a/200w.webp?cid=abc&rid=200w.webp";
    expect(await createGiphyGifSource("k", fetchStub).findRandomGif("x", previous)).toBeNull();
  });

  it("skips any result that is not rated g, even though g was requested", async () => {
    fetchStub.mockResolvedValue(okResponse([result("r1", { rating: "r" }), result("pg", { rating: "pg" })]));
    expect(await createGiphyGifSource("k", fetchStub).findRandomGif("x", null)).toBeNull();
  });

  describe("every failure falls back to no GIF without throwing", () => {
    const failures = {
      "a rate limit (429)": () => fetchStub.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
      "a bad key (403)": () => fetchStub.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
      "a server error (500)": () => fetchStub.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
      "being offline": () => fetchStub.mockRejectedValue(new TypeError("Failed to fetch")),
      "a timeout": () => fetchStub.mockRejectedValue(new DOMException("timed out", "TimeoutError")),
      "a response that is not JSON": () =>
        fetchStub.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } }),
      "a response with no data list": () => fetchStub.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
      "a null response body": () => fetchStub.mockResolvedValue({ ok: true, status: 200, json: async () => null }),
      "no results": () => fetchStub.mockResolvedValue(okResponse([])),
      "results with no usable image": () => fetchStub.mockResolvedValue(okResponse([{ rating: "g", images: {} }])),
    };

    for (const [name, arrange] of Object.entries(failures)) {
      it(`on ${name}`, async () => {
        arrange();
        await expect(createGiphyGifSource("k", fetchStub).findRandomGif("x", null)).resolves.toBeNull();
      });
    }
  });

  it("stores nothing: no response or URL is written to localStorage", async () => {
    fetchStub.mockResolvedValue(okResponse([result("a")]));
    await createGiphyGifSource("k", fetchStub).findRandomGif("x", null);
    expect(localStorage.length).toBe(0);
  });
});
