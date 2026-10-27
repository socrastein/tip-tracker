<script setup>
// Label + hint/error wrapper shared by the form controls.
// The default slot receives `attrs` (id, aria-*) to bind onto the control.
import { computed, useId } from 'vue'

const props = defineProps({
  label: String,
  hint: String,
  error: String,
  id: String,
  required: Boolean,
})

const autoId = useId()
const fieldId = computed(() => props.id || autoId)
const messageId = computed(() => `${fieldId.value}-msg`)

const controlAttrs = computed(() => ({
  id: fieldId.value,
  required: props.required || undefined,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-describedby': props.error || props.hint ? messageId.value : undefined,
}))
</script>

<template>
  <div class="field">
    <label v-if="label" class="fieldLabel" :for="fieldId">
      {{ label }}<span v-if="required" class="fieldRequired" aria-hidden="true">*</span>
    </label>
    <slot :attrs="controlAttrs" />
    <p v-if="error || hint" :id="messageId" :class="error ? 'fieldError' : 'fieldHint'">
      {{ error || hint }}
    </p>
  </div>
</template>
