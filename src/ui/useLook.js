import { computed, watch } from 'vue'
import { persistedChoice } from './persistedChoice.js'
import { useTheme } from './useTheme.js'

/** Every light-mode look. Keep in sync with bootTheme() in themeBoot.js. */
const LOOKS = ['braun', 'brutal', 'glass', 'paper']

/** What projects get unless they or the user choose otherwise. */
const DEFAULT_LOOK = 'braun'

/**
 * The look built into the stylesheet's base rules, so it needs no data-look attribute.
 * Those base rules are also what dark mode uses (flat, no outlines).
 */
const BASE_LOOK = 'brutal'

const isBrowser = typeof window !== 'undefined'

// Shared, module-level state: every caller sees the same look.
// The default is Braun unless the page sets data-default-look on <html>.
const { choice: look } = persistedChoice('look', LOOKS, DEFAULT_LOOK)

// Looks only exist in light mode; dark always uses the base (flat dark) styles.
const { resolved } = useTheme()
const available = computed(() => resolved.value === 'light')
const active = computed(() => (available.value ? look.value : null))

if (isBrowser) {
  // Show the active look. The base look, and dark mode, need no attribute.
  watch(
    active,
    (value) => {
      const root = document.documentElement
      const needsAttribute = value !== null && value !== BASE_LOOK
      if (needsAttribute) root.dataset.look = value
      else delete root.dataset.look
    },
    { immediate: true },
  )
}

/**
 * Light-mode look: Braun (default), neo-brutalism, glass or paper.
 *
 * look:      'braun' | 'brutal' | 'glass' | 'paper' (writable) — the saved choice,
 *            remembered even while dark mode hides it
 * available: true while the light theme is showing, i.e. when look has an effect
 * active:    the look actually showing, or null in dark mode
 */
export function useLook() {
  return { look, available, active }
}
