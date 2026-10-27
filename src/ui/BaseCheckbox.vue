<script setup>
// v-model can be a boolean, or an array combined with `value`.
const model = defineModel({ type: [Boolean, Array] })
defineProps({
  label: String,
  value: null,
  disabled: Boolean,
})
</script>

<template>
  <label class="check">
    <input v-model="model" type="checkbox" :value :disabled />
    <span><slot>{{ label }}</slot></span>
  </label>
</template>
