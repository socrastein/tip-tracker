<script setup>
const props = defineProps(["text", "icon"]);
</script>

<template>
  <button class="navBarButton">
    {{ text }}<img v-if="icon" :src="icon" class="navBarButtonIcon" />
  </button>
</template>

<style scoped>
.navBarButton {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 3rem;
  height: 2rem;
  padding: 0;

  border-radius: 0.5rem;
  border: none;
  background-color: var(--themeColor);
}

.navBarButton:hover {
  cursor: pointer;
}

.navBarButtonIcon {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
}
</style>
