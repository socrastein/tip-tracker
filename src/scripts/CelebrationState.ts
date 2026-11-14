import { reactive } from "vue";
import type { CelebrationName } from "./CelebrationRotation";

/**
 * Which celebration is on screen right now. CelebrationOverlay.vue reads it;
 * BigTipCelebrator.ts and the dev panel write it.
 */
export const celebrationState = reactive({
  current: null as { name: CelebrationName; id: number } | null,
});

let nextCelebrationId = 1;

/** Show a celebration (replacing any that is still playing). */
export function showCelebration(name: CelebrationName): void {
  celebrationState.current = { name, id: nextCelebrationId++ };
}

/** End whatever celebration is showing. */
export function endCelebration(): void {
  celebrationState.current = null;
}
