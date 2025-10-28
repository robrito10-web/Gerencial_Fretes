export class Router {
  constructor(app) {
    this.app = app;
    this.handler = null;
    window.addEventListener('popstate', () => this.resolve());
  }

  setHandler(handler) {
    this.handler = handler;
  }

  navigate(path) {
    if (window.location.pathname === path) {
      this.resolve();
      return;
    }
    window.history.pushState({}, path, window.location.origin + path);
    this.resolve();
  }

  replace(path) {
    window.history.replaceState({}, path, window.location.origin + path);
    this.resolve();
  }

  resolve() {
    if (this.handler) {
      this.handler();
    }
  }

  start() {
    this.resolve();
  }
}
