<script setup>
import BaseSegmented from './BaseSegmented.vue'
import { useTheme } from './useTheme.js'

const { theme } = useTheme()
const options = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
]
</script>

<template>
  <BaseSegmented v-model="theme" :options label="Color theme" />
</template>
