<script setup lang="ts">
/**
 * Dev-only preview: plays each celebration by name without logging a tip.
 * App.vue loads this only when import.meta.env.DEV is true, so it is not in
 * the production build at all. Keys 1-5 play the built-ins, 0 the custom one.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";

import { availableCelebrations, playCelebration } from "../scripts/BigTipCelebrator";
import { BUILT_IN_CELEBRATIONS, CUSTOM_CELEBRATION } from "../scripts/CelebrationRotation";
import { getGifPreloader } from "../scripts/GifPreloader";
import type { CelebrationName } from "../scripts/CelebrationRotation";

// A stand-in for a provider GIF so the layout can be judged without an API key:
// a small animated SVG (a bouncing cat face), drawn here, nothing downloaded.
const SAMPLE_GIF_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="#6a1b9a"/>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-14;0,0" dur="0.5s" repeatCount="indefinite"/>
        <polygon points="45,70 55,20 90,50" fill="#ff9800"/>
        <polygon points="155,70 145,20 110,50" fill="#ff9800"/>
        <circle cx="100" cy="105" r="58" fill="#ffb74d"/>
        <circle cx="78" cy="95" r="8" fill="#222"/>
        <circle cx="122" cy="95" r="8" fill="#222"/>
        <path d="M80 125 Q100 145 120 125" stroke="#222" stroke-width="5" fill="none"/>
      </g>
    </svg>`,
  );

const isCustomReady = ref(false);
const isSampleGifOn = ref(false);

/** Refresh whether the custom celebration is set up (it loads in the background). */
function refreshCustomReady(): void {
  isCustomReady.value = availableCelebrations().includes(CUSTOM_CELEBRATION);
}

/** Play a celebration; this runs inside the click or key press, so sound is allowed. */
function preview(name: CelebrationName): void {
  refreshCustomReady();
  if (isSampleGifOn.value) getGifPreloader().setReady(SAMPLE_GIF_URL);
  playCelebration(name);
}

/** Number keys play celebrations, unless the user is typing in a field. */
function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.matches("input, textarea, select")) return;
  if (event.key === "0") preview(CUSTOM_CELEBRATION);
  const builtInIndex = Number(event.key) - 1;
  const builtIn = BUILT_IN_CELEBRATIONS[builtInIndex];
  if (builtIn) preview(builtIn);
}

onMounted(() => {
  refreshCustomReady();
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="devPanel">
    <p class="devTitle">Dev preview: celebrations</p>
    <button v-for="name in BUILT_IN_CELEBRATIONS" :key="name" @click="preview(name)">
      {{ name }}
    </button>
    <button v-if="isCustomReady" @click="preview(CUSTOM_CELEBRATION)">custom</button>
    <button :aria-pressed="isSampleGifOn" @click="isSampleGifOn = !isSampleGifOn">
      sample GIF: {{ isSampleGifOn ? "on" : "off" }}
    </button>
  </div>
</template>

<style scoped>
.devPanel {
  position: fixed;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 3000;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 14rem;
  padding: 0.5rem;
  border: 1px dashed var(--themeColor);
  border-radius: 0.5rem;
  background: var(--backgroundBlack);
  font-size: 0.7rem;
}

.devTitle {
  width: 100%;
}

button {
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  background: var(--backgroundLight);
}
</style>
