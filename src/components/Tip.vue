<script setup>
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import state from "../scripts/EventBus";

import editIcon from "../assets/icons/edit.svg";

import Date from "./Date.vue";
import { TipStore } from "../scripts/TipStore";

const showEdit = ref(false);
const outsideTarget = ref(null);

onClickOutside(outsideTarget, () => {
  showEdit.value = false;
});

function handleRighClick() {
  showEdit.value = true;
}

function handleEditClick() {
  const tipObj = TipStore.checkForDuplicateTip(props.date, props.shift);

  state.tipObject = tipObj;
  state.isBeingEdited = true;
  state.showAddTipForm = true;

  showEdit.value = false;
}

// Define your props
const props = defineProps({
  amount: Number,
  date: String,
  type: String,
  shift: String,
});
</script>

<template>
  <div
    ref="outsideTarget"
    class="tip"
    @click.right="handleRighClick"
    @contextmenu.prevent="handleRighClick"
  >
    <div class="infoContainer" :class="{ shrunk: showEdit }">
      <div class="tipHeader">
        <Date :date="props.date" />
      </div>
      <p class="amount">${{ amount }}</p>
      <div class="typeContainer">
        <p>{{ type }}</p>
        <p>{{ shift }}</p>
      </div>
    </div>
    <div class="editButton" v-if="showEdit" @click="handleEditClick">
      <img class="editIcon" :src="editIcon" />
    </div>
  </div>
</template>

<style scoped>
.tip {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: min(100%, 20rem);
  height: 8rem;
}

.infoContainer {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;

  padding: 0.5rem 1rem;
  height: 100%;
  width: 100%;
  border-left: 1px solid var(--themeColor);
  border-bottom: 2px solid var(--themeColor);
  border-radius: 1rem;
  background-color: var(--backgroundDark);

  transition: width 0.3s linear;
}

.infoContainer.shrunk {
  /* match this to editButton width */
  width: calc(100% - 4rem);
  border-radius: 1rem 0 0 1rem;
}

.tipHeader {
  display: flex;
  justify-content: space-between;
  align-content: flex-end;
}

.amount {
  color: var(--themeColor);
  filter: brightness(110%);
  font-weight: bold;
  font-size: 1.75rem;
}

.dateContainer {
  display: flex;
  gap: 1rem;
}

.day {
  font-weight: bold;
}

.typeContainer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.editButton {
  display: flex;
  flex-shrink: 6;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 4rem;
  border-radius: 0 0.5rem 0.5rem 0;
  background-color: var(--themeColor);

  cursor: pointer;
}

.editIcon {
  filter: invert(100%);
  height: 2rem;
  width: 2rem;
}
</style>
