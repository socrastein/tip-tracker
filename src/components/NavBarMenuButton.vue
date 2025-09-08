<script setup>
const props = defineProps({
  isOpen: Boolean, // controlled by parent
});

const emit = defineEmits(["toggle"]); // parent handles the toggle code

</script>

<template>
  <button class="navBarMenuButton" @click="() => {
    $emit('toggle')
  }">
    <div class="hamburger" :class="{ open: isOpen }">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </button>
</template>

<style scoped>
.navBarMenuButton {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;

  font-size: 1.75rem;
  font-weight: bold;

  border-radius: 0.5rem;
  background-color: transparent;
  cursor: pointer;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 24px;
  height: 18px;
}

.hamburger span {
  display: block;
  height: 3px;
  width: 100%;
  background: var(--themeColor);
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s ease;
}

/* Animate change to X */

.hamburger.open span:nth-child(1) {
  transform: translateY(7.5px) rotate(45deg);
}

.hamburger.open span:nth-child(2) {
  transition: opacity 0.25s ease 0.05s;
  opacity: 0;
}

.hamburger.open span:nth-child(3) {
  transform: translateY(-7.5px) rotate(-45deg);
}
</style>
