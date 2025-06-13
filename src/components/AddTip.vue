<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";
import addIcon from "@/assets/icons/plus.svg";
import { getTodayDateString } from "../scripts/Dates";

// Define your props
defineProps({
  // Add your props here
});

// Define your component's data
const showForm = ref(false);
const todayDateString = getTodayDateString();

// Define your methods
function someMethod() {
  // Add your method logic here
}

// Define your computed properties
const someComputed = computed(() => {
  // Add your computed logic here
});

// Lifecycle hook
onMounted(() => {
  // Add your mounted logic here
});
</script>

<template>
  <div class="addTipContainer">
    <div
      class="iconContainer"
      v-if="!showForm"
      @click="
        () => {
          showForm = true;
        }
      "
    >
      <img class="icon" :src="addIcon" />
    </div>
    <div class="formContainer" v-if="showForm">
      <h2>New Tip:</h2>
      <input type="number" id="amount" inputmode="numeric" />
      <input type="date" id="date" :value="todayDateString" />

      <div class="radioInput">
        <div class="radioOptionContainer">
          <label for="floor">Floor</label>
          <input type="radio" id="floor" name="type" value="floor" />
        </div>
        <div class="radioOptionContainer">
          <label for="banquet">Banquet</label>
          <input
            type="radio"
            id="banquet"
            name="type"
            value="banquet"
            checked
          />
        </div>
      </div>
      <div class="confirmationContainer">
        <button
          class="cancel"
          @click="
            () => {
              showForm = false;
            }
          "
        >
          Cancel
        </button>

        <button
          class="confirm"
          @click="
            () => {
              showForm = false;
            }
          "
        >
          Add Tip
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.addTipContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.iconContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3rem;
  width: 6rem;

  background-color: var(--themeColor);
  border-radius: 0.5rem;
}

.icon {
  height: 100%;
  filter: invert(100%);
}

.formContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: solid var(--themeColor) 1px;
  border-radius: 1rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.75);
}

input {
  border: solid var(--themeColor) 1px;
  border-radius: 0.5rem;
  background-color: var(--backgroundDark);
  padding: 0.25rem;
}

input:checked {
  border-color: var(--themeColor);
}

.radioInput {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.radioOptionContainer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirmationContainer {
  display: flex;
  justify-content: space-between;
}

button {
  background-color: var(--backgroundDark);
  border: none;
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
}

.cancel {
  background-color: darkred;
  font-size: 0.8rem;
}

.confirm {
  background-color: var(--themeColor);
  font-weight: bold;
}
</style>
