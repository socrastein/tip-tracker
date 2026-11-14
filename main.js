import "./style.css";
import "./polish.css";

import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import App from "/src/components/App.vue";

// Import components for the routes
import Home from "/src/pages/Home.vue";
import Stats from "/src/pages/Stats.vue";
import CelebrationSetup from "/src/pages/CelebrationSetup.vue";

import { TipRepository } from "./src/scripts/TipRepository";
import { TipStore } from "./src/scripts/TipStore";
import { TipGrouper } from "./src/scripts/TipGrouper";
import { BackupService } from "./src/scripts/BackupService";

import { configureGifSource, getGifPreloader } from "./src/scripts/GifPreloader";
import { createGiphyGifSource } from "./src/scripts/GiphyGifSource";
import { prepareCustomCelebration } from "./src/scripts/CustomCelebrationRuntime";
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

// Get the custom celebration (if one is set up on this device) ready in the
// background so it can start instantly later. Nothing plays here.
prepareCustomCelebration();

// Celebration GIFs: switched on only when a GIPHY key was given at build time
// (see README); without one nothing is fetched. The first GIF loads in the
// background now so it is ready when a big tip is logged.
const gifApiKey = import.meta.env.VITE_GIF_API_KEY;
if (gifApiKey) {
  configureGifSource(createGiphyGifSource(gifApiKey));
  getGifPreloader().preloadNext();
}

// Define routes
const routes = [
  { path: "/", component: Home, name: "home" },
  { path: "/stats", component: Stats, name: "stats" },
  { path: "/celebration-setup", component: CelebrationSetup, name: "celebrationSetup" },
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
//
// Only from the deployed app: each backup becomes the newest archive on the home server (the
// one the app restores from), so a dev or test copy on the LAN must never send its tips.
const isDeployedApp = window.location.hostname === "socrastein.github.io";
if (isDeployedApp) BackupService.start();
