<script setup lang="ts">
/**
 * The celebration on screen, drawn above the whole app. It never blocks the
 * page (pointer-events are off: taps reach what is underneath), and any tap
 * anywhere also ends it early. Which celebration shows comes from
 * celebrationState; BigTipCelebrator starts it after a big tip is saved.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

import { BIG_TIP_THRESHOLD } from "../scripts/BigTipRule";
import { celebrationState, endCelebration } from "../scripts/CelebrationState";
import { startParticleShow } from "../scripts/CelebrationParticles";
import type { ParticleShow } from "../scripts/CelebrationParticles";
import type { CelebrationName } from "../scripts/CelebrationRotation";
import { getPreparedCustomCelebration } from "../scripts/CustomCelebrationRuntime";

const ACCENT_FALLBACK = "#378e3c";
const CUSTOM_EXTRA_SECONDS = 1; // the picture and bills outlast the clip a little

// How many milliseconds each built-in celebration stays on screen.
const DURATION_MS: Record<Exclude<CelebrationName, "custom">, number> = {
  billsRain: 4500,
  confetti: 4000,
  fireworks: 4200,
  club: 4200,
  jackpot: 4600,
};

// The celebrations drawn on the canvas, and the particle show each one runs.
const PARTICLE_SHOWS: Partial<Record<CelebrationName, ParticleShow>> = {
  billsRain: "billsRain",
  confetti: "confetti",
  fireworks: "fireworks",
  custom: "billsRain",
};

// Symbols on each reel's strip, top to bottom. The last one, where a reel
// stops, is "$" so the three reels land on a jackpot.
const REEL_SYMBOLS = ["★", "7", "$", "♦", "7", "★", "$", "♦", "★", "7", "♦", "$"];

const canvas = ref<HTMLCanvasElement | null>(null);
const current = computed(() => celebrationState.current);
const customImageUrl = computed(() =>
  current.value?.name === "custom" ? (getPreparedCustomCelebration()?.imageUrl ?? null) : null,
);

// Set when the GIF could not be drawn, which hides it and its attribution.
const gifFailed = ref(false);
// A GIF shows unless the owner's own picture is already taking its place.
const showGif = computed(
  () => Boolean(current.value?.gifUrl) && !customImageUrl.value && !gifFailed.value,
);

let stopParticles: (() => void) | null = null;
let endTimer: ReturnType<typeof setTimeout> | null = null;

/** The app's current accent colour (the user's chosen theme colour). */
function readAccentColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--themeColor").trim();
  return value || ACCENT_FALLBACK;
}

/** How long a celebration stays: the clip's length plus a moment for the custom one. */
function durationFor(name: CelebrationName): number {
  if (name !== "custom") return DURATION_MS[name];
  const lengthSeconds = getPreparedCustomCelebration()?.settings.lengthSeconds ?? 0;
  return (lengthSeconds + CUSTOM_EXTRA_SECONDS) * 1000;
}

/** Stop animations and timers, leaving nothing running. */
function cleanUp(): void {
  stopParticles?.();
  stopParticles = null;
  if (endTimer !== null) clearTimeout(endTimer);
  endTimer = null;
  window.removeEventListener("pointerdown", endCelebration, true);
}

/** Start the visuals of a newly shown celebration. Failures only lose the animation. */
async function begin(name: CelebrationName): Promise<void> {
  await nextTick(); // wait for the canvas to exist
  try {
    const show = PARTICLE_SHOWS[name];
    if (show && canvas.value) {
      stopParticles = startParticleShow(canvas.value, show, readAccentColor());
    }
  } catch (error) {
    console.warn("[Celebration] Animation failed:", error);
  }
  endTimer = setTimeout(endCelebration, durationFor(name));
  // Capture phase and no preventDefault: the tap ends the celebration and
  // still reaches the page underneath.
  window.addEventListener("pointerdown", endCelebration, true);
}

watch(
  () => current.value?.id,
  () => {
    cleanUp();
    gifFailed.value = false;
    if (current.value) void begin(current.value.name);
  },
);

onBeforeUnmount(cleanUp);
</script>

<template>
  <div v-if="current" :key="current.id" class="celebration" :data-celebration="current.name" aria-hidden="true">
    <canvas v-if="PARTICLE_SHOWS[current.name]" ref="canvas" class="celebrationCanvas" />

    <div v-if="current.name === 'club'" class="clubBanner">
      <span class="clubCoin coinLeft">$</span>
      <div class="clubPlate">
        <span class="clubNumber">{{ BIG_TIP_THRESHOLD }}</span>
        <span class="clubWord">Club</span>
        <span class="clubShine" />
      </div>
      <span class="clubCoin coinRight">$</span>
    </div>

    <div v-else-if="current.name === 'jackpot'" class="jackpot">
      <div class="reels">
        <div v-for="reel in 3" :key="reel" class="reel">
          <div class="reelStrip" :class="`reelStop${reel}`">
            <span v-for="(symbol, index) in REEL_SYMBOLS" :key="index">{{ symbol }}</span>
          </div>
        </div>
      </div>
      <p class="jackpotWord">Jackpot!</p>
    </div>

    <img v-else-if="customImageUrl" :src="customImageUrl" class="customImage" alt="" />

    <!-- A provider GIF; GIPHY's terms require its attribution wherever one is shown. -->
    <div v-if="showGif" class="celebrationGif">
      <img :src="current.gifUrl!" class="gifImage" alt="" @error="gifFailed = true" />
      <p class="gifAttribution">Powered By GIPHY</p>
    </div>
  </div>
</template>

<style scoped>
.celebration {
  position: fixed;
  inset: 0;
  z-index: 2000; /* above the nav bar (50), add-tip form (20) and menu (1000) */
  pointer-events: none; /* never blocks the page */
  overflow: hidden;
  animation: celebrationIn 0.25s ease-out;
}

.celebrationCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

@keyframes celebrationIn {
  from {
    opacity: 0;
  }
}

/* ---- The 600 Club banner ---- */
.clubBanner {
  position: absolute;
  width: max-content; /* an absolute box at left: 50% would otherwise shrink to half the screen */
  top: 28%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transform: translateX(-50%);
  animation: clubPop 4.2s ease-out both;
}

.clubPlate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 2rem;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 1rem;
  background: var(--themeColor);
  box-shadow: 0 0 2rem var(--themeColor), 0 0.5rem 1.5rem rgba(0, 0, 0, 0.6);
}

.clubNumber {
  font-size: 4.5rem;
  font-weight: bold;
  line-height: 1;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
}

.clubWord {
  font-size: 1.75rem;
  font-weight: bold;
  letter-spacing: 0.35em;
  text-transform: uppercase;
}

.clubShine {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 30%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  animation: clubShine 1.4s ease-in-out 0.6s 2 both; /* a slow sweep: twice in 2.8 s */
}

.clubCoin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 3px solid #b8860b;
  border-radius: 50%;
  background: #ffd740;
  color: #7a5200;
  font-size: 1.75rem;
  font-weight: bold;
  animation: coinSpin 1.6s linear infinite; /* one turn per 1.6 s */
}

.coinRight {
  animation-delay: -0.8s;
}

@keyframes clubPop {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.2) rotate(-8deg);
  }
  10% {
    opacity: 1;
    transform: translateX(-50%) scale(1.12) rotate(2deg);
  }
  16%,
  86% {
    opacity: 1;
    transform: translateX(-50%) scale(1) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(1.1);
  }
}

@keyframes clubShine {
  from {
    left: -40%;
  }
  to {
    left: 120%;
  }
}

@keyframes coinSpin {
  to {
    transform: rotateY(360deg);
  }
}

/* ---- Jackpot ---- */
.jackpot {
  position: absolute;
  width: max-content;
  top: 26%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  transform: translateX(-50%);
  animation: jackpotLife 4.6s ease-out both;
}

.reels {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 3px solid var(--themeColor);
  border-radius: 1rem;
  background: var(--backgroundBlack);
  box-shadow: 0 0 1.5rem var(--themeColor);
}

.reel {
  width: 4.5rem;
  height: 5.5rem;
  overflow: hidden;
  border-radius: 0.5rem;
  background: #f5f5f5;
}

.reelStrip {
  display: flex;
  flex-direction: column;
  /* the last symbol of every strip is "$": the strips stop on three dollar signs */
  animation: reelSpin var(--reelSeconds) cubic-bezier(0.25, 0.8, 0.35, 1) both;
}

.reelStrip span {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 5.5rem;
  color: #1a1a1a;
  font-size: 3.5rem;
  font-weight: bold;
}

.reelStop1 {
  --reelSeconds: 1.7s;
}

.reelStop2 {
  --reelSeconds: 2.05s;
}

.reelStop3 {
  --reelSeconds: 2.4s;
}

.jackpotWord {
  color: #ffd740;
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.5), 0 0 1rem rgba(255, 215, 64, 0.7);
  animation: jackpotWord 1s ease-in-out 2.5s infinite alternate both; /* two swells per second at most */
  opacity: 0;
}

@keyframes reelSpin {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(-11 * 5.5rem));
  }
}

@keyframes jackpotWord {
  from {
    opacity: 1;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.12);
  }
}

@keyframes jackpotLife {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-2rem);
  }
  8%,
  88% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
  }
}

/* ---- Provider GIF (swaying in the middle, with its attribution) ---- */
.celebrationGif {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  transform: translate(-50%, -50%);
}

.gifImage {
  width: min(55vw, 13rem);
  max-height: 32vh;
  object-fit: contain;
  border-radius: 0.75rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.55);
  transform-origin: 50% 100%;
  animation: gifSway 0.8s ease-in-out infinite alternate; /* a sway every 0.8 s */
}

.gifAttribution {
  padding: 0.1rem 0.5rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

@keyframes gifSway {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(4deg);
  }
}

/* ---- Custom celebration picture ---- */
.customImage {
  position: absolute;
  bottom: 12%;
  left: 50%;
  width: min(70vw, 18rem);
  max-height: 45vh;
  object-fit: contain;
  transform-origin: 50% 100%;
  animation: customDance 0.6s ease-in-out infinite alternate; /* a sway every 0.6 s */
}

@keyframes customDance {
  from {
    transform: translateX(-50%) rotate(-9deg) translateY(0);
  }
  to {
    transform: translateX(-50%) rotate(9deg) translateY(-1.5rem);
  }
}
</style>
