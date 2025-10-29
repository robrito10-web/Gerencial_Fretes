import { createIcons, icons } from 'lucide';
import { DataService } from '../services/data.js';
import { AuthService } from '../services/auth.js';

export class DashboardView {
  constructor(user, profile, toastService) {
    this.user = user;
    this.profile = profile;
    this.toastService = toastService;
    this.authService = new AuthService();
    
    this.viewingUser = this.profile.perfil === 'dev' ? null : this.profile;
    this.dataService = new DataService();
    this.currentPage = 'dashboard';
    this.onLogout = null;
    this.appElement = document.getElementById('app');
    this.dashboardFilters = { status: 'todos', startDate: '', endDate: '' };
  }

  _formatCurrency(value) {
    const number = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  }

  _formatNumber(value) {
    const number = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR').format(number);
  }

  _formatDecimal(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return '0,0000';
    }
    return String(value).replace('.', ',');
  }

  _formatDate(dateString) {
    if (!dateString) return 'N/A';
    const datePart = dateString.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateString; // Fallback
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  render() {
    this.appElement.innerHTML = `
      <div id="sidebar" class="sidebar">
        <div class="sidebar-header">
          <h3>Menu</h3>
          <button class="icon-btn" data-action="toggle-sidebar">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="sidebar-content">
          ${this._renderNavLinks(true)}
        </div>
      </div>
      <div id="sidebar-overlay" class="sidebar-overlay" data-action="toggle-sidebar"></div>

      <nav class="navbar">
        <div class="container navbar-content">
          <div class="navbar-left">
            <button class="icon-btn menu-toggle" data-action="toggle-sidebar">
              <i data-lucide="menu"></i>
            </button>
            <div class="navbar-brand">
              <i data-lucide="truck"></i>
              Gerencial Fretes
            </div>
          </div>
          <div class="navbar-menu">
            <span class="navbar-user-info">
              ${this.profile.nome} (${this.profile.perfil})
            </span>
            <button class="btn btn-sm btn-danger" data-action="logout">
              <i data-lucide="log-out"></i>
              <span class="logout-text">Sair</span>
            </button>
          </div>
        </div>
      </nav>
      
      <div class="main-content">
        <div class="container">
          ${this._renderDevPanel()}
          <div id="page-content-wrapper"></div>
        </div>
      </div>
      
      ${this._renderAllModals()}
    `;

    this._setupEventListeners();
    this.renderPageWrapper();
    createIcons({ icons });
  }

  async renderPageWrapper() {
    const wrapper = document.getElementById('page-content-wrapper');
    wrapper.innerHTML = `
        ${this._renderTabs()}
        <div id="page-content">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    createIcons({icons});

    const pageContent = document.getElementById('page-content');

    if (this.profile.perfil === 'dev') {
        if (this.viewingUser) {
            // Dev is viewing a specific admin
            await this.renderPage(this.currentPage);
        } else {
            // Dev is not viewing anyone, show overview
            await this.renderDevOverview(pageContent);
        }
    } else if (this.viewingUser) {
        // Non-dev user (admin or driver)
        await this.renderPage(this.currentPage);
    } else {
        // Fallback
        pageContent.innerHTML = '<div class="alert alert-danger">Erro: Nenhum usuário para visualizar.</div>';
    }
  }

  async renderDevOverview(content) {
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const allProfiles = await this.authService.getAllProfiles();

    const admins = allProfiles.filter(p => p.perfil === 'admin');
    const drivers = allProfiles.filter(p => p.perfil === 'motorista');

    content.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Visão Geral do Sistema (DEV)</h2>
            <p class="page-subtitle">Abaixo está um resumo de todos os usuários no sistema. Use o seletor no painel DEV acima para visualizar os dados de um administrador específico.</p>
        </div>
        
        <div class="grid grid-2">
            <div class="card">
                <h3>Administradores (${admins.length})</h3>
                <div class="table-container mt-2">
                    <table class="table">
                        <thead><tr><th>Nome</th><th>Email</th><th>Cadastrado em</th></tr></thead>
                        <tbody>
                            ${admins.map(admin => `
                                <tr>
                                    <td>${admin.nome}</td>
                                    <td>${admin.email}</td>
                                    <td>${this._formatDate(admin.created_at)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" class="text-center p-4">Nenhum administrador encontrado.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <h3>Motoristas (${drivers.length})</h3>
                <div class="table-container mt-2">
                    <table class="table">
                        <thead><tr><th>Nome</th><th>Email</th><th>Cadastrado em</th></tr></thead>
                        <tbody>
                            ${drivers.map(driver => `
                                <tr>
                                    <td>${driver.nome}</td>
                                    <td>${driver.email}</td>
                                    <td>${this._formatDate(driver.created_at)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" class="text-center p-4">Nenhum motorista encontrado.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    createIcons({ icons });
  }

  _renderDevPanel() {
    if (this.profile.perfil !== 'dev') return '';
    // This will be populated asynchronously
    return `
      <div class="card" style="background-color: var(--warning); border: 2px solid #d97706; color: #92400e;">
        <div class="flex-between">
          <div class="flex gap-2">
            <i data-lucide="shield-alert"></i>
            <h3>Painel DEV</h3>
          </div>
          <div class="form-group" style="margin-bottom: 0; min-width: 300px;">
            <label class="form-label" style="font-weight: 700;">Visualizando dados do Administrador:</label>
            <select class="form-select" id="dev-admin-selector">
              <option value="">Carregando...</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  async _populateDevPanel() {
    if (this.profile.perfil !== 'dev') return;
    const selector = document.getElementById('dev-admin-selector');
    if (!selector) return;

    const admins = await this.authService.getAllAdmins();
    selector.innerHTML = '<option value="">Visão Geral do Sistema</option>' +
      admins.map(admin => `<option value="${admin.id}" ${this.viewingUser?.id === admin.id ? 'selected' : ''}>${admin.nome} (${admin.email})</option>`).join('');
  }

  _renderNavLinks(isSidebar = false) {
    if (!this.viewingUser && this.profile.perfil !== 'dev') return '';

    const isViewingAdmin = this.viewingUser?.perfil === 'admin';
    const isDev = this.profile.perfil === 'dev';
    const buttonClass = isSidebar ? 'sidebar-link' : 'tab';

    const links = [
      { page: 'dashboard', icon: 'layout-dashboard', text: 'Dashboard', adminOnly: false },
      { page: 'cycles', icon: 'refresh-cw', text: 'Ciclos', adminOnly: false },
      { page: 'cadastros', icon: 'database', text: 'Cadastros', adminOnly: true },
      { page: 'motoristas', icon: 'users', text: 'Motoristas', adminOnly: true },
      { page: 'config', icon: 'settings', text: 'Configurações', adminOnly: true }
    ];

    if (!this.viewingUser && isDev) {
        return ''; // Don't show nav links if dev hasn't selected an admin to view
    }

    return links
      .filter(link => !link.adminOnly || isViewingAdmin || (isDev && this.viewingUser))
      .map(link => `
        <button class="${buttonClass} ${this.currentPage === link.page ? 'active' : ''}" data-action="switch-page" data-page="${link.page}">
          <i data-lucide="${link.icon}"></i>
          <span>${link.text}</span>
        </button>
      `).join('');
  }

  _renderTabs() {
    if (!this.viewingUser && this.profile.perfil !== 'dev') return '';
    return `
      <div class="tabs" id="main-tabs">
        ${this._renderNavLinks(false)}
      </div>
    `;
  }

  _renderAllModals() {
    return `
      <div id="cycle-modal" class="modal"></div>
      <div id="cycle-details-modal" class="modal"></div>
      <div id="register-driver-modal" class="modal"></div>
      <div id="permissions-modal" class="modal"></div>
      <div id="car-modal" class="modal"></div>
      <div id="tire-brand-modal" class="modal"></div>
      <div id="freight-modal" class="modal"></div>
      <div id="fueling-modal" class="modal"></div>
      <div id="expense-modal" class="modal"></div>
    `.replace(/<div id="([^"]+)" class="modal"><\/div>/g, (match, id) => {
        const modalContent = this.getModalContentById(id);
        return `<div id="${id}" class="modal">${modalContent}</div>`;
    });
  }

  getModalContentById(id) {
    switch(id) {
        case 'cycle-modal':
            return `<div class="modal-content"><div class="modal-header"><h2 id="cycle-modal-title">Novo Ciclo</h2><button class="icon-btn" data-action="close-modal" data-modal-id="cycle-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="cycle-form"><input type="hidden" id="cycle-id"><div class="form-group"><label class="form-label">Descrição do Ciclo</label><input type="text" class="form-input" id="cycle-descricao" required></div><div class="form-group"><label class="form-label">Motorista</label><select class="form-select" id="cycle-driver" required></select><div class="text-right mt-1"><a href="#" class="link-discreet" data-action="go-to-page" data-page="motoristas"><i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Cadastrar Motorista</a></div></div><div class="form-group"><label class="form-label">Carro</label><select class="form-select" id="cycle-car" required></select><div class="text-right mt-1"><a href="#" class="link-discreet" data-action="go-to-page" data-page="cadastros" data-sub-page="cars"><i data-lucide="plus" style="width: 14px; height: 14px;"></i> Cadastrar Carro</a></div></div><div class="form-group"><label class="form-label">Data da Saída</label><input type="date" class="form-input" id="cycle-date" required></div><div class="form-group"><label class="form-label">Quilometragem da Saída</label><div class="input-with-icon"><input type="number" class="form-input" id="cycle-km" step="any" required><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="cycle-photo"><i data-lucide="camera"></i></button></div><input type="file" id="cycle-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="cycle-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="cycle-photo"><i data-lucide="x"></i></button></div></div><div class="form-group"><label class="form-label">Status</label><select class="form-select" id="cycle-status" required><option value="aberto" selected>Aberto</option><option value="fechado">Fechado</option></select></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="cycle-modal">Cancelar</button><button class="btn btn-primary" data-action="save-cycle">Salvar</button></div></div>`;
        case 'cycle-details-modal':
            return `<div class="modal-content" style="max-width: 1200px;"><div class="modal-header"><h2 id="cycle-details-title">Detalhes do Ciclo</h2><button class="icon-btn" data-action="close-modal" data-modal-id="cycle-details-modal"><i data-lucide="x"></i></button></div><div class="modal-body" id="cycle-details-content"><div class="loading"><div class="spinner"></div></div></div></div>`;
        case 'register-driver-modal':
            return `<div class="modal-content"><div class="modal-header"><h2>Cadastrar Novo Motorista</h2><button class="icon-btn" data-action="close-modal" data-modal-id="register-driver-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><p>Insira o nome e email do motorista. Um e-mail de convite será enviado para que ele acesse o sistema.</p><form id="register-driver-form"><div class="form-group mt-2"><label class="form-label">Nome Completo</label><input type="text" class="form-input" id="driver-register-name" required></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="driver-register-email" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="register-driver-modal">Fechar</button><button class="btn btn-primary" data-action="save-driver">Enviar Convite</button></div></div>`;
        case 'permissions-modal':
            return `<div class="modal-content"><div class="modal-header"><h2>Permissões do Motorista</h2><button class="icon-btn" data-action="close-modal" data-modal-id="permissions-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><div class="loading"><div class="spinner"></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="permissions-modal">Cancelar</button><button class="btn btn-primary" data-action="save-permissions">Salvar Permissões</button></div></div>`;
        case 'car-modal':
            return `<div class="modal-content"><div class="modal-header"><h2 id="car-modal-title">Novo Carro</h2><button class="icon-btn" data-action="close-modal" data-modal-id="car-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="car-form"><input type="hidden" id="car-id"><div class="grid grid-2"><div class="form-group"><label class="form-label">Placa</label><input type="text" class="form-input" id="car-placa" required></div><div class="form-group"><label class="form-label">Ano</label><input type="number" class="form-input" id="car-ano" required></div></div><div class="form-group"><label class="form-label">Marca</label><input type="text" class="form-input" id="car-marca" required></div><div class="form-group"><label class="form-label">Modelo</label><input type="text" class="form-input" id="car-modelo" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="car-modal">Cancelar</button><button class="btn btn-primary" data-action="save-car">Salvar</button></div></div>`;
        case 'tire-brand-modal':
            return `<div class="modal-content" style="max-width: 450px;"><div class="modal-header"><h2>Nova Marca de Pneu</h2><button class="icon-btn" data-action="close-modal" data-modal-id="tire-brand-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="tire-brand-form"><div class="form-group"><label class="form-label">Nome da Marca</label><input type="text" class="form-input" id="tire-brand-name" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="tire-brand-modal">Cancelar</button><button class="btn btn-primary" data-action="save-tire-brand">Salvar</button></div></div>`;
        case 'freight-modal':
            return `<div class="modal-content"><div class="modal-header"><h2 id="freight-modal-title">Novo Frete</h2><button class="icon-btn" data-action="close-modal" data-modal-id="freight-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="freight-form"><input type="hidden" id="freight-id"><input type="hidden" id="freight-cycle-id"><div class="form-group"><label class="form-label">Descrição</label><input type="text" id="freight-descricao" class="form-input" required></div><div class="grid grid-2"><div class="form-group"><label class="form-label">Valor do Frete (R$)</label><input type="number" id="freight-valor" class="form-input" step="0.01" required></div><div class="form-group"><label class="form-label">Comissão (%)</label><input type="number" id="freight-comissao" class="form-input" step="0.01" value="10"></div></div><div class="grid grid-2"><div class="form-group"><label class="form-label">Peso Saída (Kg)</label><input type="number" id="freight-peso-saida" class="form-input" step="0.01"></div><div class="form-group"><label class="form-label">Peso Chegada (Kg)</label><input type="number" id="freight-peso-chegada" class="form-input" step="0.01"></div></div><div class="form-group"><label class="form-label">Foto Comprovação Saída</label><div class="input-with-icon"><input type="text" class="form-input" readonly placeholder="Clique na câmera para enviar"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="freight-departure-photo"><i data-lucide="camera"></i></button></div><input type="file" id="freight-departure-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="freight-departure-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="freight-departure-photo"><i data-lucide="x"></i></button></div></div><div class="form-group"><label class="form-label">Foto Comprovação Chegada</label><div class="input-with-icon"><input type="text" class="form-input" readonly placeholder="Clique na câmera para enviar"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="freight-arrival-photo"><i data-lucide="camera"></i></button></div><input type="file" id="freight-arrival-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="freight-arrival-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="freight-arrival-photo"><i data-lucide="x"></i></button></div></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="freight-modal">Cancelar</button><button class="btn btn-primary" data-action="save-freight">Salvar Frete</button></div></div>`;
        case 'fueling-modal':
            return `<div class="modal-content"><div class="modal-header"><h2 id="fueling-modal-title">Novo Abastecimento</h2><button class="icon-btn" data-action="close-modal" data-modal-id="fueling-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="fueling-form"><input type="hidden" id="fueling-id"><input type="hidden" id="fueling-cycle-id"><div class="grid grid-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="fueling-date" class="form-input" required></div><div class="form-group"><label class="form-label">KM no Painel</label><input type="number" id="fueling-km" class="form-input" step="any" required></div></div><div class="grid grid-3"><div class="form-group"><label class="form-label">Litros</label><input type="number" id="fueling-liters" class="form-input" step="0.01" required></div><div class="form-group"><label class="form-label">Preço / Litro</label><input type="number" id="fueling-price-per-liter" class="form-input" step="0.001" required></div><div class="form-group"><label class="form-label">Valor Total</label><input type="number" id="fueling-total" class="form-input" step="0.01" required readonly style="background-color: var(--bg-tertiary);"></div></div><div class="grid grid-2"><div class="form-group"><label class="form-label">Foto do Painel (KM)</label><div class="input-with-icon"><input type="text" class="form-input" readonly placeholder="Clique na câmera para enviar"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="fueling-km-photo"><i data-lucide="camera"></i></button></div><input type="file" id="fueling-km-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="fueling-km-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="fueling-km-photo"><i data-lucide="x"></i></button></div></div><div class="form-group"><label class="form-label">Foto do Cupom Fiscal</label><div class="input-with-icon"><input type="text" class="form-input" readonly placeholder="Clique na câmera para enviar"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="fueling-receipt-photo"><i data-lucide="camera"></i></button></div><input type="file" id="fueling-receipt-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="fueling-receipt-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="fueling-receipt-photo"><i data-lucide="x"></i></button></div></div></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="fueling-modal">Cancelar</button><button class="btn btn-primary" data-action="save-fueling">Salvar Abastecimento</button></div></div>`;
        case 'expense-modal':
            return `<div class="modal-content"><div class="modal-header"><h2 id="expense-modal-title">Nova Despesa</h2><button class="icon-btn" data-action="close-modal" data-modal-id="expense-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="expense-form"><input type="hidden" id="expense-id"><input type="hidden" id="expense-cycle-id"><div class="grid grid-2"><div class="form-group"><label class="form-label">Data</label><input type="date" id="expense-date" class="form-input" required></div><div class="form-group"><label class="form-label">Valor (R$)</label><input type="number" id="expense-value" class="form-input" step="0.01" required></div></div><div class="form-group"><label class="form-label">Descrição</label><input type="text" id="expense-description" class="form-input" required></div><div class="form-group"><label class="form-label">Foto do Recibo</label><div class="input-with-icon"><input type="text" class="form-input" readonly placeholder="Clique na câmera para enviar"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="expense-receipt-photo"><i data-lucide="camera"></i></button></div><input type="file" id="expense-receipt-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="expense-receipt-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="expense-receipt-photo"><i data-lucide="x"></i></button></div></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal" data-modal-id="expense-modal">Cancelar</button><button class="btn btn-primary" data-action="save-expense">Salvar Despesa</button></div></div>`;
        default: return '';
    }
  }

  _setupEventListeners() {
    this._boundHandleAppClick = this._handleAppClick.bind(this);
    this._boundHandleAppChange = this._handleAppChange.bind(this);
    
    this.appElement.removeEventListener('click', this._boundHandleAppClick);
    this.appElement.addEventListener('click', this._boundHandleAppClick);
    
    this.appElement.removeEventListener('change', this._boundHandleAppChange);
    this.appElement.addEventListener('change', this._boundHandleAppChange);

    if (this.profile.perfil === 'dev') {
        this._populateDevPanel();
        const devSelector = this.appElement.querySelector('#dev-admin-selector');
        if (devSelector) {
            this._boundHandleDevSelect = this._handleDevSelect.bind(this);
            devSelector.removeEventListener('change', this._boundHandleDevSelect);
            devSelector.addEventListener('change', this._boundHandleDevSelect);
        }
    }
  }

  async _handleDevSelect(e) {
      const selectedAdminId = e.target.value;
      if (selectedAdminId) {
          this.viewingUser = await this.authService.getProfile(selectedAdminId);
          this.currentPage = 'dashboard';
      } else {
          this.viewingUser = null;
      }
      this.render();
  }

  _handleAppClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) return;

    const { action, page, modalId, driverId, carId, cycleId } = actionTarget.dataset;
    const button = actionTarget;

    const actions = {
        'logout': () => this.onLogout && this.onLogout(),
        'toggle-sidebar': () => {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        },
        'switch-page': () => {
            this.currentPage = page;
            this.renderPageWrapper();
        },
        'go-to-page': (e) => {
            e.preventDefault();
            this.appElement.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
            this.currentPage = actionTarget.dataset.page;
            this.renderPageWrapper().then(() => {
                if(actionTarget.dataset.subPage) {
                    if (this.currentPage === 'cadastros') {
                        this.showCadastroTab(actionTarget.dataset.subPage);
                    }
                }
            });
        },
        'open-modal': () => document.getElementById(modalId)?.classList.add('active'),
        'close-modal': () => document.getElementById(modalId)?.classList.remove('active'),
        'open-permissions-modal': () => this.openPermissionsModal(driverId),
        'save-permissions': () => this.savePermissions(this.getButtonEvent(button)),
        'open-cycle-modal': () => this.openCycleModal(),
        'save-cycle': () => this.saveCycle(this.getButtonEvent(button)),
        'open-cycle-details': () => this.openCycleDetailsModal(cycleId),
        'save-driver': () => this.saveDriver(this.getButtonEvent(button)),
        'reset-driver-password': async () => {
            const driverProfile = await this.authService.getProfile(driverId);
            if (confirm(`Tem certeza que deseja enviar um email de redefinição de senha para ${driverProfile.nome} (${driverProfile.email})?`)) {
                const result = await this.authService.resetPasswordForEmail(driverProfile.email);
                if (result.success) {
                    this.toastService.show('Email de redefinição de senha enviado.', 'success');
                } else {
                    this.toastService.show(`Erro: ${result.error}`, 'danger');
                }
            }
        },
        'open-car-modal': () => this.openCarModal(),
        'save-car': () => this.saveCar(this.getButtonEvent(button)),
        'delete-car': () => this.deleteCar(carId),
        'open-tire-brand-modal': () => this.openTireBrandModal(),
        'save-tire-brand': () => this.saveTireBrand(this.getButtonEvent(button)),
        'open-freight-modal': () => this.openFreightModal(cycleId),
        'save-freight': () => this.saveFreight(this.getButtonEvent(button)),
        'open-fueling-modal': () => this.openFuelingModal(cycleId),
        'save-fueling': () => this.saveFueling(this.getButtonEvent(button)),
        'open-expense-modal': () => this.openExpenseModal(cycleId),
        'save-expense': () => this.saveExpense(this.getButtonEvent(button)),
        'trigger-file-input': () => {
            const inputId = actionTarget.dataset.inputId;
            document.getElementById(inputId)?.click();
        },
        'delete-preview': () => {
            const inputId = actionTarget.dataset.inputId;
            this._resetImagePreview(inputId);
        },
        'switch-cycle-details-tab': () => {
            const tab = actionTarget.dataset.tab;
            const cycleId = actionTarget.closest('#cycle-details-content').dataset.cycleId;
            this.renderCycleDetailsTab(tab, cycleId);
        }
    };

    if (actions[action]) {
        actions[action](e);
    } else {
        console.warn('Unhandled action:', action);
    }
  }

  getButtonEvent(button) {
    return {
      target: button,
      setLoading: (isLoading) => {
        if (isLoading) {
          button.disabled = true;
          button.dataset.originalHtml = button.innerHTML;
          button.innerHTML = `<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>`;
        } else {
          button.disabled = false;
          button.innerHTML = button.dataset.originalHtml;
        }
      }
    };
  }

   _handleAppChange(e) {
    const target = e.target;
    if (target.type === 'file') {
        if (target.files && target.files[0]) {
            this._showImagePreview(target.id, target.files[0]);
            const inputDisplay = target.previousElementSibling.querySelector('input');
            if(inputDisplay) inputDisplay.value = target.files[0].name;
        }
    }

    if (target.id === 'fueling-liters' || target.id === 'fueling-price-per-liter') {
        const modal = target.closest('.modal');
        if (modal) {
            const liters = parseFloat(modal.querySelector('#fueling-liters').value) || 0;
            const price = parseFloat(modal.querySelector('#fueling-price-per-liter').value) || 0;
            const totalInput = modal.querySelector('#fueling-total');
            if (totalInput) {
                totalInput.value = (liters * price).toFixed(2);
            }
        }
    }

    const actionTarget = target.closest('[data-action="filter-dashboard"]');
    if (actionTarget) {
        this.dashboardFilters.status = document.getElementById('dashboard-status-filter')?.value || 'todos';
        this.dashboardFilters.startDate = document.getElementById('dashboard-start-date-filter')?.value || '';
        this.dashboardFilters.endDate = document.getElementById('dashboard-end-date-filter')?.value || '';
        this.renderPage('dashboard');
    }
  }

  _showImagePreview(inputId, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        this._setImagePreviewFromData(inputId, e.target.result);
    };
    reader.readAsDataURL(file);
  }

  _setImagePreviewFromData(inputId, dataUrl) {
    if (!dataUrl) {
        this._resetImagePreview(inputId);
        return;
    }
    const previewContainer = document.querySelector(`[data-preview-for="${inputId}"]`);
    if (!previewContainer) return;
    
    const previewImg = previewContainer.querySelector('.image-preview-img');
    previewImg.src = dataUrl;
    previewContainer.classList.remove('hidden');
  }

  _resetImagePreview(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        const inputDisplay = input.previousElementSibling.querySelector('input');
        if(inputDisplay) inputDisplay.value = 'Clique na câmera para enviar';
    }

    const previewContainer = document.querySelector(`[data-preview-for="${inputId}"]`);
    if (!previewContainer) return;

    const previewImg = previewContainer.querySelector('.image-preview-img');
    previewImg.src = '';
    previewContainer.classList.add('hidden');
  }

  async renderPage(page, options = {}) {
    this.currentPage = page;
    const content = document.getElementById('page-content');
    if (!this.viewingUser && this.profile.perfil !== 'dev') {
        content.innerHTML = '';
        return;
    }
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

    switch (page) {
      case 'dashboard':
        await this.renderDashboard(content);
        break;
      case 'cycles':
        await this.renderCycles(content);
        break;
      case 'cadastros':
        await this.renderCadastros(content, options.initialTab);
        break;
      case 'motoristas':
        await this.renderMotoristas(content);
        break;
      case 'config':
        content.innerHTML = '<h2>Página de Configurações em construção</h2>';
        break;
      default:
        content.innerHTML = `<h2>Página não encontrada</h2>`;
    }
    createIcons({ icons });
  }

  async renderDashboard(content) {
    const adminId = this.viewingUser.perfil === 'admin' ? this.viewingUser.id : this.viewingUser.admin_vinculado;
    const driverId = this.viewingUser.perfil === 'motorista' ? this.viewingUser.id : null;
    
    const allCycles = await this.dataService.getCycles(adminId, driverId);

    let totalFreights = 0, totalLosses = 0, totalFuelings = 0, totalExpenses = 0, totalCommissions = 0;

    for (const cycle of allCycles) {
      const freights = await this.dataService.getFreights(cycle.id);
      const fuelings = await this.dataService.getFuelings(cycle.id);
      const expenses = await this.dataService.getExpenses(cycle.id);
      freights.forEach(f => {
        totalFreights += parseFloat(f.valor || 0);
        totalLosses += parseFloat(f.valor_perda || 0);
        totalCommissions += parseFloat(f.valor_comissao || 0);
      });
      fuelings.forEach(f => totalFuelings += parseFloat(f.total || 0));
      expenses.forEach(e => totalExpenses += parseFloat(e.valor || 0));
    }
    
    content.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Dashboard</h2>
            <p class="page-subtitle">Resumo financeiro e operacional dos seus ciclos.</p>
        </div>
        <div class="grid grid-5">
             <div class="stat-card"><h3>Faturamento Bruto</h3><div class="stat-value">${this._formatCurrency(totalFreights)}</div></div>
             <div class="stat-card"><h3>Comissões</h3><div class="stat-value">${this._formatCurrency(totalCommissions)}</div></div>
             <div class="stat-card"><h3>Abastecimentos</h3><div class="stat-value">${this._formatCurrency(totalFuelings)}</div></div>
             <div class="stat-card"><h3>Despesas</h3><div class="stat-value">${this._formatCurrency(totalExpenses)}</div></div>
             <div class="stat-card"><h3>Perdas</h3><div class="stat-value">${this._formatCurrency(totalLosses)}</div></div>
        </div>
    `;
  }

  async renderCycles(content) {
    const adminId = this.viewingUser.id;
    const cycles = await this.dataService.getCycles(adminId);
    
    const drivers = await this.authService.getAllUsersByAdmin(adminId);
    const cars = await this.dataService.getCars(adminId);
    const driverMap = new Map(drivers.map(d => [d.id, d.nome]));
    const carMap = new Map(cars.map(c => [c.id, c.placa]));

    content.innerHTML = `
        <div class="page-header flex-between">
            <div>
                <h2 class="page-title">Ciclos de Viagem</h2>
                <p class="page-subtitle">Gerencie os ciclos de frete, do início ao fim.</p>
            </div>
            <button class="btn btn-primary" data-action="open-modal" data-modal-id="cycle-modal">
                <i data-lucide="plus"></i> Novo Ciclo
            </button>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Motorista</th>
                            <th>Carro</th>
                            <th>Data Saída</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cycles.length > 0 ? cycles.map(cycle => `
                            <tr>
                                <td>${cycle.descricao}</td>
                                <td>${driverMap.get(cycle.driver_id) || 'N/A'}</td>
                                <td>${carMap.get(cycle.car_id) || 'N/A'}</td>
                                <td>${this._formatDate(cycle.data_saida)}</td>
                                <td><span class="badge ${cycle.status === 'aberto' ? 'badge-success' : 'badge-secondary'}">${cycle.status}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Ver Detalhes" data-action="open-cycle-details" data-cycle-id="${cycle.id}">
                                            <i data-lucide="eye"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="refresh-cw" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhum ciclo encontrado</h3>
                                        <p>Clique em "Novo Ciclo" para iniciar o primeiro.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    createIcons({icons});
  }

  async openCycleModal(cycleId = null) {
    const modal = document.getElementById('cycle-modal');
    if (!modal) return;

    modal.querySelector('#cycle-form').reset();
    this._resetImagePreview('cycle-photo');
    modal.querySelector('#cycle-id').value = '';
    modal.querySelector('#cycle-modal-title').textContent = 'Novo Ciclo';

    const driverSelect = modal.querySelector('#cycle-driver');
    const carSelect = modal.querySelector('#cycle-car');
    driverSelect.innerHTML = '<option value="">Carregando...</option>';
    carSelect.innerHTML = '<option value="">Carregando...</option>';

    modal.classList.add('active');

    const adminId = this.viewingUser.id;
    const drivers = (await this.authService.getAllUsersByAdmin(adminId)).filter(u => u.perfil === 'motorista');
    const cars = await this.dataService.getCars(adminId);

    driverSelect.innerHTML = drivers.length > 0 
        ? drivers.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')
        : '<option value="" disabled>Nenhum motorista cadastrado</option>';

    carSelect.innerHTML = cars.length > 0
        ? cars.map(c => `<option value="${c.id}">${c.placa} - ${c.modelo}</option>`).join('')
        : '<option value="" disabled>Nenhum carro cadastrado</option>';
    
    document.getElementById('cycle-date').valueAsDate = new Date();
  }

  async saveCycle(event) {
    event.setLoading(true);
    const form = document.getElementById('cycle-form');
    const cycleData = {
        id: form.querySelector('#cycle-id').value || null,
        descricao: form.querySelector('#cycle-descricao').value,
        driver_id: form.querySelector('#cycle-driver').value,
        car_id: form.querySelector('#cycle-car').value,
        data_saida: form.querySelector('#cycle-date').value,
        km_saida: form.querySelector('#cycle-km').value,
        status: form.querySelector('#cycle-status').value,
    };
    const photoFile = form.querySelector('#cycle-photo').files[0];

    if (!cycleData.descricao || !cycleData.driver_id || !cycleData.car_id || !cycleData.data_saida || !cycleData.km_saida) {
        this.toastService.show('Todos os campos, exceto a foto, são obrigatórios.', 'danger');
        event.setLoading(false);
        return;
    }
    
    const { data, error } = await this.dataService.saveCycle(cycleData, this.viewingUser.id, photoFile);
    
    event.setLoading(false);

    if (error) {
        this.toastService.show(`Erro ao salvar o ciclo: ${error.message}`, 'danger');
    } else {
        this.toastService.show('Ciclo salvo com sucesso!', 'success');
        document.getElementById('cycle-modal').classList.remove('active');
        this.renderPage('cycles');
    }
  }

  async openCycleDetailsModal(cycleId) {
    const modal = document.getElementById('cycle-details-modal');
    if (!modal) return;
    
    const content = modal.querySelector('#cycle-details-content');
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    modal.classList.add('active');

    const cycles = await this.dataService.getCycles(this.viewingUser.id);
    const cycle = cycles.find(c => c.id === cycleId);

    if (!cycle) {
        this.toastService.show('Ciclo não encontrado.', 'danger');
        modal.classList.remove('active');
        return;
    }

    modal.querySelector('#cycle-details-title').textContent = `Detalhes do Ciclo: ${cycle.descricao}`;
    
    content.innerHTML = `
        <div class="tabs" id="cycle-details-tabs">
            <button class="tab active" data-action="switch-cycle-details-tab" data-tab="summary"><i data-lucide="file-text"></i><span>Resumo</span></button>
            <button class="tab" data-action="switch-cycle-details-tab" data-tab="freights"><i data-lucide="package"></i><span>Fretes</span></button>
            <button class="tab" data-action="switch-cycle-details-tab" data-tab="fuelings"><i data-lucide="fuel"></i><span>Abastecimentos</span></button>
            <button class="tab" data-action="switch-cycle-details-tab" data-tab="expenses"><i data-lucide="credit-card"></i><span>Despesas</span></button>
        </div>
        <div id="cycle-details-tab-content" class="mt-2">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    content.dataset.cycleId = cycleId;
    content.dataset.carId = cycle.car_id; // Store car_id for tire changes
    createIcons({icons});
    
    await this.renderCycleDetailsTab('summary', cycleId);
  }

  async renderCycleDetailsTab(tab, cycleId) {
    const content = document.getElementById('cycle-details-tab-content');
    if (!content) return;

    this.appElement.querySelectorAll('#cycle-details-tabs .tab').forEach(t => t.classList.remove('active'));
    this.appElement.querySelector(`#cycle-details-tabs [data-tab="${tab}"]`).classList.add('active');

    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

    switch(tab) {
        case 'summary':
            content.innerHTML = '<h3>Resumo em construção</h3>';
            break;
        case 'freights':
            await this.renderFreightsTab(content, cycleId);
            break;
        case 'fuelings':
            await this.renderFuelingsTab(content, cycleId);
            break;
        case 'expenses':
            await this.renderExpensesTab(content, cycleId);
            break;
    }
    createIcons({icons});
  }

  async renderFreightsTab(content, cycleId) {
    const freights = await this.dataService.getFreights(cycleId);
    
    content.innerHTML = `
        <div class="flex-between mb-2">
            <h3>Fretes do Ciclo</h3>
            <button class="btn btn-primary btn-sm" data-action="open-freight-modal" data-cycle-id="${cycleId}">
                <i data-lucide="plus"></i> Adicionar Frete
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Comissão</th>
                            <th>Perda</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${freights.length > 0 ? freights.map(f => `
                            <tr>
                                <td>${f.descricao}</td>
                                <td>${this._formatCurrency(f.valor)}</td>
                                <td>${this._formatCurrency(f.valor_comissao)}</td>
                                <td>${this._formatCurrency(f.valor_perda)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Editar"><i data-lucide="edit"></i></button>
                                        <button class="icon-btn" title="Excluir"><i data-lucide="trash-2"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="package" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhum frete adicionado</h3>
                                        <p>Clique em "Adicionar Frete" para começar.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  openFreightModal(cycleId) {
    const modal = document.getElementById('freight-modal');
    if (!modal) return;

    modal.querySelector('#freight-form').reset();
    this._resetImagePreview('freight-departure-photo');
    this._resetImagePreview('freight-arrival-photo');
    modal.querySelector('#freight-id').value = '';
    modal.querySelector('#freight-cycle-id').value = cycleId;
    modal.querySelector('#freight-modal-title').textContent = 'Novo Frete';
    modal.classList.add('active');
  }

  async saveFreight(event) {
    event.setLoading(true);
    const form = document.getElementById('freight-form');
    const commissionPercentage = parseFloat(form.querySelector('#freight-comissao').value) || 0;
    const freightValue = parseFloat(form.querySelector('#freight-valor').value) || 0;
    const pesoSaida = parseFloat(form.querySelector('#freight-peso-saida').value) || 0;
    const pesoChegada = parseFloat(form.querySelector('#freight-peso-chegada').value) || 0;

    const freightData = {
        id: form.querySelector('#freight-id').value || null,
        cycle_id: form.querySelector('#freight-cycle-id').value,
        descricao: form.querySelector('#freight-descricao').value,
        valor: freightValue,
        peso_saida: pesoSaida,
        peso_chegada: pesoChegada,
        valor_comissao: freightValue * (commissionPercentage / 100),
        valor_perda: 0 // Placeholder for now
    };

    const files = {
        departure: form.querySelector('#freight-departure-photo').files[0],
        arrival: form.querySelector('#freight-arrival-photo').files[0]
    };

    if (!freightData.descricao || !freightData.valor) {
        this.toastService.show('Descrição e Valor do Frete são obrigatórios.', 'danger');
        event.setLoading(false);
        return;
    }

    const { error } = await this.dataService.saveFreight(freightData, freightData.cycle_id, files);
    event.setLoading(false);

    if (error) {
        this.toastService.show(`Erro ao salvar frete: ${error.message}`, 'danger');
    } else {
        this.toastService.show('Frete salvo com sucesso!', 'success');
        document.getElementById('freight-modal').classList.remove('active');
        this.renderCycleDetailsTab('freights', freightData.cycle_id);
    }
  }

  async renderFuelingsTab(content, cycleId) {
    const fuelings = await this.dataService.getFuelings(cycleId);
    
    content.innerHTML = `
        <div class="flex-between mb-2">
            <h3>Abastecimentos do Ciclo</h3>
            <button class="btn btn-primary btn-sm" data-action="open-fueling-modal" data-cycle-id="${cycleId}">
                <i data-lucide="plus"></i> Adicionar Abastecimento
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>KM</th>
                            <th>Litros</th>
                            <th>Preço/Litro</th>
                            <th>Total</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fuelings.length > 0 ? fuelings.map(f => `
                            <tr>
                                <td>${this._formatDate(f.date)}</td>
                                <td>${this._formatNumber(f.km)}</td>
                                <td>${this._formatDecimal(f.liters)}</td>
                                <td>${this._formatCurrency(f.price_per_liter)}</td>
                                <td>${this._formatCurrency(f.total)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Editar"><i data-lucide="edit"></i></button>
                                        <button class="icon-btn" title="Excluir"><i data-lucide="trash-2"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="fuel" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhum abastecimento adicionado</h3>
                                        <p>Clique em "Adicionar Abastecimento" para começar.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  openFuelingModal(cycleId) {
    const modal = document.getElementById('fueling-modal');
    if (!modal) return;

    modal.querySelector('#fueling-form').reset();
    this._resetImagePreview('fueling-km-photo');
    this._resetImagePreview('fueling-receipt-photo');
    modal.querySelector('#fueling-id').value = '';
    modal.querySelector('#fueling-cycle-id').value = cycleId;
    modal.querySelector('#fueling-modal-title').textContent = 'Novo Abastecimento';
    modal.querySelector('#fueling-date').valueAsDate = new Date();
    modal.classList.add('active');
  }

  async saveFueling(event) {
    event.setLoading(true);
    const form = document.getElementById('fueling-form');
    
    const fuelingData = {
        id: form.querySelector('#fueling-id').value || null,
        date: form.querySelector('#fueling-date').value,
        km: form.querySelector('#fueling-km').value,
        liters: form.querySelector('#fueling-liters').value,
        price_per_liter: form.querySelector('#fueling-price-per-liter').value,
        total: form.querySelector('#fueling-total').value,
    };

    const files = {
        km: form.querySelector('#fueling-km-photo').files[0],
        receipt: form.querySelector('#fueling-receipt-photo').files[0]
    };

    const cycleId = form.querySelector('#fueling-cycle-id').value;

    if (!fuelingData.date || !fuelingData.km || !fuelingData.liters || !fuelingData.price_per_liter || !fuelingData.total) {
        this.toastService.show('Todos os campos de texto são obrigatórios.', 'danger');
        event.setLoading(false);
        return;
    }

    const { error } = await this.dataService.saveFueling(fuelingData, cycleId, files);
    event.setLoading(false);

    if (error) {
        this.toastService.show(`Erro ao salvar abastecimento: ${error.message}`, 'danger');
    } else {
        this.toastService.show('Abastecimento salvo com sucesso!', 'success');
        document.getElementById('fueling-modal').classList.remove('active');
        this.renderCycleDetailsTab('fuelings', cycleId);
    }
  }

  async renderExpensesTab(content, cycleId) {
    const expenses = await this.dataService.getExpenses(cycleId);
    
    content.innerHTML = `
        <div class="flex-between mb-2">
            <h3>Despesas do Ciclo</h3>
            <button class="btn btn-primary btn-sm" data-action="open-expense-modal" data-cycle-id="${cycleId}">
                <i data-lucide="plus"></i> Adicionar Despesa
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.length > 0 ? expenses.map(e => `
                            <tr>
                                <td>${this._formatDate(e.date)}</td>
                                <td>${e.description}</td>
                                <td>${this._formatCurrency(e.value)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Editar"><i data-lucide="edit"></i></button>
                                        <button class="icon-btn" title="Excluir"><i data-lucide="trash-2"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="credit-card" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhuma despesa adicionada</h3>
                                        <p>Clique em "Adicionar Despesa" para começar.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  openExpenseModal(cycleId) {
    const modal = document.getElementById('expense-modal');
    if (!modal) return;

    modal.querySelector('#expense-form').reset();
    this._resetImagePreview('expense-receipt-photo');
    modal.querySelector('#expense-id').value = '';
    modal.querySelector('#expense-cycle-id').value = cycleId;
    modal.querySelector('#expense-modal-title').textContent = 'Nova Despesa';
    modal.querySelector('#expense-date').valueAsDate = new Date();
    modal.classList.add('active');
  }

  async saveExpense(event) {
    event.setLoading(true);
    const form = document.getElementById('expense-form');
    
    const expenseData = {
        id: form.querySelector('#expense-id').value || null,
        date: form.querySelector('#expense-date').value,
        description: form.querySelector('#expense-description').value,
        value: form.querySelector('#expense-value').value,
    };

    const receiptFile = form.querySelector('#expense-receipt-photo').files[0];
    const cycleId = form.querySelector('#expense-cycle-id').value;

    if (!expenseData.date || !expenseData.description || !expenseData.value) {
        this.toastService.show('Data, Descrição e Valor são obrigatórios.', 'danger');
        event.setLoading(false);
        return;
    }

    const { error } = await this.dataService.saveExpense(expenseData, cycleId, receiptFile);
    event.setLoading(false);

    if (error) {
        this.toastService.show(`Erro ao salvar despesa: ${error.message}`, 'danger');
    } else {
        this.toastService.show('Despesa salva com sucesso!', 'success');
        document.getElementById('expense-modal').classList.remove('active');
        this.renderCycleDetailsTab('expenses', cycleId);
    }
  }

  async renderCadastros(content, initialTab = 'cars') {
    content.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Cadastros</h2>
            <p class="page-subtitle">Gerencie os dados mestres do sistema.</p>
        </div>
        <div class="tabs" id="cadastros-tabs">
            <button class="tab ${initialTab === 'cars' ? 'active' : ''}" data-action="switch-cadastro-tab" data-tab="cars"><i data-lucide="truck"></i><span>Carros</span></button>
            <button class="tab ${initialTab === 'tire_brands' ? 'active' : ''}" data-action="switch-cadastro-tab" data-tab="tire_brands"><i data-lucide="circle-dot"></i><span>Marcas de Pneus</span></button>
        </div>
        <div id="cadastros-content">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    createIcons({icons});

    this.appElement.querySelector('#cadastros-tabs').addEventListener('click', (e) => {
        const tabButton = e.target.closest('[data-action="switch-cadastro-tab"]');
        if (tabButton) {
            this.showCadastroTab(tabButton.dataset.tab);
        }
    });

    await this.showCadastroTab(initialTab);
  }
  
  async showCadastroTab(tab) {
    const content = document.getElementById('cadastros-content');
    if (!content) return;

    this.appElement.querySelectorAll('#cadastros-tabs .tab').forEach(t => t.classList.remove('active'));
    this.appElement.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    switch (tab) {
        case 'cars':
            await this.renderCarsTab(content);
            break;
        case 'tire_brands':
            await this.renderTireBrandsTab(content);
            break;
    }
    createIcons({icons});
  }

  async renderCarsTab(content) {
    const adminId = this.viewingUser.id;
    const cars = await this.dataService.getCars(adminId);

    content.innerHTML = `
        <div class="flex-between mb-2">
            <h3>Carros Cadastrados</h3>
            <button class="btn btn-primary" data-action="open-modal" data-modal-id="car-modal">
                <i data-lucide="plus"></i> Cadastrar Carro
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Ano</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cars.length > 0 ? cars.map(car => `
                            <tr>
                                <td>${car.placa}</td>
                                <td>${car.marca}</td>
                                <td>${car.modelo}</td>
                                <td>${car.ano}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Excluir Carro" data-action="delete-car" data-car-id="${car.id}">
                                            <i data-lucide="trash-2"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="truck" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhum carro encontrado</h3>
                                        <p>Clique em "Cadastrar Carro" para adicionar o primeiro.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  async renderTireBrandsTab(content) {
    const brands = await this.dataService.getTireBrands();

    content.innerHTML = `
        <div class="flex-between mb-2">
            <h3>Marcas de Pneus</h3>
            <button class="btn btn-primary" data-action="open-modal" data-modal-id="tire-brand-modal">
                <i data-lucide="plus"></i> Cadastrar Marca
            </button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr><th>Nome da Marca</th></tr>
                    </thead>
                    <tbody>
                        ${brands.length > 0 ? brands.map(brand => `
                            <tr><td>${brand.name}</td></tr>
                        `).join('') : `
                            <tr>
                                <td class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="circle-dot" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhuma marca encontrada</h3>
                                        <p>Clique em "Cadastrar Marca" para adicionar a primeira.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  openCarModal() {
    const modal = document.getElementById('car-modal');
    modal.querySelector('#car-form').reset();
    modal.querySelector('#car-id').value = '';
    modal.querySelector('#car-modal-title').textContent = 'Novo Carro';
    modal.classList.add('active');
  }

  async saveCar(event) {
    event.setLoading(true);
    const carData = {
        placa: document.getElementById('car-placa').value,
        marca: document.getElementById('car-marca').value,
        modelo: document.getElementById('car-modelo').value,
        ano: document.getElementById('car-ano').value,
    };

    if (!carData.placa || !carData.marca || !carData.modelo || !carData.ano) {
        this.toastService.show('Todos os campos são obrigatórios.', 'danger');
        event.setLoading(false);
        return;
    }

    const { error } = await this.dataService.saveCar(carData, this.viewingUser.id);
    event.setLoading(false);

    if (error) {
        this.toastService.show('Erro ao salvar o carro.', 'danger');
    } else {
        this.toastService.show('Carro salvo com sucesso!', 'success');
        document.getElementById('car-modal').classList.remove('active');
        this.showCadastroTab('cars');
    }
  }

  async deleteCar(carId) {
    if (confirm('Tem certeza que deseja excluir este carro? Esta ação não pode ser desfeita.')) {
        const { error } = await this.dataService.deleteCar(carId);
        if (error) {
            this.toastService.show('Erro ao excluir o carro. Verifique se ele não está em uso.', 'danger');
        } else {
            this.toastService.show('Carro excluído com sucesso!', 'success');
            this.showCadastroTab('cars');
        }
    }
  }

  openTireBrandModal() {
    const modal = document.getElementById('tire-brand-modal');
    modal.querySelector('#tire-brand-form').reset();
    modal.classList.add('active');
  }

  async saveTireBrand(event) {
    event.setLoading(true);
    const brandName = document.getElementById('tire-brand-name').value;
    if (!brandName) {
        this.toastService.show('O nome da marca é obrigatório.', 'danger');
        event.setLoading(false);
        return;
    }

    const { error } = await this.dataService.saveTireBrand(brandName);
    event.setLoading(false);

    if (error) {
        this.toastService.show('Erro ao salvar a marca.', 'danger');
    } else {
        this.toastService.show('Marca salva com sucesso!', 'success');
        document.getElementById('tire-brand-modal').classList.remove('active');
        this.showCadastroTab('tire_brands');
    }
  }
  
  async renderMotoristas(content) {
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

    const adminId = this.viewingUser.id;
    const drivers = (await this.authService.getAllUsersByAdmin(adminId)).filter(u => u.perfil === 'motorista');

    content.innerHTML = `
        <div class="page-header flex-between">
            <div>
                <h2 class="page-title">Motoristas</h2>
                <p class="page-subtitle">Gerencie os motoristas vinculados a você.</p>
            </div>
            <button class="btn btn-primary" data-action="open-modal" data-modal-id="register-driver-modal">
                <i data-lucide="user-plus"></i> Cadastrar Motorista
            </button>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Data de Cadastro</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${drivers.length > 0 ? drivers.map(driver => `
                            <tr>
                                <td>${driver.nome}</td>
                                <td>${driver.email}</td>
                                <td>${this._formatDate(driver.created_at)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" title="Editar Permissões" data-action="open-permissions-modal" data-driver-id="${driver.id}">
                                            <i data-lucide="shield-check"></i>
                                        </button>
                                        <button class="icon-btn" title="Resetar Senha" data-action="reset-driver-password" data-driver-id="${driver.id}">
                                            <i data-lucide="key-round"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" class="text-center p-4">
                                    <div class="empty-state">
                                        <i data-lucide="users" style="width: 48px; height: 48px;"></i>
                                        <h3>Nenhum motorista encontrado</h3>
                                        <p>Clique em "Cadastrar Motorista" para adicionar o primeiro.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    createIcons({ icons });
  }

  async openPermissionsModal(driverId) {
    const modal = document.getElementById('permissions-modal');
    if (!modal) return;

    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    modal.classList.add('active');

    const permissions = await this.dataService.getPermissions(driverId);
    
    modalBody.innerHTML = `
        <p>Controle o que este motorista pode visualizar no aplicativo.</p>
        <form id="permissions-form">
            <input type="hidden" id="permission-driver-id">
            <div class="form-group">
                <label class="form-switch">
                    <input type="checkbox" id="perm-view-tire-changes">
                    <span>Visualizar Trocas de Pneus</span>
                </label>
            </div>
            <div class="form-group">
                <label class="form-switch">
                    <input type="checkbox" id="perm-view-fuelings">
                    <span>Visualizar Abastecimentos</span>
                </label>
            </div>
            <div class="form-group">
                <label class="form-switch">
                    <input type="checkbox" id="perm-view-expenses">
                    <span>Visualizar Despesas</span>
                </label>
            </div>
        </form>
    `;
    
    modal.querySelector('#perm-view-tire-changes').checked = permissions.view_tire_changes;
    modal.querySelector('#perm-view-fuelings').checked = permissions.view_fuelings;
    modal.querySelector('#perm-view-expenses').checked = permissions.view_expenses;
    modal.querySelector('#permission-driver-id').value = driverId;
  }

  async savePermissions(event) {
    event.setLoading(true);
    const driverId = document.getElementById('permission-driver-id').value;
    const permissions = {
        view_tire_changes: document.getElementById('perm-view-tire-changes').checked,
        view_fuelings: document.getElementById('perm-view-fuelings').checked,
        view_expenses: document.getElementById('perm-view-expenses').checked,
    };

    const { error } = await this.dataService.savePermissions(driverId, permissions);
    event.setLoading(false);

    if (error) {
        this.toastService.show('Erro ao salvar permissões.', 'danger');
    } else {
        this.toastService.show('Permissões salvas com sucesso!', 'success');
        document.getElementById('permissions-modal').classList.remove('active');
    }
  }

  async saveDriver(event) {
    event.setLoading(true);
    const name = document.getElementById('driver-register-name').value;
    const email = document.getElementById('driver-register-email').value;

    if (!name || !email) {
      this.toastService.show('Nome e email são obrigatórios.', 'danger');
      event.setLoading(false);
      return;
    }

    const result = await this.authService.inviteDriver(email, name, this.viewingUser.id);
    event.setLoading(false);

    if (result.success) {
      if (result.warning) {
          this.toastService.show(result.warning, 'warning', 10000);
      } else {
          this.toastService.show('Motorista convidado! Instruções foram enviadas para o e-mail informado.', 'success');
      }
      document.getElementById('register-driver-modal').classList.remove('active');
      this.renderMotoristas(document.getElementById('page-content'));
    } else {
      this.toastService.show(`Erro: ${result.error}`, 'danger');
    }
  }
}
