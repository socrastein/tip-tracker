<script setup>
import { RouterLink } from "vue-router";
import ColorThemeMenu from "../components/ColorThemeMenu.vue";
import ThemeToggle from "../ui/ThemeToggle.vue";
import { BackupService } from "../scripts/BackupService";

const emit = defineEmits(["close"]);

// This component is remounted each time the menu opens (v-if in NavBar),
// so a plain read is always fresh.
const lastBackup = BackupService.getLastBackupInfo();

function formatBackupTime(time) {
  const monthDay = time.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${monthDay} @ ${clock}`;
}
</script>

<template>
  <transition name="fade-slide" appear>
    <div class="menuContainer">
      <router-link class="navLink" to="/" @click="() => $emit('close')"
        >Home</router-link
      >
      <router-link class="navLink" to="/stats" @click="() => $emit('close')"
        >Stats Page</router-link
      >
      <ColorThemeMenu />
      <ThemeToggle />
      <div v-if="lastBackup" class="lastSaved">
        <span>Last saved: {{ lastBackup.count }} tips</span>
        <span>{{ formatBackupTime(lastBackup.time) }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Add your component-specific styles here */
.menuContainer {
  position: fixed;
  right: 0;
  top: 60px;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-left: auto;
  align-items: flex-end;

  width: min(70%, 16rem);
  padding: 1rem;
  border: solid 1px var(--accentFull);
  border-radius: 0.5rem;

  background: var(--surfacePanel);

  z-index: 1000;
}

/* Not "menuItem": the style kit already has a .menuItem class */
.navLink {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 8rem;
  height: 2rem;
  padding: 0;
  border: solid 1px var(--accentFull);
  border-radius: 0.5rem;
  background-color: var(--surfacePanel);
  font-weight: bold;
}

.lastSaved {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;

  font-size: 0.75rem;
  color: var(--textMuted);
  text-align: center;
}
</style>
