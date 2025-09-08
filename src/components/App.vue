<script setup>
import { RouterView } from "vue-router";
import NavBar from "./NavBar.vue";
</script>

<template>
  <div class="mainDiv">
    <NavBar />
    <RouterView />
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.mainDiv {
  display: flex;
  flex-direction: column;
}
</style>
