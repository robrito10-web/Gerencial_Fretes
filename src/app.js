import { AuthService } from './services/auth.js';
import { AuthView } from './views/auth.js';
import { DashboardView } from './views/dashboard.js';
import { Router } from './router.js';

export class App {
  constructor() {
    this.authService = new AuthService();
    this.router = new Router(this);
  }

  init() {
    this.router.setHandler(this.handleRoute.bind(this));
    this.router.start();
  }

  handleRoute() {
    const path = window.location.pathname;
    const user = this.authService.getCurrentUser();

    if (user) {
      // User is logged in
      if (path === '/') {
        // If they are on the root/login page, redirect to dashboard
        this.router.replace('/dashboard');
      } else {
        // For any other authenticated page, show the dashboard
        this.showDashboard();
      }
    } else {
      // User is not logged in
      // Allow access only to the root path (which handles login and invites)
      if (path !== '/') {
        this.router.replace('/');
      } else {
        this.showAuthView();
      }
    }
  }

  showAuthView() {
    const authView = new AuthView(this.authService);
    authView.render();
    authView.onLogin = () => {
      // After login, navigate to the dashboard
      this.router.navigate('/dashboard');
    };
  }

  showDashboard() {
    const user = this.authService.getCurrentUser();
    // The router guard ensures user exists, but we double-check.
    if (!user) {
      this.handleRoute(); // Re-evaluate route if user is suddenly gone
      return;
    }

    const dashboardView = new DashboardView(user);
    dashboardView.render();
    
    dashboardView.onLogout = () => {
      this.logout();
    };
  }

  logout() {
    this.authService.logout();
    // Navigate to login page after logout
    this.router.navigate('/');
  }
}
