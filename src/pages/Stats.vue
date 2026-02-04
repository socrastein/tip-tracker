<script setup>
import { ref, defineAsyncComponent } from "vue";

import StatsSortHeader from "../components/StatsSortHeader.vue";
import StatsSummaryMonth from "../components/StatsSummaryMonth.vue";
import StatsSummaryDay from "../components/StatsSummaryDay.vue";

const dataDisplayed = ref("year");

const StatsSummaryYear = defineAsyncComponent(() =>
  import("../components/StatsSummaryYear.vue")
);
</script>

<template>
  <div class="mainContainer" id="mainContainer">
    <StatsSortHeader
      @year="dataDisplayed = 'year'"
      @month="dataDisplayed = 'month'"
      @day="dataDisplayed = 'day'"
    />

    <StatsSummaryYear v-if="dataDisplayed === 'year'" />
    <StatsSummaryMonth v-if="dataDisplayed === 'month'" />
    <StatsSummaryDay v-if="dataDisplayed === 'day'" />
  </div>
</template>

<style scoped>
.mainContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(90%, 24rem);
  margin: auto;

  gap: 2rem;

  transition: filter 0.3s ease;
}
</style>
