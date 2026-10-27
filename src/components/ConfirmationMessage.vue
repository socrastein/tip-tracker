<script setup>
import { ref, defineEmits } from "vue";

const props = defineProps({
  message: String,
});

function close() {
  emit("close");
}

const emit = defineEmits(["close", "confirm"]);
const show = ref(true);
</script>

<template>
  <transition name="fade-slide">
    <div class="confirmContainer">
      <p class="confirmMessage">{{ message }}</p>
      <div class="buttonContainer">
        <button class="cancel" @click="close">CANCEL</button>
        <button
          class="confirm"
          @click="
            () => {
              $emit('confirm');
              close();
            }
          "
        >
          DELETE
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Add your component-specific styles here */
.confirmContainer {
  z-index: 1500;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;

  width: 100%;
  padding: 1rem 1rem;

  border: 2px solid var(--borderFull);
  border-radius: 0.5rem;

  text-align: center;
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--textFull);
  background-color: var(--surfacePanel);
  box-shadow: var(--shadowFloat);
}

.confirmMessage {
  width: 90%;
}

.buttonContainer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

button {
  background-color: var(--surfacePanel);
  border: none;
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
  height: 2.25rem;

  width: 6rem;
  cursor: pointer;
}

/* Neutral, set apart by tone (the kit's secondary-button pattern) */
.cancel {
  background-color: color-mix(in srgb, var(--textFull) 15%, var(--surfacePanel));
  font-weight: bold;
}

.confirm {
  background-color: var(--danger);
  color: var(--onDanger);
}
</style>
