<script setup>
import { ref, computed, TransitionGroup } from "vue";
import { onMounted } from "vue";

import { TipStore } from "../scripts/TipStore";
import { TipGrouper } from "../scripts/TipGrouper";

const yearGroups = computed(() =>
  TipGrouper.groupByYearAndDayOfWeek(TipStore.getAllTips()).slice().reverse(),
);

const visibleGroups = ref([]);

onMounted(() => {
  yearGroups.value.forEach((group, i) => {
    setTimeout(() => {
      visibleGroups.value.push(group);
    }, i * 300); // 300ms stagger per group
  });
});
</script>

<template>
  <TransitionGroup name="fade-slide" tag="div" class="summaryContainer">
    <div class="yearSummary" v-for="year in visibleGroups" :key="year.period">
      <h1>{{ year.period }}</h1>

      <div
        class="monthSummary"
        v-for="day in year.intervals"
        :key="year.period + day.period"
      >
        <div class="gridLabels">
          <h3>{{ day.period.substring(0, 3) }}</h3>
          <p>Total</p>
          <p>High</p>
          <p>Avg</p>
          <p>Low</p>
        </div>

        <hr />

        <div class="daysGrid">
          <div class="gridValues">
            <p class="small">{{ day.tips.length }}</p>
            <p :class="{ bold: day.total === year.maxTotal }">
              {{ day.total }}
            </p>
            <p :class="{ bold: day.highest === year.maxHighest }">
              {{ day.highest }}
            </p>
            <p :class="{ bold: day.average === year.maxAverage }">
              {{ day.average }}
            </p>
            <p :class="{ bold: day.lowest === year.leastLowest }">
              {{ day.lowest }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
h1 {
  color: var(--themeColor);
  background-color: var(--backgroundLight);
  padding: 0 1rem;
  border-radius: 0.5rem;
}
h3 {
  text-align: center;
  width: 100%;
}

.summaryContainer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.yearSummary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;

  width: 100%;
  border: solid 2px var(--themeColor);
  border-radius: 1rem;
  padding: 1rem 1.5rem;

  background-color: var(--backgroundBlack);
}

.monthSummary {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.daysGrid {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;

  height: 2.5rem;
  width: 100%;
}

.gridLabels,
.gridValues {
  display: grid;
  grid-template-rows: 2;
  grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr 0.2fr;
  width: 100%;
  text-align: right;
  align-items: center;
}

.gridLabels {
  background-color: var(--backgroundLight);
  border-radius: 0.5rem 0.5rem 0 0;
  font-size: 0.9rem;
  font-weight: bold;
}

.bold {
  font-weight: bold;
}

.small {
  text-align: center;
  font-size: 0.9rem;
}
</style>
