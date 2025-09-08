<script setup>
import { ref } from "vue";
import { OnClickOutside } from "@vueuse/components";
import NavBarMenuButton from "./NavBarMenuButton.vue";
import NavBarMenu from "./NavBarMenu.vue";

// Define your component's data
const isMenuOpen = ref(false);

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
  toggleBackgroundBlur();
}

// Close menu when clicking outside
function close() {
  isMenuOpen.value = false;
  removeBackgroundBlur();
}

function toggleBackgroundBlur() {
  const mainContainer = document.getElementById("mainContainer");
  mainContainer.classList.toggle("blurEffectOnMenu");
}

function removeBackgroundBlur() {
  const mainContainer = document.getElementById("mainContainer");
  // Add null check
  if (mainContainer) {
    mainContainer.classList.remove("blurEffectOnMenu");
  }
}
</script>

<template>
  <div class="navBar">
    <h2 class="appTitle" @click="() => scrollToTop()">💲 Tip Tracker</h2>

    <OnClickOutside @trigger="close">
      <NavBarMenuButton :isOpen="isMenuOpen" @toggle="toggleMenu" />
      <NavBarMenu v-if="isMenuOpen" />
    </OnClickOutside>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.navBar {
  position: fixed;
  top: 0;
  width: 100%;
  margin: auto;
  height: 60px;
  z-index: 50;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 3%;
  background-color: var(--backgroundBlack);
}

.appTitle:hover {
  cursor: pointer;
}
</style>
