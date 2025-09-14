<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";
</script>

<template>
  <div class="mainContainer" id="mainContainer">Stats</div>
</template>

<style scoped>
.mainContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(90%, 24rem);
  margin: auto;

  transition: filter 0.3s ease;
}
</style>
