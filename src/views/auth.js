import { createIcons, icons } from 'lucide';

export class AuthView {
  constructor(authService) {
    this.authService = authService;
    this.onLogin = null;
    this.isLogin = true;
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1><i data-lucide="truck"></i> Gerencial Fretes</h1>
            <p id="auth-subtitle">Entre para gerenciar seus fretes</p>
          </div>
          
          <div id="auth-alert"></div>
          
          <form id="auth-form">
            <input type="hidden" id="invite-admin-id" value="">
            <div id="register-fields" class="hidden">
              <div class="form-group">
                <label class="form-label">Nome Completo</label>
                <input type="text" class="form-input" id="name" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input type="tel" class="form-input" id="phone" required>
              </div>
              
              <div class="form-group hidden" id="perfil-group">
                <label class="form-label">Perfil</label>
                <select class="form-select" id="perfil" required>
                  <option value="">Selecione...</option>
                  <option value="admin">Administrador</option>
                  <option value="motorista">Motorista</option>
                </select>
              </div>
              
              <div class="form-group hidden" id="admin-select-group">
                <label class="form-label">Administrador Responsável</label>
                <select class="form-select" id="adminVinculado">
                  <option value="">Selecione...</option>
                </select>
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
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.handleInvite();
    createIcons({ icons });
  }

  handleInvite() {
    const params = new URLSearchParams(window.location.search);
    const adminId = params.get('invite_admin_id');

    if (adminId) {
      const allUsers = this.authService.getAllUsers();
      const admin = allUsers.find(u => u.id === adminId && u.perfil === 'admin');

      if (admin) {
        this.toggleMode(false);
        document.getElementById('auth-toggle').classList.add('hidden');
        document.getElementById('perfil-group').classList.add('hidden');
        document.getElementById('perfil').value = 'motorista';
        document.getElementById('admin-select-group').classList.add('hidden');
        document.getElementById('invite-admin-id').value = adminId;
        document.getElementById('auth-subtitle').innerHTML = `Cadastro de motorista para <strong>${admin.nome}</strong>`;
      }
    } else {
      document.getElementById('perfil-group').classList.remove('hidden');
    }
  }

  setupEventListeners() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('toggle-link');

    toggleLink.addEventListener('click', () => {
      this.toggleMode(!this.isLogin);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.isLogin) {
        this.handleLogin();
      } else {
        this.handleRegister();
      }
    });

    const perfilSelect = document.getElementById('perfil');
    perfilSelect.addEventListener('change', (e) => {
      const adminGroup = document.getElementById('admin-select-group');
      if (e.target.value === 'motorista') {
        adminGroup.classList.remove('hidden');
        this.loadAdmins();
      } else {
        adminGroup.classList.add('hidden');
      }
    });
  }

  toggleMode(isLogin) {
    this.isLogin = isLogin;
    const registerFields = document.getElementById('register-fields');
    const submitText = document.getElementById('submit-text');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const subtitle = document.getElementById('auth-subtitle');

    if (this.isLogin) {
      registerFields.classList.add('hidden');
      submitText.textContent = 'Entrar';
      toggleText.textContent = 'Não tem uma conta?';
      toggleLink.textContent = 'Cadastre-se';
      subtitle.textContent = 'Entre para gerenciar seus fretes';
    } else {
      registerFields.classList.remove('hidden');
      submitText.textContent = 'Cadastrar';
      toggleText.textContent = 'Já tem uma conta?';
      toggleLink.textContent = 'Entrar';
      subtitle.textContent = 'Crie sua conta - 7 dias grátis';
    }
  }

  loadAdmins() {
    const users = this.authService.getAllUsers();
    const admins = users.filter(u => u.perfil === 'admin');
    const select = document.getElementById('adminVinculado');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    admins.forEach(admin => {
      const option = document.createElement('option');
      option.value = admin.id;
      option.textContent = admin.nome;
      select.appendChild(option);
    });
  }

  handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const result = this.authService.login(email, password);

    if (result.success) {
      this.showAlert('Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        if (this.onLogin) this.onLogin();
      }, 1000);
    } else {
      this.showAlert(result.error, 'danger');
    }
  }

  handleRegister() {
    const inviteAdminId = document.getElementById('invite-admin-id').value;
    
    const userData = {
      nome: document.getElementById('name').value,
      email: document.getElementById('email').value,
      telefone: document.getElementById('phone').value,
      perfil: document.getElementById('perfil').value,
      password: document.getElementById('password').value
    };

    if (inviteAdminId) {
      userData.adminVinculado = inviteAdminId;
      userData.perfil = 'motorista';
    } else if (userData.perfil === 'motorista') {
      userData.adminVinculado = document.getElementById('adminVinculado').value;
      if (!userData.adminVinculado) {
        this.showAlert('Selecione um administrador responsável', 'danger');
        return;
      }
    }

    const result = this.authService.register(userData);

    if (result.success) {
      this.showAlert('Cadastro realizado com sucesso! Você será redirecionado.', 'success');
      setTimeout(() => {
        if (this.onLogin) this.onLogin();
      }, 1500);
    } else {
      this.showAlert(result.error, 'danger');
    }
  }

  showAlert(message, type) {
    const alertDiv = document.getElementById('auth-alert');
    alertDiv.innerHTML = `
      <div class="alert alert-${type}">
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        ${message}
      </div>
    `;
    createIcons({ icons });
  }
}
