<script setup>
// Single-choice button group. Options: ['a', 'b'] or [{ label, value }].
import { computed } from 'vue'

const model = defineModel()
const props = defineProps({
  options: { type: Array, default: () => [] },
  /** Accessible name for the group. */
  label: String,
  /** Disables every option. */
  disabled: Boolean,
})

const normalized = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o })),
)
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="opt in normalized"
      :key="opt.value"
      type="button"
      class="segmentedItem"
      :aria-pressed="model === opt.value"
      :disabled
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
