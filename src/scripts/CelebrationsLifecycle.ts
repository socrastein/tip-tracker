import { isCelebrationsLive, onLiveChanged } from "./CelebrationsLive";

/**
 * Starts and stops the parts of the celebration feature that work in the
 * background (decoding sounds, fetching GIFs) according to the master switch
 * in CelebrationsLive.ts. While the phone is dark none of them runs, so there
 * is no request to a GIF provider and no audio work at all; when the phone
 * turns live they start, and when it goes dark again the GIFs stop.
 * main.js supplies the real features; tests supply stand-ins.
 */

/** The background parts of the feature, each safe to call more than once. */
export interface CelebrationFeatures {
  prepareCustom: () => void; // decode the on-device custom celebration
  preparePack: () => void; // decode the downloaded pack
  startGifs: () => void; // switch the GIF source on and fetch the first GIF
  stopGifs: () => void; // switch the GIF source off
}

/** Start the features when live, stop what can be stopped when dark. */
export function applyLiveSetting(isLive: boolean, features: CelebrationFeatures): void {
  if (!isLive) {
    features.stopGifs();
    return;
  }
  features.prepareCustom();
  features.preparePack();
  features.startGifs();
}

/**
 * Apply the current setting now, and again whenever the home server changes it.
 * @returns a function that stops listening
 */
export function startCelebrationFeatures(features: CelebrationFeatures): () => void {
  applyLiveSetting(isCelebrationsLive(), features);
  return onLiveChanged((isLive) => applyLiveSetting(isLive, features));
}
