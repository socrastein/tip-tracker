<script setup>
import { ref, nextTick, watch } from "vue";

import state from "../scripts/EventBus";
import addIcon from "@/assets/icons/plus.svg";
import AddTipForm from "./AddTipForm.vue";

const showForm = ref(false);
const autoFocus = ref(false);

const onFormVisible = async () => {
  await nextTick();
  autoFocus.value = true;
};

// Mirror eventBus into local showForm
watch(
  () => state.showAddTipForm,
  (newVal) => {
    autoFocus.value = false;
    showForm.value = newVal;
  }
);
</script>

<template>
  <div class="addTipContainer">
    <div
      class="iconContainer"
      v-if="!showForm"
      @click="
        () => {
          autoFocus = false;
          showForm = true;
        }
      "
    >
      <img class="icon" :src="addIcon" />
    </div>
    <transition
      name="slide-down"
      @after-enter="onFormVisible"
      @after-leave="state.clear()"
      appear
    >
      <AddTipForm
        v-show="showForm"
        @close="showForm = false"
        :autoFocus="autoFocus"
        :isBeingEdited="state.isBeingEdited"
        :targetTip="state.tipObject"
      />
    </transition>
  </div>
</template>

<style scoped>
.addTipContainer {
  position: absolute;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  width: 100%;
}

.iconContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4rem;
  width: 10rem;

  background-color: var(--backgroundDark);
  border-radius: 0.75rem;
  border-top: 1px solid var(--themeColor);
  border-right: 2px solid var(--themeColor);
  border-left: 2px solid var(--themeColor);
  border-bottom: 8px solid var(--themeColor);
}

.iconContainer:hover {
  cursor: pointer;
}

.icon {
  height: 100%;
  filter: invert(100%);
}
</style>
