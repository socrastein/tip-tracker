<script setup>
// Extra attributes (placeholder, disabled, autocomplete, …) go to the <input>.
import BaseField from './BaseField.vue'

defineOptions({ inheritAttrs: false })
const model = defineModel()
defineProps({
  label: String,
  hint: String,
  error: String,
  id: String,
  required: Boolean,
  type: { type: String, default: 'text' },
})
</script>

<template>
  <BaseField v-slot="{ attrs }" :label :hint :error :id :required>
    <input v-model="model" :type class="input" v-bind="{ ...attrs, ...$attrs }" />
  </BaseField>
</template>
