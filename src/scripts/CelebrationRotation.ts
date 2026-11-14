/**
 * Chooses which celebration plays next, never the one that played last.
 * Pure: the random source is injected so tests are deterministic.
 */

/** The celebrations built into the app, each drawn and sounded by its own name. */
export const BUILT_IN_CELEBRATIONS = [
  "billsRain",
  "confetti",
  "fireworks",
  "club",
  "jackpot",
] as const;

/** The owner's own celebration, which exists only once its media is set up on the device. */
export const CUSTOM_CELEBRATION = "custom" as const;

/** A celebration made from the home server's pack, named "pack:" plus its base file name. */
export type PackCelebrationName = `pack:${string}`;

export type CelebrationName =
  | (typeof BUILT_IN_CELEBRATIONS)[number]
  | typeof CUSTOM_CELEBRATION
  | PackCelebrationName;

/** The prefix that marks a pack celebration's name. */
export const PACK_NAME_PREFIX = "pack:";

/** Whether a celebration name belongs to a pack celebration. */
export function isPackCelebration(name: string): name is PackCelebrationName {
  return name.startsWith(PACK_NAME_PREFIX);
}

/**
 * Pick the next celebration from the available ones, skipping the last
 * one shown so the same one never plays twice in a row. With only one
 * available it has to repeat.
 * @param available  every celebration that can play now (custom only when set up)
 * @param lastShown  the celebration that played last, or null when none has
 * @param random  returns a number from 0 up to but not including 1 (Math.random by default)
 * @returns the celebration to play
 */
export function pickNextCelebration(
  available: CelebrationName[],
  lastShown: CelebrationName | null,
  random: () => number = Math.random,
): CelebrationName {
  if (available.length === 0) throw new Error("No celebrations are available");
  const candidates = available.filter((name) => name !== lastShown);
  const pool = candidates.length > 0 ? candidates : available;
  return pool[Math.floor(random() * pool.length)];
}
