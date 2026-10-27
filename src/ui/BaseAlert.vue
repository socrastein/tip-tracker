<script setup>
// Slots: default (message), icon.
import { modifier } from './modifier.js'

defineProps({
  /** info | success | warning | danger */
  variant: { type: String, default: 'info' },
  title: String,
  dismissible: Boolean,
})
defineEmits(['dismiss'])
</script>

<template>
  <div
    class="alert"
    :class="variant !== 'info' && modifier('alert', variant)"
    :role="variant === 'danger' || variant === 'warning' ? 'alert' : 'status'"
  >
    <span v-if="$slots.icon" class="alertIcon"><slot name="icon" /></span>
    <div class="alertContent">
      <p v-if="title" class="alertTitle">{{ title }}</p>
      <div v-if="$slots.default"><slot /></div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="alertClose"
      aria-label="Dismiss"
      @click="$emit('dismiss')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
