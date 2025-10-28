import './style.css';
import { createIcons, icons } from 'lucide';
import { App } from './src/app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  
  createIcons({ icons });
});
