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
    // Hand the photo to CSS (style.css paints it under a veil that follows the theme)
    document.body.style.setProperty("--bgPhoto", `url('${background}')`);
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
