<script setup>
// Options: ['a', 'b'] or [{ label, value, disabled }].
import { computed, useId } from 'vue'

const model = defineModel()
const props = defineProps({
  label: String,
  options: { type: Array, default: () => [] },
  name: String,
  inline: Boolean,
  disabled: Boolean,
})

const autoName = useId()
const groupName = computed(() => props.name || autoName)
const normalized = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o })),
)
</script>

<template>
  <fieldset class="fieldset" :disabled>
    <legend v-if="label" class="fieldLabel">{{ label }}</legend>
    <div :class="inline ? 'cluster' : 'stack stackTight'">
      <label v-for="opt in normalized" :key="opt.value" class="check">
        <input
          v-model="model"
          type="radio"
          :name="groupName"
          :value="opt.value"
          :disabled="opt.disabled"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>
  </fieldset>
</template>
