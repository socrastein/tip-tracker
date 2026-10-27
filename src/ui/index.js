import BaseAlert from './BaseAlert.vue'
import BaseBadge from './BaseBadge.vue'
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
import BaseCheckbox from './BaseCheckbox.vue'
import BaseDropdown from './BaseDropdown.vue'
import BaseField from './BaseField.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import BaseRadioGroup from './BaseRadioGroup.vue'
import BaseSegmented from './BaseSegmented.vue'
import BaseSelect from './BaseSelect.vue'
import BaseTextarea from './BaseTextarea.vue'
import BaseToggle from './BaseToggle.vue'
import LookToggle from './LookToggle.vue'
import ThemeToggle from './ThemeToggle.vue'

export { useTheme } from './useTheme.js'
export { useLook } from './useLook.js'
export { persistedChoice, storageKey } from './persistedChoice.js'
export { THEME_BOOT_SCRIPT, themeBootPlugin } from './themeBoot.js'
export {
  BaseAlert, BaseBadge, BaseButton, BaseCard, BaseCheckbox, BaseDropdown, BaseField,
  BaseInput, BaseModal, BaseRadioGroup, BaseSegmented, BaseSelect, BaseTextarea, BaseToggle, LookToggle,
  ThemeToggle,
}

// Optional: app.use(StyleStandards) registers every component globally.
const components = {
  BaseAlert, BaseBadge, BaseButton, BaseCard, BaseCheckbox, BaseDropdown, BaseField,
  BaseInput, BaseModal, BaseRadioGroup, BaseSegmented, BaseSelect, BaseTextarea, BaseToggle, LookToggle,
  ThemeToggle,
}
export default {
  install(app) {
    for (const [name, component] of Object.entries(components)) app.component(name, component)
  },
}
