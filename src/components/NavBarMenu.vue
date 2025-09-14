<script setup>
import { RouterLink } from "vue-router";
import ColorThemeMenu from "../components/ColorThemeMenu.vue";

const emit = defineEmits(["close"]);
</script>

<template>
  <transition name="fade-slide" appear>
    <div class="menuContainer">
      <router-link class="menuItem" to="/" @click="() => $emit('close')"
        >Home</router-link
      >
      <router-link class="menuItem" to="/stats" @click="() => $emit('close')"
        >Stats Page</router-link
      >
      <ColorThemeMenu />
    </div>
  </transition>
</template>

<style scoped>
/* Add your component-specific styles here */
.menuContainer {
  position: fixed;
  right: 0;
  top: 60px;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-left: auto;
  align-items: flex-end;

  width: min(70%, 16rem);
  padding: 1rem;
  border: solid 1px var(--themeColor);
  border-radius: 0.5rem;

  background: var(--backgroundDark);

  z-index: 1000;
}

.menuItem {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 8rem;
  height: 2rem;
  padding: 0;
  border: solid 1px var(--themeColor);
  border-radius: 0.5rem;
  background-color: var(--backgroundDark);
  font-weight: bold;
}
</style>
