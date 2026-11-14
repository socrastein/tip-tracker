/**
 * What the celebrations need from a GIF provider, so the provider can be
 * swapped without touching anything else (GiphyGifSource.ts is the only
 * implementation today).
 */

export interface GifSource {
  /**
   * Find one random family-safe GIF for a search phrase, sized for a phone.
   * Must resolve (never reject) and use the provider's own hosted URL as
   * returned, untouched.
   * @param phrase  what to search for, for example "dancing cat"
   * @param excludedUrl  a URL not to return (the previous GIF), or null
   * @returns the URL to show, or null when nothing usable could be found
   *   (offline, rate limited, API error, no results)
   */
  findRandomGif(phrase: string, excludedUrl: string | null): Promise<string | null>;
}
