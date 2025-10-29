import { createIcons, icons } from 'lucide';

export class ToastService {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      console.error('Toast container not found!');
    }
  }

  show(message, type = 'info', duration = 8000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
      success: 'check-circle',
      danger: 'alert-circle',
      info: 'info'
    };

    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}"></i>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);
    createIcons({ icons });

    // Set animation duration dynamically based on JS duration
    const animationDuration = duration / 1000; // convert to seconds
    const fadeOutDelay = animationDuration - 0.5; // 0.5s is the fade-in/out time
    toast.style.animation = `toast-in 0.5s ease, toast-out 0.5s ease ${fadeOutDelay}s forwards`;


    setTimeout(() => {
      // Check if the element is still in the DOM before trying to remove it
      if (toast.parentNode) {
        toast.remove();
      }
    }, duration);
  }
}

export const toastService = new ToastService();
