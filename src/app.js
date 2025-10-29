import { AuthService } from './services/auth.js';
import { AuthView } from './views/auth.js';
import { DashboardView } from './views/dashboard.js';
import { Router } from './router.js';

export class App {
  constructor() {
    this.authService = new AuthService();
    this.router = new Router(this);
    this.user = null;
    this.profile = null;
  }

  async init() {
    this.router.setHandler(this.handleRoute.bind(this));

    // Listen for auth state changes
    this.authService.onAuthStateChange(async (event, session) => {
      this.user = session?.user || null;
      if (this.user) {
        this.profile = await this.authService.getProfile(this.user.id);
      } else {
        this.profile = null;
      }
      this.router.resolve(); // Re-evaluate route on auth change
    });
  }

  async handleRoute() {
    const path = window.location.pathname;
    
    // The onAuthStateChange has already updated this.user and this.profile
    if (this.user && this.profile) {
      if (path === '/') {
        this.router.replace('/dashboard');
      } else {
        this.showDashboard();
      }
    } else {
      // User is not logged in
      if (path.startsWith('/dashboard')) {
        this.router.replace('/');
      } else {
        this.showAuthView();
      }
    }
  }

  showAuthView() {
    const authView = new AuthView(this.authService);
    authView.render();
    // onLogin is now handled by onAuthStateChange
  }

  showDashboard() {
    if (!this.user || !this.profile) {
      this.router.replace('/');
      return;
    }

    const dashboardView = new DashboardView(this.user, this.profile);
    dashboardView.render();
    
    dashboardView.onLogout = () => {
      this.logout();
    };
  }

  async logout() {
    await this.authService.logout();
    // onAuthStateChange will handle the redirection
  }
}
