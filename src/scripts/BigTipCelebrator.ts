import { shouldCelebrate } from "./BigTipRule";
import {
  BUILT_IN_CELEBRATIONS,
  CUSTOM_CELEBRATION,
  isPackCelebration,
  pickNextCelebration,
} from "./CelebrationRotation";
import type { CelebrationName } from "./CelebrationRotation";
import { showCelebration } from "./CelebrationState";
import { playCelebrationSound, unlockAudioContext } from "./CelebrationSounds";
import { playClip } from "./CustomCelebrationAudio";
import { getPreparedCustomCelebration } from "./CustomCelebrationRuntime";
import { getGifPreloader } from "./GifPreloader";
import { getPackCelebrations, getPackImageUrls } from "./CelebrationPackRuntime";
import { MIN_CLIP_CELEBRATION_MS, playClipCelebration } from "./CelebrationClip";
import { planPackCelebration } from "./PackCelebrationPlan";

/**
 * Starts the celebration after a big tip has been saved. Everything here is
 * cosmetic: celebrateIfBigTip never throws, so it can never get in the way
 * of saving a tip (the tip is stored before it is called).
 */

// Not under the tip key prefix, so the tip loader and the backup never see it.
const LAST_CELEBRATION_KEY = "tipTracker(celebration).lastShown";

/** The last celebration shown, remembered across launches so a restart does not repeat it. */
function readLastCelebration(): CelebrationName | null {
  try {
    const stored = localStorage.getItem(LAST_CELEBRATION_KEY);
    const known: string[] = [...BUILT_IN_CELEBRATIONS, CUSTOM_CELEBRATION];
    if (stored === null) return null;
    return known.includes(stored) || isPackCelebration(stored) ? (stored as CelebrationName) : null;
  } catch {
    return null; // storage unavailable: just allow any celebration
  }
}

function rememberLastCelebration(name: CelebrationName): void {
  try {
    localStorage.setItem(LAST_CELEBRATION_KEY, name);
  } catch {
    // Not remembering only means a repeat is possible: not worth failing for.
  }
}

// The celebrations with room for a GIF swaying in the middle. The banner
// and the jackpot reels already fill that spot, so they never show one.
const GIF_CELEBRATIONS: CelebrationName[] = ["billsRain", "confetti", "fireworks", CUSTOM_CELEBRATION];

/**
 * The GIF to show with a celebration: the one already loaded in the
 * background, or null (never waiting, never failing) when there is none or
 * the celebration has no room for one. The custom celebration only takes a
 * GIF when the owner set no picture of their own.
 */
function takeGifFor(name: CelebrationName): string | null {
  try {
    if (!GIF_CELEBRATIONS.includes(name)) return null;
    const hasOwnPicture = name === CUSTOM_CELEBRATION && getPreparedCustomCelebration()?.imageUrl;
    return hasOwnPicture ? null : getGifPreloader().takeReady();
  } catch {
    return null;
  }
}

/** Every celebration that can play now: the built-ins, the custom one when set up, and the pack's. */
export function availableCelebrations(): CelebrationName[] {
  const custom = getPreparedCustomCelebration() ? [CUSTOM_CELEBRATION] : [];
  const pack = getPackCelebrations().map((celebration) => celebration.name);
  return [...BUILT_IN_CELEBRATIONS, ...custom, ...pack];
}

const CUSTOM_EXTRA_MS = 1000; // the picture and bills outlast a clip a little

/**
 * Play one celebration by name: sound first (inside the tap), then the visuals.
 * Used by the rotation and by the dev-only preview.
 * @param name  the celebration to play
 */
export function playCelebration(name: CelebrationName): void {
  if (isPackCelebration(name)) {
    playPackCelebration(name);
    return;
  }
  try {
    startCelebrationSound(name);
  } catch (error) {
    // No sound (blocked or unsupported) must not cost the visuals.
    console.warn("[Celebration] Sound could not start:", error);
  }
  showCelebration(name, extrasFor(name));
}

/** The owner's picture and the length of their clip, for the custom celebration; the GIF for the others. */
function extrasFor(name: CelebrationName): { gifUrl: string | null; pictureUrl: string | null; durationMs: number | null } {
  const custom = name === CUSTOM_CELEBRATION ? getPreparedCustomCelebration() : null;
  const pictureUrl = custom?.imageUrl ?? null;
  const durationMs = custom ? (custom.settings.lengthSeconds * 1000) + CUSTOM_EXTRA_MS : null;
  return { gifUrl: pictureUrl ? null : takeGifFor(name), pictureUrl, durationMs };
}

/** Start the sound for a celebration: the owner's clip or the synthesized score. */
function startCelebrationSound(name: CelebrationName): void {
  const context = unlockAudioContext();
  if (name !== CUSTOM_CELEBRATION) {
    playCelebrationSound(name as (typeof BUILT_IN_CELEBRATIONS)[number], context);
    return;
  }
  const custom = getPreparedCustomCelebration();
  if (custom === null) return;
  playClip(context, custom.buffer, custom.settings);
}

/**
 * Play a pack celebration: its clip (or a built-in sound when the pack gave
 * none), then its picture, a GIF, or just bills. A pack celebration that has
 * gone missing, or any failure, plays nothing and never throws.
 */
function playPackCelebration(name: CelebrationName): void {
  const celebration = getPackCelebrations().find((candidate) => candidate.name === name);
  if (celebration === undefined) return;
  const plan = planPackCelebration(celebration, getPackImageUrls(), getGifPreloader().hasReady());
  const extras = {
    gifUrl: plan.useGif ? getGifPreloader().takeReady() : null,
    pictureUrl: plan.pictureUrl,
  };
  if (celebration.clip) {
    playClipCelebration(name, celebration.clip, extras);
    return;
  }
  // A picture-only celebration borrows a built-in celebration's sound.
  try {
    if (plan.builtInSound) playCelebrationSound(plan.builtInSound, unlockAudioContext());
  } catch (error) {
    console.warn("[Celebration] Pack sound could not start:", error);
  }
  showCelebration(name, { ...extras, durationMs: MIN_CLIP_CELEBRATION_MS });
}

/**
 * Celebrate if the saved tip earned it. Call it right after the tip has been
 * stored, from inside the Confirm tap's handler (so sound is allowed).
 * Failures are logged and swallowed.
 * @param previousAmount  the tip's amount before this save, undefined for a new tip
 * @param newAmount  the amount just saved
 * @param play  how a chosen celebration is played (injectable for tests)
 */
export function celebrateIfBigTip(
  previousAmount: number | undefined,
  newAmount: number,
  play: (name: CelebrationName) => void = playCelebration,
): void {
  try {
    if (!shouldCelebrate(previousAmount, newAmount)) return;
    const name = pickNextCelebration(availableCelebrations(), readLastCelebration());
    rememberLastCelebration(name);
    play(name);
  } catch (error) {
    console.error("[Celebration] Celebration failed, the tip was saved anyway:", error);
  }
}
