<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";
import { RouterView } from "vue-router";

import NavBar from "./NavBar.vue";
import SiteFooter from "./SiteFooter.vue";

// Define your props
defineProps({
  // Add your props here
});

// Define your component's data
const someData = ref(null); // Example data

// Define your methods
function someMethod() {
  // Add your method logic here
}

// Define your computed properties
const someComputed = computed(() => {
  // Add your computed logic here
});

// Lifecycle hook
onMounted(() => {
  // Add your mounted logic here
});
</script>

<template>
  <div class="mainDiv">
    <NavBar />
    <RouterView />
    <SiteFooter />
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.className {
}
</style>
