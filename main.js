import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import { TipMemory } from './src/scripts/TipMemory';
import { setThemeColorFromLocalStorage } from './src/scripts/ColorTheme';


import "./style.css";
import "./polish.css";

import App from '/src/components/App.vue';

// Import components for the routes
import Home from '/src/pages/Home.vue';
import Stats from '/src/pages/Stats.vue';

setThemeColorFromLocalStorage();

// Check for tipTracker(version 1.0) key in local storage,
// indicating that storage has already been scanned for legacy tips
// and upgraded to the latest format

const upgradeNeeded = TipMemory.isUpgradeNeeded();
if (upgradeNeeded) {
    TipMemory.upgradeToLatest();
} else {
    TipMemory.loadAllTipsFromStorage();
}

// TipMemory.logAllTipsToConsole();
TipMemory.sortAllTipsByDate();
TipMemory.initializeGroups();

// Define routes
const routes = [
    { path: '/', component: Home, name: 'home' },
    { path: '/stats', component: Stats, name: 'stats' },
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
app.mount('#app');