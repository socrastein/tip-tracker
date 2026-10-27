<script setup>
// Menu button. Pass `items` ({ label, value?, danger?, disabled?, separator? })
// and listen for @select, or put your own <button class="menuItem" role="menuitem">
// elements in the default slot. The `trigger` slot replaces the button content.
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { modifier } from './modifier.js'

defineProps({
  label: { type: String, default: 'Options' },
  /** Trigger button variant. */
  variant: { type: String, default: 'secondary' },
  /** start | end — which edge the menu aligns to. */
  align: { type: String, default: 'start' },
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

const open = ref(false)
const root = ref(null)
const trigger = ref(null)
const menu = ref(null)
const menuId = useId()

const menuItems = () => [...(menu.value?.querySelectorAll('.menuItem:not(:disabled)') ?? [])]

function focusItem(index) {
  const list = menuItems()
  if (list.length) list[(index + list.length) % list.length].focus()
}

async function show(focusIndex = 0) {
  open.value = true
  await nextTick()
  focusItem(focusIndex)
}

function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function onTriggerKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); show(0) }
  if (e.key === 'ArrowUp') { e.preventDefault(); show(-1) }
}

function onMenuKeydown(e) {
  const i = menuItems().indexOf(document.activeElement)
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); focusItem(i + 1); break
    case 'ArrowUp': e.preventDefault(); focusItem(i - 1); break
    case 'Home': e.preventDefault(); focusItem(0); break
    case 'End': e.preventDefault(); focusItem(-1); break
    case 'Escape': e.preventDefault(); hide(); break
    case 'Tab': hide(false); break
  }
}

function onMenuClick(e) {
  if (e.target.closest('.menuItem:not(:disabled)')) hide()
}

function onOutsidePointer(e) {
  if (!root.value?.contains(e.target)) hide(false)
}

watch(open, (value) =>
  value
    ? document.addEventListener('pointerdown', onOutsidePointer)
    : document.removeEventListener('pointerdown', onOutsidePointer),
)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointer))
</script>

<template>
  <div ref="root" class="dropdown">
    <button
      ref="trigger"
      type="button"
      class="btn"
      :class="modifier('btn', variant)"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="open ? hide() : show()"
      @keydown="onTriggerKeydown"
    >
      <slot name="trigger">
        {{ label }}
        <svg class="dropdownChevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </slot>
    </button>

    <div
      v-if="open"
      :id="menuId"
      ref="menu"
      class="menu"
      :class="{ 'menuEnd': align === 'end' }"
      role="menu"
      @keydown="onMenuKeydown"
      @click="onMenuClick"
    >
      <slot>
        <template v-for="(item, i) in items" :key="i">
          <hr v-if="item.separator" class="menuSeparator" />
          <button
            v-else
            type="button"
            role="menuitem"
            tabindex="-1"
            class="menuItem"
            :class="{ 'menuItemDanger': item.danger }"
            :disabled="item.disabled"
            @click="emit('select', item)"
          >
            {{ item.label }}
          </button>
        </template>
      </slot>
    </div>
  </div>
</template>
