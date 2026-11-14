import type { GifSource } from "./GifSource";

/**
 * GIPHY as the GIF provider, using its Search API
 * (https://developers.giphy.com/docs/api/endpoint).
 *
 * Provider rules this follows (see README, "Celebration GIFs"):
 * - Calls go straight from the browser to GIPHY (no proxy).
 * - Only rating "g" is requested, the most family-safe level.
 * - The media URL is used exactly as GIPHY returns it (nothing removed or
 *   changed, query parameters included), hotlinked from GIPHY's servers.
 * - Nothing from GIPHY is stored: no media in the repo, and no API response
 *   or URL is written to storage (see GifPreloader.ts for the one in-memory slot).
 * - Whoever shows the GIF must show "Powered By GIPHY" (CelebrationOverlay.vue).
 */

const SEARCH_URL = "https://api.giphy.com/v1/gifs/search";
const RESULTS_PER_SEARCH = 25; // GIPHY's default; a free (beta) key allows up to 50
const FAMILY_SAFE_RATING = "g";
const REQUEST_TIMEOUT_MS = 8000;

interface GiphyRendition {
  url?: unknown;
  webp?: unknown;
}

interface GiphyResult {
  rating?: unknown;
  images?: { fixed_width?: GiphyRendition };
}

/**
 * The URL of the 200 pixel wide rendition ("fixed_width": light enough for
 * a phone). WebP is preferred over GIF because GIPHY recommends it and it
 * is smaller; both are animated.
 */
function phoneSizedUrl(result: GiphyResult): string | null {
  const rendition = result.images?.fixed_width;
  const url = rendition?.webp ?? rendition?.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Belt and braces: skip any result that is not rated "g" even though we asked for it. */
function isFamilySafe(result: GiphyResult): boolean {
  return result.rating === undefined || result.rating === FAMILY_SAFE_RATING;
}

/** Every usable, family-safe URL of a search response body (any other shape gives none). */
function usableUrls(body: unknown): string[] {
  const results = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(results)) return [];
  return (results as GiphyResult[])
    .filter(isFamilySafe)
    .map(phoneSizedUrl)
    .filter((url): url is string => url !== null);
}

/**
 * Create the GIPHY source.
 * @param apiKey  a GIPHY API key (from VITE_GIF_API_KEY)
 * @param fetchFunction  fetch, injectable so tests never touch the network
 * @param random  returns 0 up to but not including 1 (Math.random by default)
 */
export function createGiphyGifSource(
  apiKey: string,
  fetchFunction: typeof fetch = fetch,
  random: () => number = Math.random,
): GifSource {
  return {
    async findRandomGif(phrase, excludedUrl) {
      try {
        const query = new URLSearchParams({
          api_key: apiKey,
          q: phrase,
          limit: String(RESULTS_PER_SEARCH),
          rating: FAMILY_SAFE_RATING,
          lang: "en",
        });
        const response = await fetchFunction(`${SEARCH_URL}?${query}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) return null; // rate limited (429), bad key (401/403), server error
        const candidates = usableUrls(await response.json()).filter((url) => url !== excludedUrl);
        if (candidates.length === 0) return null;
        return candidates[Math.floor(random() * candidates.length)];
      } catch {
        return null; // offline, timed out, or not JSON: no GIF this time
      }
    },
  };
}
