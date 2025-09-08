<script setup>
import { ref, defineEmits } from "vue";

const props = defineProps({
  message: String,
  duration: { type: Number, default: 3000 },
});

const emit = defineEmits(["close"]);
const show = ref(true);

if (props.duration > 0) {
  setTimeout(() => {
    show.value = false;
    emit("close");
  }, props.duration);
}
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" class="errorMessage">
        {{ message }}
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
/* Add your component-specific styles here */
.errorMessage {
  z-index: 2000;
  position: fixed;

  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  width: min(80%, 24rem);
  padding: 1rem 1rem;

  border: 2px solid white;
  border-radius: 0.5rem;
  
  text-align: center;
  font-weight: bold;
  font-size: 1.1rem;
  color: white;
  background-color: darkred;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
</style>
