<script setup>
import ColorThemeMenu from "../components/ColorThemeMenu.vue";
</script>

<template>
  <transition name="fade-slide" appear>
    <div class="menuContainer">
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
</style>
