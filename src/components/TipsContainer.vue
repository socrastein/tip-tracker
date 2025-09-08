<script setup>
import { computed } from "vue";
import { TipMemory } from "../scripts/TipMemory";
import Tip from "../components/Tip.vue";
import PayPeriodSummary from "../components/PayPeriodSummary.vue";

// Reactive array
const groupedTips = computed(() => TipMemory.tipState.groupedTips);
</script>

<template>
  <div class="tipsContainer" id="tipsContainer">
    <div
      class="groupContainer"
      v-for="group in groupedTips"
      :key="group.period"
    >
      <PayPeriodSummary
        :tips="group.tips"
        :period="group.period"
        :total="group.total"
      />
      <Tip
        v-for="tip in group.tips"
        :key="tip.date + tip.shift + Date.now()"
        :amount="tip.amount"
        :date="tip.date"
        :type="tip.type"
        :shift="tip.shift"
      />
    </div>
  </div>
</template>

<style scoped>
.tipsContainer {
  margin-top: 5rem;
  transition: filter 0.3s ease;
}

.tipsContainer,
.groupContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;

  padding: 2rem 0;
}
</style>
