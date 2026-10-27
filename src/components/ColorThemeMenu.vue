<script setup>
// "Color Theme" button in the nav menu: opens a list of accent colors to pick from.
// The list is a radio group, so it works with a keyboard (arrow keys) and screen readers,
// and each color shows its name as well as its swatch.
import { ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { ACCENTS, applyAccent, loadAccentId, saveAccentId } from "../scripts/ColorTheme";

const isOpen = ref(false);
const menuRef = ref(null);
const toggleButtonRef = ref(null);

// The saved choice (main.js already applied it at startup)
const selectedId = ref(loadAccentId());

// Picking a color applies and saves it immediately
watch(selectedId, (id) => {
  applyAccent(id);
  saveAccentId(id);
});

// Close when clicking outside, or with Escape (returning focus to the button)
onClickOutside(menuRef, () => (isOpen.value = false));
function closeWithKeyboard() {
  isOpen.value = false;
  toggleButtonRef.value?.focus();
}

/** Each swatch shows the color for whichever mode is showing. */
function swatchStyle(option) {
  return { "--swatch": `light-dark(${option.light}, ${option.dark})` };
}
</script>

<template>
  <div class="relative" ref="menuRef" @keydown.esc="closeWithKeyboard">
    <button
      ref="toggleButtonRef"
      type="button"
      class="colorButton"
      :aria-expanded="isOpen"
      aria-controls="accentChoices"
      @click="isOpen = !isOpen"
    >
      Color Theme
    </button>

    <fieldset v-if="isOpen" id="accentChoices" class="accentChoices">
      <legend class="srOnly">Accent color</legend>
      <label
        v-for="option in ACCENTS"
        :key="option.id"
        class="accentOption"
        :class="{ isSelected: option.id === selectedId }"
      >
        <input v-model="selectedId" type="radio" name="accentColor" class="srOnly" :value="option.id" />
        <span>{{ option.label }}</span>
        <span class="swatch" :style="swatchStyle(option)" aria-hidden="true"></span>
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}

.colorButton {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 8rem;
  height: 2rem;
  padding: 0;
  border-radius: 0.5rem;
  background-color: var(--accentFull);
  color: var(--onAccent);
  font-weight: bold;
}

/* The open list: a small floating panel under the button */
.accentChoices {
  position: absolute;
  top: 110%;
  right: 0;
  z-index: 50;
  display: grid;
  gap: 2px;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0.25rem;
  border: 1px solid var(--borderMuted);
  border-radius: 0.5rem;
  background: var(--surfacePanel);
  box-shadow: var(--shadowFloat);
}

/* One row: name on the left, swatch on the right */
.accentOption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.accentOption:hover {
  background-color: color-mix(in srgb, var(--textFull) 8%, transparent);
}

/* The chosen color: bold and tinted, so it doesn't rely on the swatch alone */
.accentOption.isSelected {
  background-color: color-mix(in srgb, var(--textFull) 14%, transparent);
  font-weight: bold;
}

/* The radio input is visually hidden, so show its keyboard focus on the row */
.accentOption:has(input:focus-visible) {
  outline: 2px solid var(--accentFull);
  outline-offset: 1px;
}

.swatch {
  flex-shrink: 0;
  width: 2.5rem;
  height: 1rem;
  border: 1px solid var(--borderSubtle);
  border-radius: 0.25rem;
  background-color: var(--swatch);
}
</style>
