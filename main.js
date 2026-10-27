// The style kit first, so the app's own styles can build on and override it.
import "./src/ui/standard.css";
import "./src/styles/legacy.css";
import "./style.css";
import "./polish.css";

// Keeps the light-mode look (Braun) applied when the theme changes while the app runs.
// ThemeToggle only loads the theme state, so the look state has to be loaded explicitly.
import "./src/ui/useLook.js";

import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import App from "/src/components/App.vue";

// Import components for the routes
import Home from "/src/pages/Home.vue";
import Stats from "/src/pages/Stats.vue";

import { TipRepository } from "./src/scripts/TipRepository";
import { TipStore } from "./src/scripts/TipStore";
import { TipGrouper } from "./src/scripts/TipGrouper";
import { BackupService } from "./src/scripts/BackupService";

import { setThemeColorFromLocalStorage } from "./src/scripts/ColorTheme";
setThemeColorFromLocalStorage();

// Load tips from localStorage, sort by date, then load into allTips
const loadedTips = TipRepository.loadAllFromStorage();
TipRepository.saveAllToStorage(loadedTips);
TipGrouper.sortAllTipsByDate(loadedTips);
TipStore.setAllTips(loadedTips);

// Group allTips into pay periods for groupedTips
const groupedTips = TipGrouper.groupByPeriod(loadedTips);
TipStore.setGroupedTips(groupedTips);

// Define routes
const routes = [
  { path: "/", component: Home, name: "home" },
  { path: "/stats", component: Stats, name: "stats" },
];

// Create the router instance
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Create the Vue app
const app = createApp(App);

// Use the router in the app
app.use(router);

// Mount the app
app.mount("#app");

// Back up tips to the home server once an hour. Only sends when on the home
// network, no backup was created today, and the tips changed since the last save.
BackupService.start();
