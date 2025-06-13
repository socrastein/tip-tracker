<script setup>
import { ref, computed } from "vue";
import { onMounted } from "vue";
// Define your props
const props = defineProps({
  amount: Number,
  date: String,
  type: String,
});

// Define your component's data
const someData = ref(null); // Example data

// Define your methods
function someMethod() {
  // Add your method logic here
}

// Takes YYYY-MM-DD format date string and returns Mon | 6/12
const formattedDate = computed(() => {
  let dateObj = new Date(props.date);
  let day = dateObj.toDateString().substring(0, 3);
  let shortDate;
  if (props.date.charAt(5) === "0") {
    shortDate = props.date.slice(6);
  } else {
    shortDate = props.date.slice(5);
  }
  let splitDate = shortDate.split("-");

  return [day, splitDate[0], splitDate[1]];
});

// Lifecycle hook
onMounted(() => {
  // Add your mounted logic here
});
</script>

<template>
  <div class="tip">
    <div class="tipHeader">
      <p class="amount">${{ amount }}</p>
      <div class="dateContainer">
        <p class="day">{{ formattedDate[0] }}</p>
        <p class="date">{{ formattedDate[1] }}/{{ formattedDate[2] }}</p>
      </div>
    </div>
    <div class="typeContainer">
      <p>{{ type }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
.tip {
  border: 1px solid var(--themeColor);
  border-radius: 1rem;
  width: min(90%, 16rem);
  padding: 0.5rem 1rem;
  background-color: rgba(0, 0, 0, 0.75);
}

.tipHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.amount {
  font-weight: bold;
  font-size: 1.75rem;
}

.dateContainer {
  display: flex;
  gap: 1rem;
}

.day {
  font-weight: bold;
}

.date {
}

.typeContainer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
