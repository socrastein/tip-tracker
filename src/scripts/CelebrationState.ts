import { reactive } from "vue";
import type { CelebrationName } from "./CelebrationRotation";

/**
 * Which celebration is on screen right now. CelebrationOverlay.vue reads it;
 * BigTipCelebrator.ts and the dev panel write it.
 */
export const celebrationState = reactive({
  // gifUrl is the provider-hosted GIF to show with this celebration, or null for none.
  current: null as { name: CelebrationName; id: number; gifUrl: string | null } | null,
});

let nextCelebrationId = 1;

/**
 * Show a celebration (replacing any that is still playing).
 * @param name  which celebration
 * @param gifUrl  a GIF to show with it, or null for none
 */
export function showCelebration(name: CelebrationName, gifUrl: string | null = null): void {
  celebrationState.current = { name, id: nextCelebrationId++, gifUrl };
}

/** End whatever celebration is showing. */
export function endCelebration(): void {
  celebrationState.current = null;
}
