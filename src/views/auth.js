import { createIcons, icons } from 'lucide';

export class AuthView {
  constructor(authService, toastService) {
    this.authService = authService;
    this.toastService = toastService;
    this.isLogin = true;
  }

  render() {
    const app = document.getElementById('app');
    
    app.innerHTML = this.getAuthLayout(`
      <div class="auth-header">
        <h1><i data-lucide="truck"></i> Gerencial Fretes</h1>
        <p id="auth-subtitle">Entre para gerenciar seus fretes</p>
      </div>
      <form id="auth-form">
        <div id="register-fields" class="hidden">
          <div class="form-group">
            <label class="form-label">Nome Completo</label>
            <input type="text" class="form-input" id="name" required>
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input type="tel" class="form-input" id="phone" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="email" required>
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" class="form-input" id="password" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">
          <i data-lucide="log-in"></i>
          <span id="submit-text">Entrar</span>
        </button>
      </form>
      <div class="auth-toggle">
        <span id="toggle-text">Não tem uma conta?</span>
        <a id="toggle-link">Cadastre-se</a>
      </div>
    `);

    this.setupEventListeners();
    createIcons({ icons });
  }

  getAuthLayout(innerContent) {
    return `
      <div class="auth-container">
        <div class="auth-card">
          ${innerContent}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('toggle-link');
    if (!form || !toggleLink) return;

    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMode(!this.isLogin);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const button = e.target.querySelector('button[type="submit"]');
      this.setLoading(button, true);
      
      if (this.isLogin) {
        this.handleLogin().finally(() => this.setLoading(button, false));
      } else {
        this.handleRegister().finally(() => this.setLoading(button, false));
      }
    });
  }

  toggleMode(isLogin) {
    this.isLogin = isLogin;
    const registerFields = document.getElementById('register-fields');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const subtitle = document.getElementById('auth-subtitle');
    const form = document.getElementById('auth-form');
    const button = form.querySelector('button[type="submit"]');

    if (this.isLogin) {
      registerFields.classList.add('hidden');
      toggleText.textContent = 'Não tem uma conta?';
      toggleLink.textContent = 'Cadastre-se';
      subtitle.textContent = 'Entre para gerenciar seus fretes';
    } else {
      registerFields.classList.remove('hidden');
      toggleText.textContent = 'Já tem uma conta?';
      toggleLink.textContent = 'Entrar';
      subtitle.textContent = 'Crie sua conta de Administrador';
    }

    this._updateAuthButton(button);
  }

  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const result = await this.authService.login(email, password);

    if (result.success) {
      this.toastService.show('Login realizado com sucesso! Redirecionando...', 'success');
      // The App.js onAuthStateChange will handle the redirect
    } else {
      this.toastService.show(result.error, 'danger');
    }
  }

  async handleRegister() {
    const userData = {
      nome: document.getElementById('name').value,
      email: document.getElementById('email').value,
      telefone: document.getElementById('phone').value,
      password: document.getElementById('password').value
    };
    
    if (userData.password.length < 6) {
        this.toastService.show('A senha deve ter pelo menos 6 caracteres.', 'danger');
        return;
    }

    const result = await this.authService.register(userData);

    if (result.success) {
      this.toastService.show('Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
      // The App.js onAuthStateChange will handle redirect after email confirmation
    } else {
      this.toastService.show(result.error, 'danger');
    }
  }

  _updateAuthButton(button) {
    if (!button) return;
    const icon = this.isLogin ? 'log-in' : 'user-plus';
    const text = this.isLogin ? 'Entrar' : 'Cadastrar';
    button.innerHTML = `<i data-lucide="${icon}"></i><span id="submit-text">${text}</span>`;
    createIcons({ icons });
  }

  setLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.disabled = true;
      button.innerHTML = `<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>`;
    } else {
      button.disabled = false;
      this._updateAuthButton(button);
    }
  }
}
