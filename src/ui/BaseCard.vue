<script setup>
// Slots: media, header (replaces title/subtitle), default (body), footer.
defineProps({
  title: String,
  subtitle: String,
  /** Lift on hover — for clickable cards. */
  interactive: Boolean,
  /** No shadow. */
  flat: Boolean,
  as: { type: String, default: 'div' },
})
</script>

<template>
  <component
    :is="as"
    class="card"
    :class="{ 'cardInteractive': interactive, 'cardFlat': flat }"
  >
    <div v-if="$slots.media" class="cardMedia"><slot name="media" /></div>
    <header v-if="title || $slots.header" class="cardHeader">
      <slot name="header">
        <h3 class="cardTitle">{{ title }}</h3>
        <p v-if="subtitle" class="cardSubtitle">{{ subtitle }}</p>
      </slot>
    </header>
    <div v-if="$slots.default" class="cardBody"><slot /></div>
    <footer v-if="$slots.footer" class="cardFooter"><slot name="footer" /></footer>
  </component>
</template>
