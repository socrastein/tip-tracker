/**
 * When things happen in the built-in celebrations. The animations
 * (CelebrationParticles.ts, CelebrationOverlay.vue) and the sounds
 * (CelebrationSounds.ts) both read these, so a rocket's whistle, a confetti
 * pop or a reel's landing is heard at the moment it is seen. All times are in
 * seconds from the start of the celebration.
 */

/** How long every built-in celebration lasts by default (a tap still ends it at once). */
export const BUILT_IN_CELEBRATION_SECONDS = 6;

/** Milliseconds, for the timer that ends a celebration. */
export const BUILT_IN_CELEBRATION_MS = BUILT_IN_CELEBRATION_SECONDS * 1000;

/**
 * Confetti goes off in several bursts that work their way UP the screen.
 * `heightFraction` is how far down the screen the burst is (1 is the bottom
 * edge, 0 the top): the first burst is near the bottom, the last near the top.
 */
export const CONFETTI_BURSTS = [
  { atSeconds: 0.2, heightFraction: 0.88, widthFraction: 0.3 },
  { atSeconds: 1.4, heightFraction: 0.7, widthFraction: 0.7 },
  { atSeconds: 2.6, heightFraction: 0.52, widthFraction: 0.35 },
  { atSeconds: 3.8, heightFraction: 0.34, widthFraction: 0.65 },
  { atSeconds: 5.0, heightFraction: 0.16, widthFraction: 0.5 },
] as const;

/** How long a firework rocket takes to fly from the bottom edge up to where it bursts. */
export const FIREWORK_FLIGHT_SECONDS = 0.7;

/**
 * Each firework rocket: when it leaves the bottom edge, where along the width
 * it flies (0 is the left edge, 1 the right), and how far down the screen it
 * bursts (0 is the top edge). Different heights and positions, spread over the show.
 */
export const FIREWORK_ROCKETS = [
  { launchSeconds: 0.1, widthFraction: 0.25, burstHeightFraction: 0.3 },
  { launchSeconds: 0.85, widthFraction: 0.72, burstHeightFraction: 0.2 },
  { launchSeconds: 1.6, widthFraction: 0.5, burstHeightFraction: 0.42 },
  { launchSeconds: 2.35, widthFraction: 0.15, burstHeightFraction: 0.38 },
  { launchSeconds: 3.1, widthFraction: 0.85, burstHeightFraction: 0.25 },
  { launchSeconds: 3.85, widthFraction: 0.4, burstHeightFraction: 0.15 },
] as const;

/** When each of the jackpot's three reels stops on its dollar sign. */
export const JACKPOT_REEL_STOP_SECONDS = [2.6, 3.1, 3.6] as const;

/** When the bills start falling over the jackpot: the moment the last reel lands. */
export const JACKPOT_BILLS_START_SECONDS = JACKPOT_REEL_STOP_SECONDS[2] + 0.1;
