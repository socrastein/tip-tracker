<script setup>
// Native <select>. Options: ['a', 'b'] or [{ label, value, disabled }].
// <option>/<optgroup> elements in the default slot are appended.
import { computed } from 'vue'
import BaseField from './BaseField.vue'

defineOptions({ inheritAttrs: false })
const model = defineModel({ default: '' })
const props = defineProps({
  label: String,
  hint: String,
  error: String,
  id: String,
  required: Boolean,
  options: { type: Array, default: () => [] },
  placeholder: String,
})

const normalized = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o })),
)
</script>

<template>
  <BaseField v-slot="{ attrs }" :label :hint :error :id :required>
    <select
      v-model="model"
      class="select"
      :class="{ 'isPlaceholder': placeholder && model === '' }"
      v-bind="{ ...attrs, ...$attrs }"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in normalized" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
        {{ opt.label }}
      </option>
      <slot />
    </select>
  </BaseField>
</template>
