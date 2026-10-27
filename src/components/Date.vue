<script setup>
import { computed } from "vue";
import moment from "moment";

const props = defineProps({
  date: String,
});

const formattedDate = computed(() => {
  const m = moment(props.date, "YYYY-MM-DD");
  let dateString = m.format("ddd MMM DD YYYY");
  let split = dateString.split(" ");
  const dayOfWeek = split[0];
  const month = split[1];
  const day = split[2];

  return {
    dayOfWeek,
    month,
    day,
  };
});
</script>

<template>
  <div class="dateContainer">
    <p class="day">{{ formattedDate.dayOfWeek }}</p>
    <p class="date">{{ formattedDate.month }} {{ formattedDate.day }}</p>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */

.day {
  font-weight: bold;
}

.dateContainer {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
}
</style>
