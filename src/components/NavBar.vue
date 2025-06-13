<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";

import NavBarButton from "./NavBarButton.vue";

import menuIcon from "@/assets/icons/menu.svg";
import closeIcon from "@/assets/icons/x.svg";

// Define your props
defineProps({
  // Add your props here
});

// Define your component's data
const isIconA = ref(true);
const iconA = ref(menuIcon); // Example icon name
const iconB = ref(closeIcon); // Example icon name

// Define your methods

function toggleIcon() {
  isIconA.value = !isIconA.value;
}

// Lifecycle hook
onMounted(() => {
  // Add your mounted logic here
});
</script>

<template>
  <div class="navBar">
    <h2>Tip Tracker</h2>
    <NavBarButton
      :icon="isIconA ? iconA : iconB"
      @click="
        () => {
          isIconA ? $router.push('/menu') : $router.push('/');
          toggleIcon();
        }
      "
    />
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.navBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 10px 3%;
  background-color: var(--backgroundDark);
}
</style>
