import { AuthService } from './services/auth.js';
import { AuthView } from './views/auth.js';
import { DashboardView } from './views/dashboard.js';
import { Router } from './router.js';
import { toastService } from './components/toast.js';

export class App {
  constructor() {
    this.authService = new AuthService();
    this.router = new Router(this);
    this.user = null;
    this.profile = null;
    this.toastService = toastService;
  }

  async init() {
    this.router.setHandler(this.handleRoute.bind(this));

    // Listen for auth state changes
    this.authService.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
      
      // Defer async profile fetching to prevent deadlocks
      setTimeout(async () => {
        if (this.user) {
          this.profile = await this.authService.getProfile(this.user.id);
        } else {
          this.profile = null;
        }
        // Re-evaluate route after profile is fetched
        this.router.resolve();
      }, 0);
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
    const authView = new AuthView(this.authService, this.toastService);
    authView.render();
    // onLogin is now handled by onAuthStateChange
  }

  showDashboard() {
    if (!this.user || !this.profile) {
      this.router.replace('/');
      return;
    }

    const dashboardView = new DashboardView(this.user, this.profile, this.toastService);
    dashboardView.render();
    
    dashboardView.onLogout = () => {
      this.logout();
    };
  }

  async logout() {
    await this.authService.logout();
    this.toastService.show('Você saiu com sucesso.', 'info');
    // onAuthStateChange will handle the redirection
  }
}
