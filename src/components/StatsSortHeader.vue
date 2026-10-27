<script setup>
import { ref, computed } from "vue";

const highlighted = ref("Year");

function highlight(target) {
  highlighted.value = target;
}

const emit = defineEmits(["year", "month", "day"]);
</script>

<template>
  <div class="headerContainer">
    <h2>Tip Data</h2>
    <div class="sortHeader">
      <button
        v-for="item in ['Year', 'Month', 'Day']"
        :key="item"
        class="sortButton"
        :class="{ highlight: highlighted === item }"
        @click="
          () => {
            highlight(item);
            $emit(item.toLowerCase());
          }
        "
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.headerContainer {

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  margin-top: 2rem;
}

h2 {
  width: 80%;
  padding: 0.5rem;
  background-color: var(--backgroundBlack);
  border-radius: 0.5rem;

  text-align: center;
}

.sortHeader {
  display: flex;
  gap: .5rem;
  justify-content: center;
}

.sortButton {
  background-color: var(--backgroundBlack);
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 1.2rem;
  width: 6rem;
}

.highlight {
  border: solid 2px var(--themeColor);
}
</style>
