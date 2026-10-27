<script setup>
import { computed } from "vue";
import { TipGrouper } from "../scripts/TipGrouper";
import { TipAnalyzer } from "../scripts/TipAnalyzer";

// Define your props
const props = defineProps({
  period: String,
  tips: Array,
  total: Number
});

// Define your computed properties

const average = computed(() => {
  return TipAnalyzer.getAverageTip(props.tips);
});

const periodLabel = computed(() => {
  // Period key format: "YYYY-M-H" where H is 1 (first half) or 2 (second half)
  const [year, month, half] = props.period.split("-").map(Number);

  const startDay = half === 1 ? 1 : 16;
  let endDay;
  if (half === 1) {
    endDay = 15;
  } else {
    // Gives last day of month
    endDay = new Date(year, month, 0).getDate();
  }

  // Convert numeric month to name
  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "short",
  });

  return {
    month: monthName,
    start: startDay,
    end: endDay,
    year: year,
  };
});
</script>

<template>
  <div class="payPeriodSummary">
    <div class="payPeriodHeader">
      <p class="payPeriodDate">
        {{ periodLabel.month }} {{ periodLabel.start }} — {{ periodLabel.end }}
      </p>
      <p class="payPeriodYear">{{ periodLabel.year }}</p>
    </div>
    <hr></hr>
    <div class="numbersContainer">
    <div class="totalContainer">
      <p class="totalLabel">Total:</p>
      <p class="totalValue">${{ total }}</p>
    </div>
    <div class="averageContainer">
      <p class="averageLabel">Average:</p>
      <p class="averageValue">${{ average }}</p>
    </div>
    </div>

  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.payPeriodSummary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;

  width: 100%;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--backgroundDark);
}

.payPeriodHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 80%;
}

.payPeriodDate {
  font-weight: bold;
}
.payPeriodYear {
  font-size: 0.8rem;
}

hr {
  width: 80%;
  color: var(--themeColor);
}

.numbersContainer {
  width: 80%;
  display: flex;
  flex-direction: column;
}

.totalContainer,
.averageContainer {

  display: flex;
  justify-content: space-between;
}
.totalLabel,
.averageLabel {
  font-weight: bold;
}
.totalValue {
}

.averageLabel {
}
.averageValue {
}
</style>
