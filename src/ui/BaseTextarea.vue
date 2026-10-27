<script setup>
// Extra attributes (rows, placeholder, disabled, …) go to the <textarea>.
import BaseField from './BaseField.vue'

defineOptions({ inheritAttrs: false })
const model = defineModel()
defineProps({
  label: String,
  hint: String,
  error: String,
  id: String,
  required: Boolean,
})
</script>

<template>
  <BaseField v-slot="{ attrs }" :label :hint :error :id :required>
    <textarea v-model="model" class="textarea" v-bind="{ ...attrs, ...$attrs }" />
  </BaseField>
</template>
