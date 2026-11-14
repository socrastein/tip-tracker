/**
 * The master switch for everything celebration-related on this phone.
 *
 * Celebrations are a surprise, so a phone starts DARK: no celebration on any
 * tip (the built-in ones included), no "Celebration Setup" menu link, no
 * "Pack:" status line, no GIF requests, no audio unlocking. The owner turns
 * them on in the tip console; the home server then says `live: true` in its
 * pack manifest, and the first time the phone reads that it remembers it on
 * this device (so celebrations also work away from home). If the server later
 * says `live: false` the phone goes dark again at that check-in.
 *
 * The dev server (and only it) counts as live, so the preview panel and local
 * testing work as before. In a production build `import.meta.env.DEV` is
 * replaced by false, so a production build is dark by default (a test checks).
 *
 * Every place that could show or play a celebration asks isCelebrationsLive()
 * first: BigTipCelebrator (celebrateIfBigTip, playCelebration), NavBarMenu
 * (the link and the status line), the /celebration-setup route (main.js), and
 * the start-up wiring in CelebrationsLifecycle.ts (GIFs, audio decoding).
 */

// Not under the tip key prefix, so the tip loader and the backup never see it.
const LIVE_KEY = "tipTracker(celebrations).live";

type LiveListener = (isLive: boolean) => void;
const listeners = new Set<LiveListener>();

/** True on the dev server, which counts as live. */
function isDevelopmentBuild(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Whether celebrations may show or play on this phone right now.
 * @returns true on the dev server, or once the home server has said live: true (until it says live: false)
 */
export function isCelebrationsLive(): boolean {
  if (isDevelopmentBuild()) return true;
  try {
    return localStorage.getItem(LIVE_KEY) === "true";
  } catch {
    return false; // storage unavailable: stay dark, the safe side of a surprise
  }
}

/**
 * Remember what the home server said, and tell the listeners if that changed
 * whether the phone is live. A failure to store is ignored (the phone stays as it was).
 * @param isLive  the `live` value from the server's manifest
 */
export function recordLiveSetting(isLive: boolean): void {
  const wasLive = isCelebrationsLive();
  try {
    localStorage.setItem(LIVE_KEY, String(isLive));
  } catch {
    return;
  }
  if (isCelebrationsLive() !== wasLive) for (const listener of listeners) listener(isCelebrationsLive());
}

/**
 * Be told when the phone turns live or dark.
 * @returns a function that stops the notifications
 */
export function onLiveChanged(listener: LiveListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The router guard of the /celebration-setup page: the page exists only while
 * celebrations are live; while dark a typed address goes Home.
 */
export function celebrationSetupRouteGuard(): true | { name: "home" } {
  return isCelebrationsLive() ? true : { name: "home" };
}
