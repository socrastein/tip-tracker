<script setup>
import { modifier } from './modifier.js'

defineProps({
  /** primary | secondary | ghost | danger */
  variant: { type: String, default: 'secondary' },
  /** sm | md | lg */
  size: { type: String, default: 'md' },
  /** Render as a link instead of a button. */
  href: String,
  type: { type: String, default: 'button' },
  block: Boolean,
  /** Square, icon-only button. Give it an aria-label. */
  icon: Boolean,
  loading: Boolean,
  disabled: Boolean,
})
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    class="btn"
    :class="[
      modifier('btn', variant),
      size !== 'md' && modifier('btn', size),
      { 'btnBlock': block, 'btnIcon': icon },
    ]"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-disabled="href && disabled ? 'true' : undefined"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot />
  </component>
</template>
