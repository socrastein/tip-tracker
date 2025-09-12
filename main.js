import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from '/src/components/App.vue';

// Import components for the routes
import Home from '/src/pages/Home.vue';
import Stats from '/src/pages/Stats.vue';

import { TipRepository } from './src/scripts/TipRepository';
import { TipStore } from './src/scripts/TipStore';
import { TipGrouper } from './src/scripts/TipGrouper';

import "./style.css";
import "./polish.css";

import { setThemeColorFromLocalStorage } from './src/scripts/ColorTheme';
import { TipAnalyzer } from './src/scripts/TipAnalyzer';
setThemeColorFromLocalStorage();

// Load tips from localStorage, sort by date, then load into allTips
const loadedTips = TipRepository.loadAllFromStorage();
TipGrouper.sortAllTipsByDate(loadedTips);
TipStore.setAllTips(loadedTips);

// Group allTips into pay periods for groupedTips
const groupedTips = TipGrouper.groupByPeriod(loadedTips);
TipStore.setGroupedTips(groupedTips);

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