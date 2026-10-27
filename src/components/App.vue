<script setup>
import { RouterView } from "vue-router";
import { ref, onMounted } from "vue";

import NavBar from "./NavBar.vue";
import LoadingScreen from "./LoadingScreen.vue";

import background from "../assets/photos/beachSunset.jpg";

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
