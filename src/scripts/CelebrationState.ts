import { reactive } from "vue";
import type { CelebrationName } from "./CelebrationRotation";

/**
 * Which celebration is on screen right now. CelebrationOverlay.vue reads it;
 * BigTipCelebrator.ts and the dev panel write it.
 */
export interface CurrentCelebration {
  name: CelebrationName;
  id: number;
  gifUrl: string | null; // a provider-hosted GIF (needs its attribution), or null
  pictureUrl: string | null; // the owner's own picture (custom slot or pack), or null
  durationMs: number | null; // how long to stay; null for the built-in's own length
}

export const celebrationState = reactive({
  current: null as CurrentCelebration | null,
});

let nextCelebrationId = 1;

/**
 * Show a celebration (replacing any that is still playing).
 * @param name  which celebration
 * @param extras  a GIF, the owner's picture, and a length that go with it (all optional)
 */
export function showCelebration(
  name: CelebrationName,
  extras: { gifUrl?: string | null; pictureUrl?: string | null; durationMs?: number | null } = {},
): void {
  celebrationState.current = {
    name,
    id: nextCelebrationId++,
    gifUrl: extras.gifUrl ?? null,
    pictureUrl: extras.pictureUrl ?? null,
    durationMs: extras.durationMs ?? null,
  };
}

/** End whatever celebration is showing. */
export function endCelebration(): void {
  celebrationState.current = null;
}
