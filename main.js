import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import "./style.css";

import App from '/src/components/App.vue';
import Home from '/src/pages/Home.vue';
import Menu from '/src/pages/Menu.vue';
import History from '/src/pages/History.vue';

// Import components for the routes

// Define routes
const routes = [
    { path: '/', component: Home, name: 'home' },
    { path: '/menu', component: Menu, name: 'menu' },
    { path: '/history', component: History, name: 'history' },
];

// Create the router instance
const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Create the Vue app
const app = createApp(App);

// Use the router in the app
app.use(router);

// Mount the app
app.mount('#app');