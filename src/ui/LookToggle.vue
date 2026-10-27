<script setup>
// Light-mode look switch (Braun / Brutal / Glass / Paper). Disabled while dark mode is showing,
// since looks only change the light theme.
import BaseSegmented from './BaseSegmented.vue'
import { useLook } from './useLook.js'

const { look, available } = useLook()
const options = [
  { value: 'braun', label: 'Braun' },
  { value: 'brutal', label: 'Brutal' },
  { value: 'glass', label: 'Glass' },
  { value: 'paper', label: 'Paper' },
]
</script>

<template>
  <BaseSegmented
    v-model="look"
    :options
    label="Light mode look"
    :disabled="!available"
    :title="available ? undefined : 'Looks apply to light mode only'"
  />
</template>
