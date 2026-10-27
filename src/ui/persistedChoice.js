import { ref, watch } from 'vue'

const isBrowser = typeof window !== 'undefined'

/**
 * Reads a per-project setting from an attribute on <html>, such as
 * data-storage-prefix="tipTracker" or data-default-theme="dark".
 * Settings live in the project's HTML, so syncing the kit never overwrites them.
 */
function rootSetting(attributeName) {
  if (!isBrowser) return null
  return document.documentElement.getAttribute(attributeName)
}

/**
 * The localStorage key for a saved choice: "theme", or "tipTracker.theme" when the page
 * sets data-storage-prefix="tipTracker". Projects hosted on one origin (every
 * socrastein.github.io site) share localStorage, so a prefix keeps their choices apart.
 *
 * Keep in sync with bootTheme() in themeBoot.js, which repeats this rule.
 */
export function storageKey(name) {
  const prefix = rootSetting('data-storage-prefix')
  return prefix ? `${prefix}.${name}` : name
}

/** Returns the stored value if it is one of `allowed`, otherwise the fallback. */
function readStored(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key)
    return allowed.includes(value) ? value : fallback
  } catch {
    // localStorage throws in some private windows and when storage is blocked.
    return fallback
  }
}

/**
 * Saves a choice. The default itself is never stored: removing the key means "use the
 * default", so a project that changes its default reaches everyone who never chose.
 */
function save(key, value, fallback) {
  try {
    if (value === fallback) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Same as above: the choice still works for this page view, it just isn't remembered.
  }
}

/**
 * A user choice (theme, look, ...) that is remembered per device.
 *
 * name:           storage name, and the suffix of its default attribute (data-default-<name>)
 * allowed:        every valid value; anything else found in storage is ignored
 * builtInDefault: used when the page doesn't set data-default-<name>
 *
 * Returns { choice, fallback }: `choice` is a writable ref that saves itself, `fallback` is
 * the default in effect for this page. Call once per name at module level so every caller
 * shares the same ref.
 */
export function persistedChoice(name, allowed, builtInDefault) {
  const key = storageKey(name)
  const projectDefault = rootSetting(`data-default-${name}`)
  const fallback = allowed.includes(projectDefault) ? projectDefault : builtInDefault

  const initial = isBrowser ? readStored(key, allowed, fallback) : fallback
  const choice = ref(initial)
  if (isBrowser) watch(choice, (value) => save(key, value, fallback))

  return { choice, fallback }
}
