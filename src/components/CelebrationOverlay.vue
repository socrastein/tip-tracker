<script setup lang="ts">
/**
 * The celebration on screen, drawn above the whole app. While it plays it
 * catches every tap, so nothing underneath (the + button, a tip card) is
 * pressed by accident; the tip is saved before a celebration starts, so
 * nothing in the add-tip flow needs a tap meanwhile. A tap does NOT end it
 * (too easy to do by accident): the first tap shows a round X button at the
 * bottom centre, and only that button ends the celebration early. Escape also
 * closes it, and the first Tab shows and focuses the button for keyboard users.
 * Otherwise it runs its full length and ends on its own, taking the button
 * with it. Which celebration shows comes from celebrationState;
 * BigTipCelebrator starts it after a big tip is saved.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

import { celebrationState, endCelebration } from "../scripts/CelebrationState";
import { startParticleShow } from "../scripts/CelebrationParticles";
import type { ParticleShow } from "../scripts/CelebrationParticles";
import { BUILT_IN_CELEBRATIONS } from "../scripts/CelebrationRotation";
import { BUILT_IN_CELEBRATION_MS, BUILT_IN_CELEBRATION_SECONDS, JACKPOT_REEL_STOP_SECONDS } from "../scripts/CelebrationTimings";
import type { CelebrationName } from "../scripts/CelebrationRotation";

const ACCENT_FALLBACK = "#378e3c";
const DEFAULT_DURATION_MS = 4500; // a celebration that brings no length of its own
// How long each built-in celebration stays on screen: all of them the same
// default length. The custom and pack celebrations bring their own length
// (the sound clip plus a moment).
const DURATION_MS: Record<(typeof BUILT_IN_CELEBRATIONS)[number], number> = {
  billsRain: BUILT_IN_CELEBRATION_MS,
  confetti: BUILT_IN_CELEBRATION_MS,
  fireworks: BUILT_IN_CELEBRATION_MS,
  club: BUILT_IN_CELEBRATION_MS,
  jackpot: BUILT_IN_CELEBRATION_MS,
};

// The timings the CSS animations use, from the same constants the particle
// shows and the sounds use, so everything lines up (see CelebrationTimings.ts).
const timingStyle = {
  "--celebrationSeconds": `${BUILT_IN_CELEBRATION_SECONDS}s`,
  "--reelStop1": `${JACKPOT_REEL_STOP_SECONDS[0]}s`,
  "--reelStop2": `${JACKPOT_REEL_STOP_SECONDS[1]}s`,
  "--reelStop3": `${JACKPOT_REEL_STOP_SECONDS[2]}s`,
};

// The banner is drawn with CSS only. Every other celebration (including
// custom and pack ones) has a canvas show: bills, confetti or fireworks. The
// jackpot has one too: bills that start falling when its reels land.
const CSS_ONLY_CELEBRATIONS: CelebrationName[] = ["club"];
const PARTICLE_SHOWS: Partial<Record<CelebrationName, ParticleShow>> = {
  billsRain: "billsRain",
  confetti: "confetti",
  fireworks: "fireworks",
  jackpot: "jackpotBills",
};

/** The canvas show a celebration runs, or undefined for the CSS-only ones. */
function particleShowFor(name: CelebrationName): ParticleShow | undefined {
  return CSS_ONLY_CELEBRATIONS.includes(name) ? undefined : (PARTICLE_SHOWS[name] ?? "billsRain");
}

// Symbols on each reel's strip, top to bottom. The last one, where a reel
// stops, is "$" so the three reels land on a jackpot.
const REEL_SYMBOLS = ["★", "7", "$", "♦", "7", "★", "$", "♦", "★", "7", "♦", "$"];

const canvas = ref<HTMLCanvasElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
// Shown by the first tap (or the first Tab); only this button ends the celebration early.
const isCloseButtonShown = ref(false);
const current = computed(() => celebrationState.current);
const pictureUrl = computed(() => current.value?.pictureUrl ?? null);

// Set when the GIF could not be drawn, which hides it and its attribution.
const gifFailed = ref(false);
// A GIF shows unless the owner's own picture is already taking its place.
const showGif = computed(
  () => Boolean(current.value?.gifUrl) && !pictureUrl.value && !gifFailed.value,
);

let stopParticles: (() => void) | null = null;
let endTimer: ReturnType<typeof setTimeout> | null = null;

/** The app's current accent colour (the user's chosen theme colour). */
function readAccentColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--themeColor").trim();
  return value || ACCENT_FALLBACK;
}

/** How long a celebration stays: its own length if it has one, else the built-in's. */
function durationFor(celebration: { name: CelebrationName; durationMs: number | null }): number {
  if (celebration.durationMs !== null) return celebration.durationMs;
  return celebration.name in DURATION_MS ? DURATION_MS[celebration.name as keyof typeof DURATION_MS] : DEFAULT_DURATION_MS;
}

/** Stop animations and timers, leaving nothing running. */
function cleanUp(): void {
  stopParticles?.();
  stopParticles = null;
  if (endTimer !== null) clearTimeout(endTimer);
  endTimer = null;
  window.removeEventListener("keydown", onKeydown);
}

/** The first tap anywhere on a celebration shows the close button; it never ends the celebration. */
function onTap(): void {
  isCloseButtonShown.value = true;
}

/** Escape closes the celebration; the first Tab shows the close button and moves focus to it. */
async function onKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key === "Escape") {
    endCelebration();
    return;
  }
  if (event.key !== "Tab") return;
  event.preventDefault();
  isCloseButtonShown.value = true;
  await nextTick();
  closeButton.value?.focus();
}

/** Start the visuals of a newly shown celebration. Failures only lose the animation. */
async function begin(celebration: { name: CelebrationName; durationMs: number | null }): Promise<void> {
  await nextTick(); // wait for the canvas to exist
  try {
    const show = particleShowFor(celebration.name);
    if (show && canvas.value) {
      stopParticles = startParticleShow(canvas.value, show, readAccentColor());
    }
  } catch (error) {
    console.warn("[Celebration] Animation failed:", error);
  }
  endTimer = setTimeout(endCelebration, durationFor(celebration));
  window.addEventListener("keydown", onKeydown);
}

watch(
  () => current.value?.id,
  () => {
    cleanUp();
    gifFailed.value = false;
    isCloseButtonShown.value = false;
    if (current.value) void begin(current.value);
  },
);

onBeforeUnmount(cleanUp);
</script>

<template>
  <div
    v-if="current"
    :key="current.id"
    class="celebration"
    :style="timingStyle"
    :data-celebration="current.name"
    @pointerdown="onTap"
  >
    <!-- The pictures and animation are decoration; only the close button is for assistive technology. -->
    <div class="celebrationArt" aria-hidden="true">
      <canvas v-if="particleShowFor(current.name)" ref="canvas" class="celebrationCanvas" />

      <div v-if="current.name === 'club'" class="clubBanner">
        <span class="clubEmoji">&#x1F60E;</span>
        <span class="clubCoin coinLeft">$</span>
        <div class="clubPlate">
          <span class="clubName">Ballin' Bean</span>
          <span class="clubWord">Club</span>
          <span class="clubShine" />
        </div>
        <span class="clubCoin coinRight">$</span>
      </div>

      <div v-else-if="current.name === 'jackpot'" class="jackpot">
        <div class="reels">
          <div v-for="reel in 3" :key="reel" class="reel">
            <div class="reelStrip" :class="`reelStop${reel}`">
              <span v-for="(symbol, index) in REEL_SYMBOLS" :key="index" :class="{ dollar: symbol === '$' }">{{ symbol }}</span>
            </div>
          </div>
        </div>
        <p class="jackpotWord">Jackpot!</p>
      </div>

      <img v-else-if="pictureUrl" :src="pictureUrl" class="customImage" alt="" />

      <!-- A provider GIF; GIPHY's terms require its attribution wherever one is shown. -->
      <div v-if="showGif" class="celebrationGif">
        <img :src="current.gifUrl!" class="gifImage" alt="" @error="gifFailed = true" />
        <p class="gifAttribution">Powered By GIPHY</p>
      </div>
    </div>

    <button v-if="isCloseButtonShown" ref="closeButton" type="button" class="celebrationClose" aria-label="Close Celebration" @click="endCelebration">X</button>
  </div>
</template>

<style scoped>
.celebration {
  position: fixed;
  inset: 0;
  z-index: 2000; /* above the nav bar (50), add-tip form (20) and menu (1000) */
  pointer-events: auto; /* catches every tap, so nothing underneath is pressed by accident */
  overflow: hidden;
  animation: celebrationIn 0.25s ease-out;
}

.celebrationArt {
  display: contents; /* no box of its own: the art is placed against the celebration, as before */
}

/* The round X that ends a celebration early: at least 44 x 44 pixels, above the phone's bottom safe area. */
.celebrationClose {
  position: absolute;
  bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  left: 50%;
  width: 3.5rem;
  height: 3.5rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
  transform: translateX(-50%);
  cursor: pointer;
}

.celebrationClose:focus-visible {
  outline: 3px solid var(--themeColor);
  outline-offset: 3px;
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

/* ---- The Ballin' Bean Club banner ---- */
.clubBanner {
  position: absolute;
  width: max-content; /* an absolute box at left: 50% would otherwise shrink to half the screen */
  top: 36%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transform: translateX(-50%);
  animation: clubPop var(--celebrationSeconds) ease-out both;
}

.clubPlate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 1rem;
  background: var(--themeColor);
  box-shadow: 0 0 2rem var(--themeColor), 0 0.5rem 1.5rem rgba(0, 0, 0, 0.6);
}

/* The big sunglasses face over the top of the plate: the first thing seen, dropping in with a bounce. */
.clubEmoji {
  position: absolute;
  bottom: calc(100% - 0.75rem); /* sits on the plate's top edge, so the name stays readable */
  left: 50%;
  z-index: 1;
  font-size: 7.5rem;
  line-height: 1;
  transform: translateX(-50%);
  animation: beanDrop 0.9s cubic-bezier(0.3, 1.6, 0.5, 1) both;
}

.clubName {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1.1;
  white-space: nowrap;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
}

.clubWord {
  font-size: 1.5rem;
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
  animation: clubShine 1.4s ease-in-out 0.9s 3 both; /* a slow sweep: three times, ending before the celebration does */
}

.clubCoin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #b8860b;
  border-radius: 50%;
  background: #ffd740;
  color: #7a5200;
  font-size: 1.5rem;
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
  8% {
    opacity: 1;
    transform: translateX(-50%) scale(1.12) rotate(2deg);
  }
  12%,
  90% {
    opacity: 1;
    transform: translateX(-50%) scale(1) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(1.1);
  }
}

@keyframes beanDrop {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-9rem) scale(0.6);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
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
  animation: jackpotLife var(--celebrationSeconds) ease-out both;
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

/* The dollar signs the reels stop on are the bills' green, clearly green on the white reel face. */
.reelStrip span.dollar {
  color: #2e7d32;
}

/* the reels stop one after another, at the times the sound's dings use */
.reelStop1 {
  --reelSeconds: var(--reelStop1);
}

.reelStop2 {
  --reelSeconds: var(--reelStop2);
}

.reelStop3 {
  --reelSeconds: var(--reelStop3);
}

.jackpotWord {
  color: #ffd740;
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.5), 0 0 1rem rgba(255, 215, 64, 0.7);
  animation: jackpotWord 1s ease-in-out var(--reelStop3) infinite alternate both; /* starts when the last reel lands; two swells per second at most */
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
