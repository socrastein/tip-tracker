<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Tip from "../components/Tip.vue";
import PayPeriodSummary from "../components/PayPeriodSummary.vue";
import { TipStore } from "../scripts/TipStore";

// Reactive array
const groupedTips = computed(() => TipStore.getGroupedTips());

const batchSize = 3;
const visibleGroups = computed(() =>
  groupedTips.value.slice(0, currentIndex + batchSize),
);
let currentIndex = 0;

// load the next batch of groups as user scrolls
const loadMoreGroups = () => {
  const nextIndex = currentIndex + batchSize;
  visibleGroups.value.push(...groupedTips.value.slice(currentIndex, nextIndex));
  currentIndex = nextIndex;
};

watch(groupedTips, (newGroups) => {
  // reset visibleGroups when groupedTips changes
  visibleGroups.value = newGroups.slice(0, currentIndex);
});

// load initial batch of tip groups
// should fill the viewport and then some
onMounted(() => {
  requestAnimationFrame(() => {
    loadMoreGroups();
    window.addEventListener("scroll", handleScroll);
  });
});

const container = ref(null);

const handleScroll = () => {
  const scrollTop = window.scrollY;
  const viewportHeight = window.innerHeight;
  const totalHeight = document.body.scrollHeight;

  // if user scrolled within 300px of bottom, load more tip groups
  if (scrollTop + viewportHeight >= totalHeight - 300) {
    loadMoreGroups();
  }
};

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div class="tipsContainer">
    <TransitionGroup name="fade-slide" tag="div" class="groupsContainer">
      <div
        class="groupContainer"
        v-for="group in visibleGroups"
        :key="group.period"
      >
        <PayPeriodSummary
          :tips="group.tips"
          :period="group.period"
          :total="group.total"
        />
        <Tip
          v-for="tip in group.tips"
          :key="tip.date + tip.shift"
          :amount="tip.amount"
          :date="tip.date"
          :type="tip.type"
          :shift="tip.shift"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.groupsContainer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

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
