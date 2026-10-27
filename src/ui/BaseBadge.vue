<script setup>
import { modifier } from './modifier.js'

defineProps({
  /** neutral | accent | hero | success | warning | danger | info */
  variant: { type: String, default: 'neutral' },
  dot: Boolean,
})
</script>

<template>
  <span class="badge" :class="variant !== 'neutral' && modifier('badge', variant)">
    <span v-if="dot" class="badgeDot" aria-hidden="true" />
    <slot />
  </span>
</template>
