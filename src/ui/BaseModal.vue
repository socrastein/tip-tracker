<script setup>
// Native <dialog>: focus trapping, Esc to close and top-layer stacking come free.
// Use v-model:open. Slots: default (body), footer, header (replaces title).
import { onMounted, ref, useId, watch } from 'vue'
import { modifier } from './modifier.js'

const open = defineModel('open', { type: Boolean, default: false })
defineProps({
  title: String,
  /** sm | md | lg */
  size: { type: String, default: 'md' },
})

const dialog = ref(null)
const titleId = useId()

function sync(value) {
  const el = dialog.value
  if (!el) return
  if (value && !el.open) el.showModal()
  else if (!value && el.open) el.close()
}

watch(open, sync)
onMounted(() => sync(open.value))

// Clicks on the backdrop target the <dialog> element itself.
function onClick(e) {
  if (e.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="size !== 'md' && modifier('modal', size)"
    :aria-labelledby="title ? titleId : undefined"
    @close="open = false"
    @click="onClick"
  >
    <header v-if="title || $slots.header" class="modalHeader">
      <slot name="header">
        <h2 :id="titleId" class="modalTitle">{{ title }}</h2>
      </slot>
      <button type="button" class="btn btnGhost btnIcon btnSm" aria-label="Close" @click="open = false">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </header>
    <div class="modalBody"><slot /></div>
    <footer v-if="$slots.footer" class="modalFooter"><slot name="footer" /></footer>
  </dialog>
</template>
