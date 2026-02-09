/**
 * main.ts
 * 
 * Ponto de entrada da aplicação Vue 3
 * 
 * Inicializa:
 * - Vue app
 * - Tailwind CSS (via style.css)
 * - Mapbox GL CSS (via index.html)
 */

import { createApp } from 'vue';
import App from './App.vue';
import './assets/style.css';

const app = createApp(App);

app.mount('#app');
