/**
 * Applies the saved theme and look to <html> before the page paints, so a page that loads
 * in dark mode (or in a non-default look) doesn't flash the wrong colors first.
 *
 * It has to run as an inline <script> in <head>, before any stylesheet, so it can't import
 * anything: it repeats the storage and default rules of persistedChoice.js, useTheme.js and
 * useLook.js. Keep the four in sync.
 *
 * Use it through one of the exports below rather than copying it by hand:
 * - Vite:  plugins: [vue(), themeBootPlugin()]           (vite.config.js)
 * - Nuxt:  app.head.script: [{ innerHTML: THEME_BOOT_SCRIPT }]   (nuxt.config.ts)
 */
function bootTheme() {
  try {
    const root = document.documentElement
    const prefix = root.getAttribute('data-storage-prefix')

    /** Saved value if valid, else the page's data-default-<name>, else the kit default. */
    const readChoice = (name, allowed, builtInDefault) => {
      const key = prefix ? prefix + '.' + name : name
      const stored = localStorage.getItem(key)
      if (allowed.includes(stored)) return stored
      const projectDefault = root.getAttribute('data-default-' + name)
      return allowed.includes(projectDefault) ? projectDefault : builtInDefault
    }

    const theme = readChoice('theme', ['light', 'dark', 'system'], 'system')
    if (theme !== 'system') root.dataset.theme = theme

    // Looks only apply in light mode; 'brutal' is the stylesheet's base and needs no attribute.
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
    const showingDark = theme === 'dark' || (theme === 'system' && systemDark)
    const look = readChoice('look', ['braun', 'brutal', 'glass', 'paper'], 'braun')
    if (!showingDark && look !== 'brutal') root.dataset.look = look
  } catch {
    // No storage access: the page still works with its defaults.
  }
}

/** The boot code as an inline script body. */
export const THEME_BOOT_SCRIPT = `(${bootTheme.toString()})()`

/** Vite plugin that inlines the boot script at the very top of <head>. */
export function themeBootPlugin() {
  return {
    name: 'style-standards-theme-boot',
    transformIndexHtml() {
      return [{ tag: 'script', children: THEME_BOOT_SCRIPT, injectTo: 'head-prepend' }]
    },
  }
}
