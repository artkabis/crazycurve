import './style.css';
import { App } from './app.ts';

const container = document.getElementById('app');
if (!container) throw new Error('#app element not found');

new App().init(container);
