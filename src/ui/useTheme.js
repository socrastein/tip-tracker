import { computed, ref, watch } from 'vue'
import { persistedChoice } from './persistedChoice.js'

const THEMES = ['light', 'dark', 'system']
const isBrowser = typeof window !== 'undefined'

// Shared, module-level state: every caller sees the same theme.
// The default is 'system' unless the page sets data-default-theme on <html>.
const { choice: theme } = persistedChoice('theme', THEMES, 'system')
const systemDark = ref(isBrowser && window.matchMedia('(prefers-color-scheme: dark)').matches)

if (isBrowser) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => (systemDark.value = e.matches))

  // Show the chosen theme: 'system' needs no attribute, the stylesheet follows the OS.
  watch(
    theme,
    (value) => {
      const root = document.documentElement
      if (value === 'system') delete root.dataset.theme
      else root.dataset.theme = value
    },
    { immediate: true },
  )
}

/**
 * theme:    'light' | 'dark' | 'system' (writable)
 * resolved: 'light' | 'dark' — what is actually showing
 */
export function useTheme() {
  const resolved = computed(() =>
    theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value,
  )
  const toggle = () => (theme.value = resolved.value === 'dark' ? 'light' : 'dark')
  return { theme, resolved, toggle }
}
