<script setup>
import { ref, computed, TransitionGroup } from "vue";
import { onMounted } from "vue";

import { TipStore } from "../scripts/TipStore";
import { TipGrouper } from "../scripts/TipGrouper";
import { TipAnalyzer } from "../scripts/TipAnalyzer";

const allGroups = computed(() =>
  TipGrouper.groupByYear(TipStore.getAllTips()).slice().reverse()
);

const visibleGroups = ref([]);

onMounted(() => {
  allGroups.value.forEach((group, i) => {
    setTimeout(() => {
      visibleGroups.value.push(group);
    }, i * 300); // 300ms stagger per group
  });
});
</script>

<template>
  <TransitionGroup name="fade-slide" tag="div" class="summaryContainer">
    <div class="yearSummary" v-for="group in visibleGroups" :key="group.period">
      <div class="statContainer">
        <h2>{{ group.period }}</h2>
        <h3>{{ group.tips.length }} tips</h3>
      </div>
      <div class="totals">
        <div class="statContainer">
          <p>Total:</p>
          <p>${{ group.total }}</p>
        </div>
      </div>
      <div class="averages">
        <div class="statContainer">
          <p>Average:</p>
          <p>${{ group.average }}</p>
        </div>
        <div class="statContainer">
          <p>Median:</p>
          <p>${{ group.median }}</p>
        </div>
      </div>
      <div class="extremes">
        <div class="statContainer">
          <p>Highest:</p>
          <p>${{ group.highest }}</p>
        </div>
        <div class="statContainer">
          <p>Lowest:</p>
          <p>${{ group.lowest }}</p>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.summaryContainer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.yearSummary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;

  width: 100%;
  border: solid 2px var(--themeColor);
  border-radius: 1rem;
  padding: 1rem 2rem;

  background-color: var(--backgroundBlack);
}

h2 {
  color: var(--themeColor);
}

.totals,
.averages,
.extremes {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.25rem;
}

.totals {
  font-size: 1.2rem;
}

.averages {
}

.statContainer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.statContainer :nth-child(2) {
  font-weight: bold;
}
</style>
