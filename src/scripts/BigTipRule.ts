/**
 * The rule for when a tip earns a celebration. Pure and free of Vue and
 * browser APIs, so the exact boundary can be unit tested.
 */

/** A tip of this many dollars or more is a "big tip" and gets a celebration. */
export const BIG_TIP_THRESHOLD = 600;

/**
 * True when saving a tip should celebrate: the new amount reaches the big
 * tip threshold and the tip was not already a big one before this save.
 * - A new tip: pass undefined as the previous amount (599 no, 600 yes).
 * - An edit that lifts a tip from below the threshold to it or past it
 *   (550 to 650) celebrates; an edit of a tip that was already big
 *   (650 to 700) does not, so fixing a typo never replays the party.
 * Loading tips when the app opens never calls this.
 * @param previousAmount  the tip's amount before this save, or undefined for a new tip
 * @param newAmount  the amount just saved
 * @returns whether to play a celebration
 */
export function shouldCelebrate(previousAmount: number | undefined, newAmount: number): boolean {
  const reachesThreshold = newAmount >= BIG_TIP_THRESHOLD;
  const wasAlreadyBig = previousAmount !== undefined && previousAmount >= BIG_TIP_THRESHOLD;
  return reachesThreshold && !wasAlreadyBig;
}
