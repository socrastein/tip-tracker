<script setup>
// Light / Auto / Dark switch.
import BaseSegmented from './BaseSegmented.vue'
import { useTheme } from './useTheme.js'
import { useLook } from './useLook.js'

const { theme } = useTheme()

// Switching to light must also apply the light-mode look (Braun by default). The look state
// does that, but only once something has loaded it, so the toggle loads it too: an app with
// only this toggle would otherwise show the base look until the next page load.
useLook()
const options = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
]
</script>

<template>
  <BaseSegmented v-model="theme" :options label="Color theme" />
</template>
