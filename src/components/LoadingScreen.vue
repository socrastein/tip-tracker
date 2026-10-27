<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";

defineProps({});

const someData = ref(null);

const someComputed = computed(() => {});

onMounted(() => {});
</script>

<template>
  <div class="screenContainer">
    <h1 class="slowRotation">💲</h1>
  </div>
</template>

<style scoped>
.screenContainer {
  position: absolute;
  top: 0;

  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 30%;

  height: 100dvh;
  width: 100%;
}

.slowRotation {
  display: inline-block;
  animation: slow-rotate 5s linear infinite;
  font-size: 8rem;
}

@keyframes slow-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
