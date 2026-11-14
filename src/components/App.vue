<script setup>
import { RouterView } from "vue-router";
import { ref, onMounted, defineAsyncComponent } from "vue";

import NavBar from "./NavBar.vue";
import LoadingScreen from "./LoadingScreen.vue";
import CelebrationOverlay from "./CelebrationOverlay.vue";

import background from "../assets/photos/beachSunset.jpg";

// Preview tools exist only on the local dev server: in a production build
// import.meta.env.DEV is the constant false, so this import and the panel
// are removed from the bundle (tests/modules/CelebrationDevBuild.test.js checks).
const CelebrationDevPanel = import.meta.env.DEV
  ? defineAsyncComponent(() => import("./CelebrationDevPanel.vue"))
  : null;

// Load the background image before displaying app so everything paints at once
const isReady = ref(false);
onMounted(() => {
  // Create Image object to preload
  const img = new Image();
  img.src = background;
  img.onload = () => {
    // Set body background with dark overlay
    document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),url('${background}')`;
    isReady.value = true;
  };
});
</script>

<template>
  <div v-if="isReady" class="mainDiv">
    <NavBar />
    <RouterView />
    <CelebrationOverlay />
    <component :is="CelebrationDevPanel" v-if="CelebrationDevPanel" />
  </div>
  <LoadingScreen v-else />
</template>

<style scoped>
/* Add your component-specific styles here */
.mainDiv {
  display: flex;
  flex-direction: column;
}
</style>
