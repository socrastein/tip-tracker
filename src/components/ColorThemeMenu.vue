<script setup>
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";

const themeColors = [
  {
    text: "Green",
    color: "#378e3c",
  },
  {
    text: "Blue",
    color: "#646cff",
  },
  {
    text: "Purple",
    color: "#6c5a91",
  },
  {
    text: "Magenta",
    color: "#900090",
  },
  {
    text: "Pink",
    color: "#8f5173",
  },
  {
    text: "Orange",
    color: "#b7613f",
  },
  {
    text: "Yellow",
    color: "#c8ac69",
  },

];

const isOpen = ref(false);
const menuRef = ref(null);

// Load saved theme (or default to first option)
const currentTheme =
  ref(localStorage.getItem("tipTracker(themeColor)")) || themeColors[0];

// Close menu when clicking outside
onClickOutside(menuRef, () => (isOpen.value = false));

function saveThemeColorToLocalStorage(color) {
  localStorage.setItem("tipTracker(themeColor)", color);
}

function changeColor(color) {
  document.documentElement.style.setProperty("--themeColor", color);
  currentTheme.value = color;
  saveThemeColorToLocalStorage(color);
}
</script>

<template>
  <div class="relative" ref="menuRef">
    <button @click="isOpen = !isOpen" class="colorButton">Color Theme</button>

    <ul v-if="isOpen" class="dropdownMenu">
      <li
        v-for="(option, index) in themeColors"
        :key="index"
        @click="
          () => {
            changeColor(option.color);
          }
        "
        :class="{ highlight: option.color === currentTheme }"
      >
        <div
          class="colorPreview"
          :style="{ backgroundColor: option.color }"
        ></div>
      </li>
    </ul>
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
  background-color: var(--themeColor);
  font-weight: bold;
}

.dropdownMenu {
  position: absolute;
  top: 110%;
  right: 0;
  background: var(--backgroundDark);
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 5px 0;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  width: 100%;
}
.dropdownMenu li {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 8px 12px;
  cursor: pointer;
  z-index: 50;
}

.highlight {
  background-image: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0)
  );
}

.colorPreview {
  height: 1.5rem;
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid #00000040;
}
</style>
