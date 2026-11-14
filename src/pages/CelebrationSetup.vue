<script setup lang="ts">
/**
 * Quiet setup screen for the custom celebration: a sound file and a picture
 * or GIF are chosen from this device, with the start and length of the clip.
 * Everything is kept in this browser's IndexedDB only (never uploaded, never
 * in the backup). "Test" plays the chosen clip's sound alone, because the
 * start time cannot be set by ear without hearing it.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";

import { unlockAudioContext } from "../scripts/CelebrationSounds";
import { decodeSound, playClip } from "../scripts/CustomCelebrationAudio";
import type { CustomCelebration } from "../scripts/CustomCelebrationStore";
import {
  DEFAULT_LENGTH_SECONDS,
  clearCustomCelebration,
  loadCustomCelebration,
  sanitizeClipTimes,
  saveCustomCelebration,
} from "../scripts/CustomCelebrationStore";
import {
  prepareCustomCelebration,
  releasePrepared,
} from "../scripts/CustomCelebrationRuntime";

const soundFile = ref<Blob | null>(null);
const soundName = ref("");
const imageFile = ref<Blob | null>(null);
const imageName = ref("");
const startSeconds = ref(0);
const lengthSeconds = ref(DEFAULT_LENGTH_SECONDS);
const status = ref("");

let decodedSound: AudioBuffer | null = null;
let stopTest: (() => void) | null = null;

/** Fill the form from what is already saved on this device. */
async function showSavedCelebration(): Promise<void> {
  try {
    const saved = await loadCustomCelebration();
    if (saved === null) return;
    soundFile.value = saved.sound;
    soundName.value = saved.soundName;
    imageFile.value = saved.image;
    imageName.value = saved.imageName;
    startSeconds.value = saved.startSeconds;
    lengthSeconds.value = saved.lengthSeconds;
    decodedSound = await decodeSound(saved.sound);
  } catch (error) {
    status.value = "Could not read the saved celebration on this device.";
    console.warn("[Celebration] Could not load setup:", error);
  }
}

/** The file chosen in an input, if any. */
function chosenFile(event: Event): File | null {
  return (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function onSoundChosen(event: Event): Promise<void> {
  const file = chosenFile(event);
  if (file === null) return;
  try {
    decodedSound = await decodeSound(file);
    soundFile.value = file;
    soundName.value = file.name;
    status.value = "";
  } catch {
    status.value = "That file could not be read as sound.";
  }
}

function onImageChosen(event: Event): void {
  const file = chosenFile(event);
  if (file === null) return;
  imageFile.value = file;
  imageName.value = file.name;
}

/** Play only the sound, from the chosen start for the chosen length. */
function testSound(): void {
  stopTest?.();
  if (decodedSound === null) {
    status.value = "Choose a sound file first.";
    return;
  }
  const clip = sanitizeClipTimes(startSeconds.value, lengthSeconds.value);
  const context = unlockAudioContext();
  stopTest = playClip(context, decodedSound, clip);
}

/** Everything on the form, ready to store. */
function celebrationFromForm(sound: Blob): CustomCelebration {
  return {
    sound,
    soundName: soundName.value,
    image: imageFile.value,
    imageName: imageName.value,
    ...sanitizeClipTimes(startSeconds.value, lengthSeconds.value),
  };
}

async function save(): Promise<void> {
  if (soundFile.value === null) {
    status.value = "Choose a sound file first.";
    return;
  }
  try {
    await saveCustomCelebration(celebrationFromForm(soundFile.value));
    await prepareCustomCelebration(); // joins the rotation straight away
    status.value = "Saved on this device.";
  } catch (error) {
    status.value = "Could not save on this device.";
    console.warn("[Celebration] Could not save setup:", error);
  }
}

async function remove(): Promise<void> {
  try {
    await clearCustomCelebration();
    releasePrepared();
    soundFile.value = null;
    soundName.value = "";
    imageFile.value = null;
    imageName.value = "";
    decodedSound = null;
    status.value = "Removed.";
  } catch (error) {
    status.value = "Could not remove it.";
    console.warn("[Celebration] Could not remove setup:", error);
  }
}

onMounted(showSavedCelebration);
onBeforeUnmount(() => stopTest?.());
</script>

<template>
  <div class="mainContainer" id="mainContainer">
    <h2>Custom Celebration</h2>
    <p class="hint">
      Chosen on this device and kept only here. It joins the big tip celebrations with falling dollar bills.
    </p>

    <label for="celebrationSound">Sound File</label>
    <input id="celebrationSound" type="file" accept="audio/*" @change="onSoundChosen" />
    <p v-if="soundName" class="chosen">{{ soundName }}</p>

    <label for="celebrationImage">Picture or GIF</label>
    <input id="celebrationImage" type="file" accept="image/*" @change="onImageChosen" />
    <p v-if="imageName" class="chosen">{{ imageName }}</p>

    <div class="timesRow">
      <div class="timeField">
        <label for="celebrationStart">Start (Seconds)</label>
        <input id="celebrationStart" v-model.number="startSeconds" type="number" min="0" step="0.1" inputmode="decimal" />
      </div>
      <div class="timeField">
        <label for="celebrationLength">Length (Seconds)</label>
        <input id="celebrationLength" v-model.number="lengthSeconds" type="number" min="0.5" step="0.1" inputmode="decimal" />
      </div>
    </div>

    <div class="buttonRow">
      <button type="button" @click="testSound">Test</button>
      <button type="button" class="primary" @click="save">Save</button>
      <button type="button" class="danger" @click="remove">Remove</button>
    </div>
    <p v-if="status" class="status" role="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.mainContainer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(90%, 24rem);
  margin: 2rem auto;
}

.hint,
.chosen {
  font-size: 0.8rem;
  opacity: 0.7;
}

label {
  font-weight: bold;
}

input {
  padding: 0.4rem;
  border: solid var(--themeColor) 1px;
  border-radius: 0.5rem;
  background-color: var(--backgroundDark);
}

.timesRow {
  display: flex;
  gap: 1rem;
}

.timeField input {
  width: 100%;
  min-width: 0;
}

.timeField {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
}

.buttonRow {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

button {
  flex: 1;
  height: 2.5rem;
  border-radius: 0.5rem;
  background-color: var(--backgroundLight);
  border: solid 1px var(--themeColor);
}

button.primary {
  background-color: var(--themeColor);
  font-weight: bold;
}

button.danger {
  border-color: darkred;
}
</style>
