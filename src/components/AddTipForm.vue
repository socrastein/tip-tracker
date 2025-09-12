<script setup>
import { ref, watch, reactive, nextTick } from "vue";
import { useFocus } from "@vueuse/core";

import { Tip } from "../scripts/ClassTip";
import { getYearMonthDayString } from "../scripts/Dates";
import { TipStore } from "../scripts/TipStore";

import ErrorMessage from "./ErrorMessage.vue";
import ConfirmationMessage from "./ConfirmationMessage.vue";
import closeIcon from "../assets/icons/close.svg";

const props = defineProps({
  autoFocus: { type: Boolean, default: false },
  isBeingEdited: Boolean,
  targetTip: Object,
});

const emit = defineEmits(["close"]);

const todayDateString = getYearMonthDayString();

const inputDate = ref(todayDateString);
const inputAmount = ref(null);
const inputType = ref("Banquet");
const inputShift = ref("Dinner");

const showError = ref(false);
const errorMessage = ref("");

const showConfirm = ref(false);
const confirmMessage = "Are you sure you want to delete this tip?";

const showButtons = ref(true);

// Focus on the amount input when form first loads
const focusTarget = ref(null);
const { focused } = useFocus(focusTarget, { initialValue: false });

watch(() => props.autoFocus, async (newValue) => {
  if (newValue) {
    await nextTick()
    focused.value = true
  }
})

function isFormInputValid(targetTip) {
  // Reset error state
  showError.value = false;
  errorMessage.value = "";

  if (typeof inputAmount.value !== "number" || inputAmount.value < 0) {
    errorMessage.value = "Amount must be a number 0 or greater";
    console.log(errorMessage.value);
    showError.value = true;
    return false;
  }

  const duplicate = TipStore.checkForDuplicateTip(
    inputDate.value,
    inputShift.value
  );

  // If new tip, any duplicate found will trigger error
  // If editing, allow the same tip (duplicate === targetTip)
  if (duplicate && duplicate !== targetTip) {
    errorMessage.value = "There is already a tip for this date and shift";
    console.log(errorMessage.value);
    showError.value = true;
    return false;
  }

  return true;
}

function confirmNewTip() {
  if (!isFormInputValid()) {
    return;
  }

  try {
    const newTip = reactive(
      new Tip(
        inputAmount.value,
        inputDate.value,
        inputType.value,
        inputShift.value
      )
    );
    TipStore.addTip(newTip);
    emit("close");
  } catch (error) {
    console.log(error);
    errorMessage.value = error.message;
    showError.value = true;
  }
}

function confirmEditTip() {
  if (!isFormInputValid(props.targetTip)) {
    return;
  }

  try {
    TipStore.editTip(props.targetTip, {
      amount: inputAmount.value,
      date: inputDate.value,
      type: inputType.value,
      shift: inputShift.value,
    });
    emit("close");
  } catch (error) {
    console.log(error);
    errorMessage.value = error.message;
    showError.value = true;
  }
}

function deleteTip() {
  showConfirm.value = true;
  showButtons.value = false;
}

// Keep local refs in sync with props for when editing
watch(
  () => props.targetTip,
  (newTip) => {
    if (props.isBeingEdited && newTip) {
      inputAmount.value = newTip.amount;
      inputDate.value = newTip.date;
      inputType.value = newTip.type;
      inputShift.value = newTip.shift;
    } else {
      inputAmount.value = null;
      inputDate.value = todayDateString;
      inputType.value = "Banquet";
      inputShift.value = "Dinner";
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="formContainer">
    <ErrorMessage
      v-if="showError"
      :message="errorMessage"
      @close="showError = false"
    />
    <h2>{{ props.isBeingEdited ? "Edit Tip:" : "New Tip:" }}</h2>
    <img
      v-if="isBeingEdited"
      class="delete"
      @click="deleteTip"
      :src="closeIcon"
    />

    <div class="amountInputWrapper">
      <input
        v-model="inputAmount"
        ref="focusTarget"
        type="number"
        id="newTipAmount"
        inputmode="numeric"
      />
    </div>

    <input v-model="inputDate" type="date" id="newTipDate" />

    <div class="radioInput">
      <div class="radioOptionContainer">
        <label for="lunch">Lunch</label>
        <input
          v-model="inputShift"
          type="radio"
          id="lunch"
          name="newTipShift"
          value="Lunch"
        />
      </div>

      <div class="radioOptionContainer">
        <label for="dinner">Dinner</label>
        <input
          v-model="inputShift"
          type="radio"
          id="dinner"
          name="newTipShift"
          value="Dinner"
        />
      </div>
    </div>

    <div class="radioInput">
      <div class="radioOptionContainer">
        <label for="floor">Floor</label>
        <input
          v-model="inputType"
          type="radio"
          id="floor"
          name="newTipType"
          value="Floor"
        />
      </div>
      <div class="radioOptionContainer">
        <label for="banquet">Banquet</label>
        <input
          v-model="inputType"
          type="radio"
          id="banquet"
          name="newTipType"
          value="Banquet"
        />
      </div>
    </div>

    <hr />
    <transition name="fade" @after-leave="showButtons = true">
      <ConfirmationMessage
        v-show="showConfirm"
        :message="confirmMessage"
        @confirm="
          () => {
            TipStore.removeTip(targetTip);
            $emit('close');
          }
        "
        @close="showConfirm = false"
      />
    </transition>
    <div class="confirmationContainer">
      <button
        class="cancel"
        v-show="showButtons"
        @click="
          () => {
            $emit('close');
          }
        "
      >
        Cancel
      </button>

      <button
        class="confirm"
        v-show="showButtons"
        @click="
          () => {
            if (isBeingEdited) {
              confirmEditTip();
            } else {
              confirmNewTip();
            }
          }
        "
      >
        Confirm
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.addTipContainer {
  position: absolute;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  width: 100%;
}

h2 {
  width: 80%;
  text-align: center;
}

.formContainer {
  position: fixed;
  top: 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  border: solid var(--themeColor) 1px;
  border-radius: 1rem;
  padding: 1rem;
  background-color: var(--backgroundBlack);
  height: 24rem;
  width: min(90%, 22rem);
}

input {
  border: solid var(--themeColor) 1px;
  border-radius: 0.5rem;
  background-color: var(--backgroundDark);
  padding: 0.25rem;
  box-sizing: inherit;
}

input:checked {
  accent-color: var(--themeColor);
  box-shadow: 0 0 8px 2px var(--themeColor);
}

input[type="date"] {
  padding-left: 20%;
}

.amountInputWrapper {
  position: relative;
  display: flex;
  justify-content: center;
  width: 80%;
}

.amountInputWrapper::before {
  content: "💲";
  position: absolute;
  left: 10%;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

#newTipAmount {
  margin: auto 0;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  width: 100%;
}

#newTipDate {
  width: 80%;
}

#newTipAmount:focus,
#newTipDate:focus {
  outline: solid 3px var(--themeColor);
}

.radioInput {
  display: flex;
  justify-content: center;
  width: 75%;
  gap: 1rem;
}

.radioOptionContainer {
  display: flex;
  justify-content: flex-end;
  width: 50%;
  gap: 0.5rem;
}

hr {
  color: var(--themeColor);
}

.confirmationContainer {
  display: flex;
  justify-content: space-between;
  width: 80%;
}

button {
  background-color: var(--backgroundDark);
  border: none;
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
  height: 2.25rem;
}

.cancel {
  background-color: darkred;
  font-size: 0.8rem;
}

.confirm {
  background-color: var(--themeColor);
  font-weight: bold;
}

.delete {
  position: absolute;
  right: 1rem;
  height: 2.25rem;
  width: 2.25rem;

  cursor: pointer;

  filter: brightness(0) saturate(100%) invert(14%) sepia(90%) saturate(3720%)
    hue-rotate(346deg) brightness(90%) contrast(92%);
}
</style>
