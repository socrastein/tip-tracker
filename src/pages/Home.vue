<script setup>
import AddTip from "../components/AddTip.vue";
import TipsContainer from "../components/TipsContainer.vue";
</script>

<template>
  <div class="mainContainer" id="mainContainer">
    <AddTip />
    <TipsContainer />
  </div>
</template>

<style scoped>
.mainContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(90%, 24rem);
  margin: auto;

  transition: filter 0.3s ease;
}
</style>
