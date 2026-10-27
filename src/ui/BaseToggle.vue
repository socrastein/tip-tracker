<script setup>
const model = defineModel({ type: Boolean })
defineProps({
  label: String,
  disabled: Boolean,
})
</script>

<template>
  <label class="toggle">
    <input v-model="model" type="checkbox" role="switch" class="toggleInput" :disabled />
    <span v-if="label || $slots.default"><slot>{{ label }}</slot></span>
  </label>
</template>
