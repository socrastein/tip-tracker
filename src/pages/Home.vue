<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";
import { TipStorage } from "../scripts/TipStorage";
import Tip from "../components/Tip.vue";
import AddTip from "../components/AddTip.vue";

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

const typeArray = ["Banquet", "Card"];
</script>

<template>
  <div class="mainContainer">
    <div class="addTipContainer">
      <AddTip />
    </div>
    <div class="tipsContainer">
      <Tip :amount="50" date="2025-06-01" type="Banquet" />
      <Tip :amount="125" date="2025-06-02" type="Floor" />
      <Tip :amount="250" date="2025-06-03" type="Banquet" />
      <Tip :amount="450" date="2025-06-04" type="Banquet" />
    </div>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.tipsContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
</style>
