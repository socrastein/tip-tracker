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

import { preparePackCelebrations } from "./src/scripts/CelebrationPackRuntime";
import { syncCelebrationPack } from "./src/scripts/CelebrationPackSync";
import { configureGifSource, getGifPreloader } from "./src/scripts/GifPreloader";
import { createGiphyGifSource } from "./src/scripts/GiphyGifSource";
import { prepareCustomCelebration } from "./src/scripts/CustomCelebrationRuntime";
import { celebrationSetupRouteGuard, isCelebrationsLive } from "./src/scripts/CelebrationsLive";
import { startCelebrationFeatures } from "./src/scripts/CelebrationsLifecycle";
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

// Celebrations are a surprise: until the home server has said they are live
// (see src/scripts/CelebrationsLive.ts) nothing below runs and nothing shows.
// When live: the custom celebration and the downloaded pack are decoded in the
// background so they can start instantly later (nothing plays here), and GIFs
// are switched on only when a GIPHY key was given at build time (see README);
// the first GIF loads now so it is ready when a big tip is logged. Without a
// key nothing is fetched. Going live or dark later at a check-in applies the same way.
const gifApiKey = import.meta.env.VITE_GIF_API_KEY;
startCelebrationFeatures({
  prepareCustom: () => prepareCustomCelebration(),
  preparePack: () => preparePackCelebrations(),
  startGifs: () => {
    if (!gifApiKey) return;
    configureGifSource(createGiphyGifSource(gifApiKey));
    getGifPreloader().preloadNext();
  },
  stopGifs: () => configureGifSource(null),
});

// Define routes
const routes = [
  { path: "/", component: Home, name: "home" },
  { path: "/stats", component: Stats, name: "stats" },
  {
    path: "/celebration-setup",
    component: CelebrationSetup,
    name: "celebrationSetup",
    // Dark: the page does not exist for her (a typed address goes Home).
    beforeEnter: celebrationSetupRouteGuard,
  },
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
if (isDeployedApp) {
  // Each time the home server is verified, quietly bring the celebration pack
  // up to date (in the background, one file at a time, never during a celebration).
  BackupService.onHomeServerVerified = () => {
    syncCelebrationPack({
      serverUrl: BackupService.getServerUrl(),
      fetchWithTimeout: (url, timeoutMs) => BackupService._fetchWithTimeout(url, undefined, timeoutMs),
      // While dark the pack is only stored, never decoded (no audio work).
      onChanged: () => {
        if (isCelebrationsLive()) preparePackCelebrations();
      },
    });
  };
  BackupService.start();
}
