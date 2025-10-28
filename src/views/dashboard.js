import { createIcons, icons } from 'lucide';
import { DataService } from '../services/data.js';
import { AuthService } from '../services/auth.js';

export class DashboardView {
  constructor(user) {
    this.user = user;
    this.dataService = new DataService();
    this.authService = new AuthService();
    this.currentPage = 'dashboard';
    this.onLogout = null;
    this.appElement = document.getElementById('app');
  }

  render() {
    this.appElement.innerHTML = `
      <nav class="navbar">
        <div class="container navbar-content">
          <div class="navbar-brand">
            <i data-lucide="truck"></i>
            Gerencial Fretes
          </div>
          <div class="navbar-menu">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">
              ${this.user.nome} (${this.user.perfil === 'admin' ? 'Admin' : 'Motorista'})
            </span>
            <button class="btn btn-sm btn-danger" id="logout-btn">
              <i data-lucide="log-out"></i>
              Sair
            </button>
          </div>
        </div>
      </nav>
      
      <div class="main-content">
        <div class="container">
          <div class="tabs" id="main-tabs">
            <button class="tab active" data-page="dashboard">
              <i data-lucide="layout-dashboard"></i>
              Dashboard
            </button>
            <button class="tab" data-page="cycles">
              <i data-lucide="refresh-cw"></i>
              Ciclos
            </button>
            ${this.user.perfil === 'admin' ? `
              <button class="tab" data-page="cadastros">
                <i data-lucide="database"></i>
                Cadastros
              </button>
              <button class="tab" data-page="motoristas">
                <i data-lucide="users"></i>
                Motoristas
              </button>
              <button class="tab" data-page="config">
                <i data-lucide="settings"></i>
                Configurações
              </button>
            ` : ''}
          </div>
          
          <div id="page-content"></div>
        </div>
      </div>

      <div id="cycle-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="cycle-modal-title">Novo Ciclo</h2>
            <button class="icon-btn" data-action="close-main-modal" data-modal-id="cycle-modal">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="cycle-form">
              <input type="hidden" id="cycle-id">
              <div class="form-group">
                <label class="form-label">Descrição do Ciclo</label>
                <input type="text" class="form-input" id="cycle-descricao" required>
              </div>
              <div class="form-group">
                <label class="form-label">Motorista</label>
                <select class="form-select" id="cycle-driver" required></select>
              </div>
              <div class="form-group">
                <label class="form-label">Carro</label>
                <select class="form-select" id="cycle-car" required></select>
              </div>
              <div class="form-group">
                <label class="form-label">Data e Hora da Saída</label>
                <input type="datetime-local" class="form-input" id="cycle-date" required>
              </div>
              <div class="form-group">
                <label class="form-label">Quilometragem da Saída <span style="color: var(--danger);">*</span></label>
                <div class="input-with-icon" id="cycle-km-upload-trigger">
                    <input type="number" class="form-input" id="cycle-km" step="0.01" required>
                    <button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="cycle-photo">
                        <i data-lucide="camera"></i>
                    </button>
                </div>
                <input type="file" id="cycle-photo" accept="image/*" class="hidden">
                <div class="image-preview-container hidden" id="cycle-photo-preview-container">
                    <img src="" alt="Pré-visualização" class="image-preview-img">
                    <button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="cycle-photo">
                        <i data-lucide="x"></i>
                    </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" id="cycle-status" required>
                    <option value="aberto" selected>Aberto</option>
                    <option value="fechado">Fechado</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-main-modal" data-modal-id="cycle-modal">Cancelar</button>
            <button class="btn btn-primary" data-action="save-cycle">Salvar</button>
          </div>
        </div>
      </div>

      <div id="cycle-details-modal" class="modal">
        <div class="modal-content" style="max-width: 1200px;">
          <div class="modal-header">
            <h2 id="cycle-details-title">Detalhes do Ciclo</h2>
            <button class="icon-btn" data-action="close-main-modal" data-modal-id="cycle-details-modal">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body" id="cycle-details-content"></div>
        </div>
      </div>
    `;

    this._setupEventListeners();
    this.renderPage('dashboard');
  }

  _setupEventListeners() {
    this.appElement.removeEventListener('click', this._handleAppClick.bind(this));
    this.appElement.addEventListener('click', this._handleAppClick.bind(this));
    
    this.appElement.removeEventListener('change', this._handleAppChange.bind(this));
    this.appElement.addEventListener('change', this._handleAppChange.bind(this));
  }

  _handleAppClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) return;

    const { action, page, modalId, cycleId, freightId, fuelingId, expenseId, tab, inputId, carId, brandId, changeId, driverId } = actionTarget.dataset;

    switch (action) {
        case 'logout':
            if (this.onLogout) this.onLogout();
            break;
        case 'switch-page':
            document.querySelectorAll('#main-tabs .tab').forEach(t => t.classList.remove('active'));
            actionTarget.classList.add('active');
            this.renderPage(page);
            break;
        case 'open-cycle-modal':
            this.openCycleModal(cycleId);
            break;
        case 'view-cycle-details':
            this.openCycleDetails(cycleId);
            break;
        case 'delete-cycle':
            this.deleteCycle(cycleId);
            break;
        case 'save-cycle':
            this.saveCycle();
            break;
        case 'close-main-modal':
            document.getElementById(modalId).classList.remove('active');
            break;
        case 'switch-cycle-tab':
            document.querySelectorAll('#cycle-details-tabs .tab').forEach(t => t.classList.remove('active'));
            actionTarget.classList.add('active');
            this.showCycleTab(tab, cycleId, actionTarget.dataset.status);
            break;
        case 'close-cycle':
            if (confirm('Tem certeza que deseja fechar este ciclo? As edições serão bloqueadas para motoristas.')) {
                this.dataService.updateCycle(cycleId, { status: 'fechado' });
                this.openCycleDetails(cycleId);
            }
            break;
        case 'open-freight-modal':
            this.openFreightModal(cycleId, freightId);
            break;
        case 'delete-freight':
            if (confirm('Tem certeza que deseja excluir este frete?')) {
                this.dataService.deleteFreight(freightId);
                this.openCycleDetails(cycleId);
            }
            break;
        case 'save-freight':
            this.saveFreight(cycleId);
            break;
        case 'open-fueling-modal':
            this.openFuelingModal(cycleId, fuelingId);
            break;
        case 'delete-fueling':
            if (confirm('Tem certeza que deseja excluir este abastecimento?')) {
                this.dataService.deleteFueling(fuelingId);
                this.openCycleDetails(cycleId);
            }
            break;
        case 'save-fueling':
            this.saveFueling(cycleId);
            break;
        case 'open-expense-modal':
            this.openExpenseModal(cycleId, expenseId);
            break;
        case 'delete-expense':
            if (confirm('Tem certeza que deseja excluir esta despesa?')) {
                this.dataService.deleteExpense(expenseId);
                this.openCycleDetails(cycleId);
            }
            break;
        case 'save-expense':
            this.saveExpense(cycleId);
            break;
        case 'close-sub-modal':
            document.getElementById(modalId).classList.remove('active');
            break;
        case 'trigger-file-input':
            document.getElementById(inputId).click();
            break;
        case 'delete-preview':
            this._resetImagePreview(inputId);
            break;
        case 'open-car-modal':
            this.openCarModal();
            break;
        case 'save-car':
            this.saveCar();
            break;
        case 'delete-car':
            if (confirm('Deseja realmente excluir este carro?')) {
                this.dataService.deleteCar(carId);
                this.showCadastroTab('cars');
            }
            break;
        case 'open-tire-brand-modal':
            this.openTireBrandModal();
            break;
        case 'save-tire-brand':
            this.saveTireBrand();
            break;
        case 'open-tire-change-modal':
            this.openTireChangeModal();
            break;
        case 'save-tire-change':
            this.saveTireChange();
            break;
        case 'invite-driver':
            this.showInviteDriverModal();
            break;
        case 'manage-permissions':
            this.openPermissionsModal(driverId);
            break;
        case 'save-permissions':
            this.savePermissions(actionTarget.dataset.currentDriverId);
            break;
        case 'save-settings':
            e.preventDefault();
            this.saveSettings();
            break;
    }
  }

  _handleAppChange(e) {
    const target = e.target;
    if (target.type === 'file') {
        if (target.files && target.files[0]) {
            this._showImagePreview(target.id, target.files[0]);
        }
    }
  }

  _showImagePreview(inputId, file) {
    const previewContainer = document.querySelector(`[data-preview-for="${inputId}"]`);
    if (!previewContainer) return;

    const previewImg = previewContainer.querySelector('.image-preview-img');
    const trigger = document.querySelector(`[data-action="trigger-file-input"][data-input-id="${inputId}"]`) || document.querySelector(`button[data-input-id="${inputId}"]`);

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewContainer.classList.remove('hidden');
        if (trigger) {
            const parentTrigger = trigger.closest('.input-with-icon') || trigger.closest('.form-group');
            if(parentTrigger) parentTrigger.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
  }

  _resetImagePreview(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.value = '';

    const previewContainer = document.querySelector(`[data-preview-for="${inputId}"]`);
    if (!previewContainer) return;

    const previewImg = previewContainer.querySelector('.image-preview-img');
    previewImg.src = '';
    previewContainer.classList.add('hidden');

    const trigger = document.querySelector(`[data-action="trigger-file-input"][data-input-id="${inputId}"]`) || document.querySelector(`button[data-input-id="${inputId}"]`);
    if (trigger) {
        const parentTrigger = trigger.closest('.input-with-icon') || trigger.closest('.form-group');
        if(parentTrigger) parentTrigger.classList.remove('hidden');
    }
  }

  renderPage(page) {
    this.currentPage = page;
    const content = document.getElementById('page-content');

    switch (page) {
      case 'dashboard':
        this.renderDashboard(content);
        break;
      case 'cycles':
        this.renderCycles(content);
        break;
      case 'cadastros':
        this.renderCadastros(content);
        break;
      case 'motoristas':
        this.renderMotoristas(content);
        break;
      case 'config':
        this.renderConfig(content);
        break;
    }
  }

  renderDashboard(content) {
    const cycles = this.user.perfil === 'admin' 
      ? this.dataService.getCycles(this.user.id)
      : this.dataService.getCycles(this.user.adminVinculado, this.user.id);

    const openCycles = cycles.filter(c => c.status === 'aberto');
    const closedCycles = cycles.filter(c => c.status === 'fechado');

    let totalFreights = 0, totalLosses = 0, totalFuelings = 0, totalExpenses = 0, totalCommissions = 0;

    cycles.forEach(cycle => {
      const freights = this.dataService.getFreights(cycle.id);
      const fuelings = this.dataService.getFuelings(cycle.id);
      const expenses = this.dataService.getExpenses(cycle.id);
      freights.forEach(f => {
        totalFreights += parseFloat(f.valor || 0);
        totalLosses += parseFloat(f.valorPerda || 0);
        totalCommissions += parseFloat(f.valorComissao || 0);
      });
      fuelings.forEach(f => totalFuelings += parseFloat(f.total || 0));
      expenses.forEach(e => totalExpenses += parseFloat(e.valor || 0));
    });

    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral dos seus fretes</p>
      </div>
      <div class="grid grid-4">
        <div class="stat-card" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);"><h3>Ciclos Abertos</h3><div class="stat-value">${openCycles.length}</div><div class="stat-label">Em andamento</div></div>
        <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"><h3>Ciclos Fechados</h3><div class="stat-value">${closedCycles.length}</div><div class="stat-label">Finalizados</div></div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);"><h3>Total em Fretes</h3><div class="stat-value">R$ ${totalFreights.toFixed(2)}</div><div class="stat-label">Receita total</div></div>
        <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);"><h3>Total Comissões</h3><div class="stat-value">R$ ${totalCommissions.toFixed(2)}</div><div class="stat-label">Comissões pagas</div></div>
      </div>
      <div class="grid grid-3 mt-3">
        <div class="card"><h3 class="flex gap-2 mb-2"><i data-lucide="alert-triangle"></i>Total em Perdas</h3><div style="font-size: 2rem; font-weight: 700; color: var(--danger);">R$ ${totalLosses.toFixed(2)}</div></div>
        <div class="card"><h3 class="flex gap-2 mb-2"><i data-lucide="fuel"></i>Total Abastecimentos</h3><div style="font-size: 2rem; font-weight: 700; color: var(--info);">R$ ${totalFuelings.toFixed(2)}</div></div>
        <div class="card"><h3 class="flex gap-2 mb-2"><i data-lucide="receipt"></i>Total Despesas</h3><div style="font-size: 2rem; font-weight: 700; color: var(--warning);">R$ ${totalExpenses.toFixed(2)}</div></div>
      </div>
      <div class="card mt-3"><h3 class="mb-3">Ciclos Recentes</h3>${this.renderCyclesTable(cycles.slice(0, 5))}</div>
    `;
    createIcons({ icons });
  }

  renderCyclesTable(cycles) {
    if (cycles.length === 0) {
      return `<div class="empty-state"><i data-lucide="inbox" style="width: 64px; height: 64px;"></i><h3>Nenhum ciclo encontrado</h3><p>Crie seu primeiro ciclo para começar</p></div>`;
    }
    return `
      <table class="table">
        <thead><tr><th>Descrição</th><th>Motorista</th><th>Carro</th><th>Data Saída</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${cycles.map(cycle => {
            const driver = this.authService.getAllUsers().find(u => u.id === cycle.driverId);
            const car = this.dataService.getCars(cycle.adminId).find(c => c.id === cycle.carId);
            const canEdit = this.user.perfil === 'admin' || cycle.status === 'aberto';
            return `
              <tr>
                <td>${cycle.descricao}</td>
                <td>${driver?.nome || 'N/A'}</td>
                <td>${car?.placa || 'N/A'}</td>
                <td>${new Date(cycle.dataSaida).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge ${cycle.status === 'aberto' ? 'badge-success' : 'badge-info'}">${cycle.status === 'aberto' ? 'Aberto' : 'Fechado'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" data-action="view-cycle-details" data-cycle-id="${cycle.id}" title="Ver Detalhes"><i data-lucide="eye"></i></button>
                        ${canEdit ? `
                            <button class="btn btn-sm btn-secondary" data-action="open-cycle-modal" data-cycle-id="${cycle.id}" title="Editar Ciclo"><i data-lucide="edit"></i></button>
                            <button class="btn btn-sm btn-danger" data-action="delete-cycle" data-cycle-id="${cycle.id}" title="Excluir Ciclo"><i data-lucide="trash-2"></i></button>
                        ` : ''}
                    </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  renderCycles(content) {
    const cycles = this.user.perfil === 'admin' 
      ? this.dataService.getCycles(this.user.id)
      : this.dataService.getCycles(this.user.adminVinculado, this.user.id);
    content.innerHTML = `
      <div class="page-header flex-between">
        <div><h1 class="page-title">Ciclos</h1><p class="page-subtitle">Gerencie seus ciclos de fretes</p></div>
        ${this.user.perfil === 'admin' ? `<button class="btn btn-primary" data-action="open-cycle-modal"><i data-lucide="plus"></i>Novo Ciclo</button>` : ''}
      </div>
      <div class="card">${this.renderCyclesTable(cycles)}</div>`;
    createIcons({ icons });
  }

  openCycleModal(cycleId = null) {
    const modal = document.getElementById('cycle-modal');
    const modalTitle = document.getElementById('cycle-modal-title');
    const form = document.getElementById('cycle-form');
    form.reset();
    document.getElementById('cycle-id').value = '';
    this._resetImagePreview('cycle-photo');
    
    const drivers = this.authService.getAllUsers().filter(u => u.perfil === 'motorista' && u.adminVinculado === this.user.id);
    const driverSelect = document.getElementById('cycle-driver');
    driverSelect.innerHTML = '<option value="">Selecione...</option>' + drivers.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');

    const cars = this.dataService.getCars(this.user.id);
    const carSelect = document.getElementById('cycle-car');
    carSelect.innerHTML = '<option value="">Selecione...</option>' + cars.map(c => `<option value="${c.id}">${c.placa} - ${c.marca}</option>`).join('');

    if (cycleId) {
        modalTitle.textContent = 'Editar Ciclo';
        const cycle = this.dataService.getCycles(this.user.perfil === 'admin' ? this.user.id : this.user.adminVinculado).find(c => c.id === cycleId);
        if (cycle) {
            document.getElementById('cycle-id').value = cycle.id;
            document.getElementById('cycle-descricao').value = cycle.descricao;
            driverSelect.value = cycle.driverId;
            carSelect.value = cycle.carId;
            document.getElementById('cycle-date').value = cycle.dataSaida;
            document.getElementById('cycle-km').value = cycle.kmSaida;
            document.getElementById('cycle-status').value = cycle.status;
        }
    } else {
        modalTitle.textContent = 'Novo Ciclo';
    }
    modal.classList.add('active');
    createIcons({ icons });
  }

  saveCycle() {
    const cycleId = document.getElementById('cycle-id').value;
    const photoInput = document.getElementById('cycle-photo');
    if (!cycleId && photoInput.files.length === 0) {
        alert('Por favor, anexe a foto da quilometragem de saída.');
        return;
    }
    const cycleData = {
      descricao: document.getElementById('cycle-descricao').value,
      driverId: document.getElementById('cycle-driver').value,
      carId: document.getElementById('cycle-car').value,
      dataSaida: document.getElementById('cycle-date').value,
      kmSaida: document.getElementById('cycle-km').value,
      status: document.getElementById('cycle-status').value
    };
    if (cycleId) {
        this.dataService.updateCycle(cycleId, cycleData);
    } else {
        this.dataService.saveCycle(cycleData, this.user.id);
    }
    document.getElementById('cycle-modal').classList.remove('active');
    this.renderPage(this.currentPage);
  }

  deleteCycle(cycleId) {
    if (confirm('Tem certeza que deseja excluir este ciclo? Todos os fretes, abastecimentos e despesas associados também serão excluídos.')) {
        this.dataService.deleteCycle(cycleId);
        this.renderPage(this.currentPage);
    }
  }

  openCycleDetails(cycleId) {
    const cycle = this.dataService.getCycles(this.user.perfil === 'admin' ? this.user.id : this.user.adminVinculado).find(c => c.id === cycleId);
    if (!cycle) return;

    const driver = this.authService.getAllUsers().find(u => u.id === cycle.driverId);
    const car = this.dataService.getCars(cycle.adminId).find(c => c.id === cycle.carId);
    const freights = this.dataService.getFreights(cycleId);
    const fuelings = this.dataService.getFuelings(cycleId);
    const expenses = this.dataService.getExpenses(cycleId);

    const totalFreights = freights.reduce((sum, f) => sum + parseFloat(f.valor || 0), 0);
    const totalCommissions = freights.reduce((sum, f) => sum + parseFloat(f.valorComissao || 0), 0);
    const totalLosses = freights.reduce((sum, f) => sum + parseFloat(f.valorPerda || 0), 0);
    const totalFuelings = fuelings.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.valor || 0), 0);

    const content = document.getElementById('cycle-details-content');
    content.innerHTML = `
      <div class="card">
        <h3 class="mb-3">Informações do Ciclo</h3>
        <div class="grid grid-2">
          <div><strong>Descrição:</strong> ${cycle.descricao}<br><strong>Motorista:</strong> ${driver?.nome || 'N/A'}<br><strong>Carro:</strong> ${car?.placa || 'N/A'} - ${car?.marca || 'N/A'}</div>
          <div><strong>Data Saída:</strong> ${new Date(cycle.dataSaida).toLocaleString('pt-BR')}<br><strong>KM Saída:</strong> ${cycle.kmSaida} km<br><strong>Status:</strong> <span class="badge ${cycle.status === 'aberto' ? 'badge-success' : 'badge-info'}">${cycle.status}</span></div>
        </div>
        ${cycle.status === 'aberto' && this.user.perfil === 'admin' ? `<button class="btn btn-danger mt-2" data-action="close-cycle" data-cycle-id="${cycle.id}"><i data-lucide="lock"></i>Fechar Ciclo</button>` : ''}
      </div>
      <div class="grid grid-3 mt-3">
        <div class="card"><h4>Total Fretes</h4><div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">R$ ${totalFreights.toFixed(2)}</div></div>
        <div class="card"><h4>Total Comissões</h4><div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">R$ ${totalCommissions.toFixed(2)}</div></div>
        <div class="card"><h4>Total Perdas</h4><div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">R$ ${totalLosses.toFixed(2)}</div></div>
      </div>
      <div class="tabs mt-3" id="cycle-details-tabs">
        <button class="tab active" data-action="switch-cycle-tab" data-tab="freights" data-cycle-id="${cycle.id}" data-status="${cycle.status}"><i data-lucide="truck"></i>Fretes (${freights.length})</button>
        <button class="tab" data-action="switch-cycle-tab" data-tab="fuelings" data-cycle-id="${cycle.id}" data-status="${cycle.status}"><i data-lucide="fuel"></i>Abastecimentos (${fuelings.length})</button>
        <button class="tab" data-action="switch-cycle-tab" data-tab="expenses" data-cycle-id="${cycle.id}" data-status="${cycle.status}"><i data-lucide="receipt"></i>Despesas (${expenses.length})</button>
      </div>
      <div id="tab-content"></div>
      ${this._getDetailsModalsHTML(cycle.id)}
    `;

    document.getElementById('cycle-details-modal').classList.add('active');
    this.showCycleTab('freights', cycle.id, cycle.status);
  }

  _getDetailsModalsHTML(cycleId) {
    return `
      <div id="freight-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header"><h2 id="freight-modal-title"></h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="freight-modal"><i data-lucide="x"></i></button></div>
          <div class="modal-body">
            <form id="freight-form">
                <input type="hidden" id="freight-id">
                <div class="grid grid-2"><div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" id="freight-date" required></div><div class="form-group"><label class="form-label">Frete por Tonelada (R$)</label><input type="number" class="form-input" id="freight-price" step="0.01" required></div></div>
                <div class="grid grid-2"><div class="form-group"><label class="form-label">Origem</label><input type="text" class="form-input" id="freight-origin" required></div><div class="form-group"><label class="form-label">Destino</label><input type="text" class="form-input" id="freight-destination" required></div></div>
                <div class="grid grid-2">
                    <div class="form-group"><label class="form-label">Peso Saída (kg) <span style="color: var(--danger);">*</span></label><div class="input-with-icon"><input type="number" class="form-input" id="freight-weight" step="0.01" required><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="freight-photo-departure"><i data-lucide="camera"></i></button></div><input type="file" id="freight-photo-departure" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="freight-photo-departure"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="freight-photo-departure"><i data-lucide="x"></i></button></div></div>
                    <div class="form-group"><label class="form-label">Peso Chegada (kg)</label><div class="input-with-icon"><input type="number" class="form-input" id="freight-arrival-weight" step="0.01"><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="freight-photo-arrival"><i data-lucide="camera"></i></button></div><input type="file" id="freight-photo-arrival" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="freight-photo-arrival"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="freight-photo-arrival"><i data-lucide="x"></i></button></div></div>
                </div>
                <div class="form-group"><label class="form-label">Valor de Perda (R$)</label><input type="number" class="form-input" id="freight-loss" step="0.01" value="0"></div>
            </form>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="freight-modal">Cancelar</button><button class="btn btn-primary" data-action="save-freight" data-cycle-id="${cycleId}">Salvar</button></div>
        </div>
      </div>
      <div id="fueling-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header"><h2 id="fueling-modal-title"></h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="fueling-modal"><i data-lucide="x"></i></button></div>
          <div class="modal-body">
            <form id="fueling-form">
              <input type="hidden" id="fueling-id">
              <div class="grid grid-2"><div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" id="fueling-date" required></div><div class="form-group"><label class="form-label">Posto</label><input type="text" class="form-input" id="fueling-station" required></div></div>
              <div class="form-group"><label class="form-label">Quilometragem <span style="color: var(--danger);">*</span></label><div class="input-with-icon"><input type="number" class="form-input" id="fueling-km" step="0.01" required><button type="button" class="icon-btn" data-action="trigger-file-input" data-input-id="fueling-km-photo"><i data-lucide="camera"></i></button></div><input type="file" id="fueling-km-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="fueling-km-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="fueling-km-photo"><i data-lucide="x"></i></button></div></div>
              <div class="grid grid-2"><div class="form-group"><label class="form-label">Qtd Litros Arla</label><input type="number" class="form-input" id="fueling-arla-qty" step="0.0001" value="0" required></div><div class="form-group"><label class="form-label">Valor Litro Arla (R$)</label><input type="number" class="form-input" id="fueling-arla-price" step="0.0001" value="0" required></div></div>
              <div class="grid grid-2"><div class="form-group"><label class="form-label">Qtd Litros S10</label><input type="number" class="form-input" id="fueling-s10-qty" step="0.0001" value="0" required></div><div class="form-group"><label class="form-label">Valor Litro S10 (R$)</label><input type="number" class="form-input" id="fueling-s10-price" step="0.0001" value="0" required></div></div>
              <div class="form-group"><label class="form-label">Foto da Nota Fiscal <span style="color: var(--danger);">*</span></label><div class="form-group"><button type="button" class="btn btn-outline" style="width: 100%;" data-action="trigger-file-input" data-input-id="fueling-photo"><i data-lucide="upload"></i><span data-default="Selecionar Nota Fiscal">Selecionar Nota Fiscal</span></button></div><input type="file" id="fueling-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="fueling-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="fueling-photo"><i data-lucide="x"></i></button></div></div>
            </form>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="fueling-modal">Cancelar</button><button class="btn btn-primary" data-action="save-fueling" data-cycle-id="${cycleId}">Salvar</button></div>
        </div>
      </div>
      <div id="expense-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header"><h2 id="expense-modal-title"></h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="expense-modal"><i data-lucide="x"></i></button></div>
          <div class="modal-body">
            <form id="expense-form">
              <input type="hidden" id="expense-id">
              <div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" id="expense-date" required></div>
              <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" id="expense-description" required></textarea></div>
              <div class="form-group"><label class="form-label">Valor (R$)</label><input type="number" class="form-input" id="expense-value" step="0.01" required></div>
              <div class="form-group"><label class="form-label">Foto da Nota Fiscal</label><div class="form-group"><button type="button" class="btn btn-outline" style="width: 100%;" data-action="trigger-file-input" data-input-id="expense-photo"><i data-lucide="upload"></i><span data-default="Selecionar Nota Fiscal">Selecionar Nota Fiscal</span></button></div><input type="file" id="expense-photo" accept="image/*" class="hidden"><div class="image-preview-container hidden" data-preview-for="expense-photo"><img src="" alt="Pré-visualização" class="image-preview-img"><button type="button" class="delete-preview-btn" data-action="delete-preview" data-input-id="expense-photo"><i data-lucide="x"></i></button></div></div>
            </form>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="expense-modal">Cancelar</button><button class="btn btn-primary" data-action="save-expense" data-cycle-id="${cycleId}">Salvar</button></div>
        </div>
      </div>
    `;
  }

  showCycleTab(tabName, cycleId, status) {
    const content = document.getElementById('tab-content');
    const canEdit = this.user.perfil === 'admin' || status === 'aberto';
    let innerHTML = '';

    switch (tabName) {
      case 'freights': {
        const freights = this.dataService.getFreights(cycleId);
        innerHTML = `
          ${canEdit ? `<button class="btn btn-primary mb-2" data-action="open-freight-modal" data-cycle-id="${cycleId}"><i data-lucide="plus"></i>Adicionar Frete</button>` : ''}
          ${freights.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhum frete</h3></div>` : `
            <table class="table">
              <thead><tr><th>Data</th><th>Origem → Destino</th><th>Valor</th><th>Comissão</th><th>Ações</th></tr></thead>
              <tbody>
                ${freights.map(f => `
                  <tr>
                    <td>${new Date(f.data).toLocaleDateString('pt-BR')}</td>
                    <td>${f.origem} → ${f.destino}</td>
                    <td>R$ ${parseFloat(f.valor || 0).toFixed(2)}</td>
                    <td>R$ ${parseFloat(f.valorComissao || 0).toFixed(2)}</td>
                    <td>${canEdit ? `<div class="action-buttons"><button class="icon-btn" data-action="open-freight-modal" data-cycle-id="${cycleId}" data-freight-id="${f.id}" title="Editar"><i data-lucide="edit"></i></button><button class="icon-btn" data-action="delete-freight" data-cycle-id="${cycleId}" data-freight-id="${f.id}" title="Excluir"><i data-lucide="trash-2"></i></button></div>` : 'N/A'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
        `;
        break;
      }
      case 'fuelings': {
        const fuelings = this.dataService.getFuelings(cycleId);
        innerHTML = `
          ${canEdit ? `<button class="btn btn-primary mb-2" data-action="open-fueling-modal" data-cycle-id="${cycleId}"><i data-lucide="plus"></i>Adicionar Abastecimento</button>` : ''}
          ${fuelings.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhum abastecimento</h3></div>` : `
            <table class="table">
              <thead><tr><th>Data</th><th>Posto</th><th>KM</th><th>Total</th><th>Ações</th></tr></thead>
              <tbody>
                ${fuelings.map(f => `
                  <tr>
                    <td>${new Date(f.data).toLocaleDateString('pt-BR')}</td>
                    <td>${f.posto}</td>
                    <td>${f.quilometragem} km</td>
                    <td>R$ ${parseFloat(f.total).toFixed(2)}</td>
                    <td>${canEdit ? `<div class="action-buttons"><button class="icon-btn" data-action="open-fueling-modal" data-cycle-id="${cycleId}" data-fueling-id="${f.id}" title="Editar"><i data-lucide="edit"></i></button><button class="icon-btn" data-action="delete-fueling" data-cycle-id="${cycleId}" data-fueling-id="${f.id}" title="Excluir"><i data-lucide="trash-2"></i></button></div>` : 'N/A'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
        `;
        break;
      }
      case 'expenses': {
        const expenses = this.dataService.getExpenses(cycleId);
        innerHTML = `
          ${canEdit ? `<button class="btn btn-primary mb-2" data-action="open-expense-modal" data-cycle-id="${cycleId}"><i data-lucide="plus"></i>Adicionar Despesa</button>` : ''}
          ${expenses.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhuma despesa</h3></div>` : `
            <table class="table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead>
              <tbody>
                ${expenses.map(e => `
                  <tr>
                    <td>${new Date(e.data).toLocaleDateString('pt-BR')}</td>
                    <td>${e.descricao}</td>
                    <td>R$ ${parseFloat(e.valor).toFixed(2)}</td>
                    <td>${canEdit ? `<div class="action-buttons"><button class="icon-btn" data-action="open-expense-modal" data-cycle-id="${cycleId}" data-expense-id="${e.id}" title="Editar"><i data-lucide="edit"></i></button><button class="icon-btn" data-action="delete-expense" data-cycle-id="${cycleId}" data-expense-id="${e.id}" title="Excluir"><i data-lucide="trash-2"></i></button></div>` : 'N/A'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
        `;
        break;
      }
    }
    content.innerHTML = innerHTML;
    createIcons({ icons });
  }

  openFreightModal(cycleId, freightId = null) {
    const modal = document.getElementById('freight-modal');
    const modalTitle = document.getElementById('freight-modal-title');
    const form = document.getElementById('freight-form');
    form.reset();
    document.getElementById('freight-id').value = '';
    this._resetImagePreview('freight-photo-departure');
    this._resetImagePreview('freight-photo-arrival');

    if (freightId) {
        modalTitle.textContent = 'Editar Frete';
        const freight = this.dataService.getFreights(cycleId).find(f => f.id === freightId);
        if (freight) {
            document.getElementById('freight-id').value = freight.id;
            document.getElementById('freight-date').value = freight.data;
            document.getElementById('freight-price').value = freight.fretePorTonelada;
            document.getElementById('freight-origin').value = freight.origem;
            document.getElementById('freight-destination').value = freight.destino;
            document.getElementById('freight-weight').value = freight.pesoSaida;
            document.getElementById('freight-arrival-weight').value = freight.pesoChegada;
            document.getElementById('freight-loss').value = freight.valorPerda;
        }
    } else {
        modalTitle.textContent = 'Adicionar Frete';
    }
    modal.classList.add('active');
  }

  saveFreight(cycleId) {
    const freightId = document.getElementById('freight-id').value;
    if (!freightId) {
      if (document.getElementById('freight-photo-departure').files.length === 0) { alert('Por favor, anexe a foto do peso de saída.'); return; }
      if (document.getElementById('freight-arrival-weight').value && document.getElementById('freight-photo-arrival').files.length === 0) { alert('Por favor, anexe a foto do peso de chegada.'); return; }
    }
    const settings = this.dataService.getSettings(this.user.perfil === 'admin' ? this.user.id : this.user.adminVinculado);
    const weight = parseFloat(document.getElementById('freight-weight').value);
    const price = parseFloat(document.getElementById('freight-price').value);
    const valor = (weight * price) / 1000;
    const valorComissao = valor * (settings.commissionPercentage / 100);
    const freightData = {
      data: document.getElementById('freight-date').value,
      origem: document.getElementById('freight-origin').value,
      destino: document.getElementById('freight-destination').value,
      pesoSaida: weight,
      fretePorTonelada: price,
      valor: valor.toFixed(2),
      comissao: settings.commissionPercentage,
      valorComissao: valorComissao.toFixed(2),
      pesoChegada: document.getElementById('freight-arrival-weight').value,
      valorPerda: document.getElementById('freight-loss').value
    };
    if (freightId) this.dataService.updateFreight(freightId, freightData);
    else this.dataService.saveFreight(freightData, cycleId);
    document.getElementById('freight-modal').classList.remove('active');
    this.openCycleDetails(cycleId);
  }

  openFuelingModal(cycleId, fuelingId = null) {
    const modal = document.getElementById('fueling-modal');
    const modalTitle = document.getElementById('fueling-modal-title');
    const form = document.getElementById('fueling-form');
    form.reset();
    document.getElementById('fueling-id').value = '';
    this._resetImagePreview('fueling-km-photo');
    this._resetImagePreview('fueling-photo');

    if (fuelingId) {
        modalTitle.textContent = 'Editar Abastecimento';
        const fueling = this.dataService.getFuelings(cycleId).find(f => f.id === fuelingId);
        if (fueling) {
            document.getElementById('fueling-id').value = fueling.id;
            document.getElementById('fueling-date').value = fueling.data;
            document.getElementById('fueling-station').value = fueling.posto;
            document.getElementById('fueling-km').value = fueling.quilometragem;
            document.getElementById('fueling-arla-qty').value = fueling.qtdLitrosArla;
            document.getElementById('fueling-arla-price').value = fueling.valorLitroArla;
            document.getElementById('fueling-s10-qty').value = fueling.qtdLitrosS10;
            document.getElementById('fueling-s10-price').value = fueling.valorLitroS10;
        }
    } else {
        modalTitle.textContent = 'Adicionar Abastecimento';
    }
    modal.classList.add('active');
  }

  saveFueling(cycleId) {
    const fuelingId = document.getElementById('fueling-id').value;
    if (!fuelingId) {
      if (document.getElementById('fueling-km-photo').files.length === 0) { alert('Por favor, anexe a foto da quilometragem.'); return; }
      if (document.getElementById('fueling-photo').files.length === 0) { alert('Por favor, anexe a foto da nota fiscal.'); return; }
    }
    const arlaQty = parseFloat(document.getElementById('fueling-arla-qty').value) || 0;
    const arlaPrice = parseFloat(document.getElementById('fueling-arla-price').value) || 0;
    const s10Qty = parseFloat(document.getElementById('fueling-s10-qty').value) || 0;
    const s10Price = parseFloat(document.getElementById('fueling-s10-price').value) || 0;
    const total = (arlaQty * arlaPrice) + (s10Qty * s10Price);
    const fuelingData = {
      data: document.getElementById('fueling-date').value,
      posto: document.getElementById('fueling-station').value,
      quilometragem: document.getElementById('fueling-km').value,
      qtdLitrosArla: arlaQty.toFixed(4),
      valorLitroArla: arlaPrice.toFixed(4),
      qtdLitrosS10: s10Qty.toFixed(4),
      valorLitroS10: s10Price.toFixed(4),
      total: total.toFixed(2)
    };
    if (fuelingId) this.dataService.updateFueling(fuelingId, fuelingData);
    else this.dataService.saveFueling(fuelingData, cycleId);
    document.getElementById('fueling-modal').classList.remove('active');
    this.openCycleDetails(cycleId);
  }

  openExpenseModal(cycleId, expenseId = null) {
    const modal = document.getElementById('expense-modal');
    const modalTitle = document.getElementById('expense-modal-title');
    const form = document.getElementById('expense-form');
    form.reset();
    document.getElementById('expense-id').value = '';
    this._resetImagePreview('expense-photo');

    if (expenseId) {
        modalTitle.textContent = 'Editar Despesa';
        const expense = this.dataService.getExpenses(cycleId).find(e => e.id === expenseId);
        if (expense) {
            document.getElementById('expense-id').value = expense.id;
            document.getElementById('expense-date').value = expense.data;
            document.getElementById('expense-description').value = expense.descricao;
            document.getElementById('expense-value').value = expense.valor;
        }
    } else {
        modalTitle.textContent = 'Adicionar Despesa';
    }
    modal.classList.add('active');
  }

  saveExpense(cycleId) {
    const expenseId = document.getElementById('expense-id').value;
    const expenseData = {
      data: document.getElementById('expense-date').value,
      descricao: document.getElementById('expense-description').value,
      valor: document.getElementById('expense-value').value
    };
    if (expenseId) this.dataService.updateExpense(expenseId, expenseData);
    else this.dataService.saveExpense(expenseData, cycleId);
    document.getElementById('expense-modal').classList.remove('active');
    this.openCycleDetails(cycleId);
  }

  renderCadastros(content) {
    content.innerHTML = `
      <div class="page-header"><h1 class="page-title">Cadastros</h1><p class="page-subtitle">Gerencie carros, pneus e trocas</p></div>
      <div class="tabs" id="cadastros-tabs">
        <button class="tab active" data-cadastro="cars"><i data-lucide="car"></i>Carros</button>
        <button class="tab" data-cadastro="tire-brands"><i data-lucide="circle-dot"></i>Marcas de Pneu</button>
        <button class="tab" data-cadastro="tire-changes"><i data-lucide="refresh-cw"></i>Trocas de Pneu</button>
      </div>
      <div id="cadastro-content"></div>`;
    this.setupCadastrosListeners();
    this.showCadastroTab('cars');
  }

  setupCadastrosListeners() {
    document.querySelectorAll('#cadastros-tabs .tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('#cadastros-tabs .tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.showCadastroTab(e.currentTarget.dataset.cadastro);
      });
    });
  }

  showCadastroTab(tabName) {
    const content = document.getElementById('cadastro-content');
    let innerHTML = '';
    switch (tabName) {
      case 'cars': {
        const cars = this.dataService.getCars(this.user.id);
        innerHTML = `
          <div class="card">
            <div class="flex-between mb-3"><h3>Carros Cadastrados</h3><button class="btn btn-primary" data-action="open-car-modal"><i data-lucide="plus"></i>Adicionar Carro</button></div>
            ${cars.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhum carro</h3></div>` : `
              <table class="table"><thead><tr><th>Placa</th><th>Marca</th><th>Data Cadastro</th><th>Ações</th></tr></thead><tbody>
                ${cars.map(car => `<tr><td>${car.placa}</td><td>${car.marca}</td><td>${new Date(car.createdAt).toLocaleDateString('pt-BR')}</td><td><button class="icon-btn" data-action="delete-car" data-car-id="${car.id}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}
              </tbody></table>`}
          </div>
          <div id="car-modal" class="modal"><div class="modal-content"><div class="modal-header"><h2>Adicionar Carro</h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="car-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="car-form"><div class="form-group"><label class="form-label">Placa</label><input type="text" class="form-input" id="car-placa" required></div><div class="form-group"><label class="form-label">Marca</label><input type="text" class="form-input" id="car-marca" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="car-modal">Cancelar</button><button class="btn btn-primary" data-action="save-car">Salvar</button></div></div></div>`;
        break;
      }
      case 'tire-brands': {
        const tireBrands = this.dataService.getTireBrands();
        innerHTML = `
          <div class="card">
            <div class="flex-between mb-3"><h3>Marcas de Pneu</h3><button class="btn btn-primary" data-action="open-tire-brand-modal"><i data-lucide="plus"></i>Adicionar Marca</button></div>
            ${tireBrands.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhuma marca</h3></div>` : `
              <table class="table"><thead><tr><th>Nome da Marca</th><th>Data Cadastro</th></tr></thead><tbody>
                ${tireBrands.map(brand => `<tr><td>${brand.name}</td><td>${new Date(brand.createdAt).toLocaleDateString('pt-BR')}</td></tr>`).join('')}
              </tbody></table>`}
          </div>
          <div id="tire-brand-modal" class="modal"><div class="modal-content"><div class="modal-header"><h2>Adicionar Marca</h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="tire-brand-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="tire-brand-form"><div class="form-group"><label class="form-label">Nome da Marca</label><input type="text" class="form-input" id="tire-brand-name" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="tire-brand-modal">Cancelar</button><button class="btn btn-primary" data-action="save-tire-brand">Salvar</button></div></div></div>`;
        break;
      }
      case 'tire-changes': {
        const tireChanges = this.dataService.getTireChanges(this.user.id);
        const cars = this.dataService.getCars(this.user.id);
        const brands = this.dataService.getTireBrands();
        innerHTML = `
          <div class="card">
            <div class="flex-between mb-3"><h3>Trocas de Pneu</h3><button class="btn btn-primary" data-action="open-tire-change-modal"><i data-lucide="plus"></i>Registrar Troca</button></div>
            ${tireChanges.length === 0 ? `<div class="empty-state"><i data-lucide="inbox"></i><h3>Nenhuma troca</h3></div>` : `
              <table class="table"><thead><tr><th>Data</th><th>Carro</th><th>Marca</th><th>Posição</th><th>KM</th></tr></thead><tbody>
                ${tireChanges.map(change => {
                  const car = cars.find(c => c.id === change.carId);
                  const brand = brands.find(b => b.id === change.brandId);
                  return `<tr><td>${new Date(change.dataTroca).toLocaleDateString('pt-BR')}</td><td>${car?.placa || 'N/A'}</td><td>${brand?.name || 'N/A'}</td><td>${change.posicao}</td><td>${change.kmAtual} km</td></tr>`;
                }).join('')}
              </tbody></table>`}
          </div>
          <div id="tire-change-modal" class="modal"><div class="modal-content"><div class="modal-header"><h2>Registrar Troca</h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="tire-change-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><form id="tire-change-form"><div class="form-group"><label class="form-label">Carro</label><select class="form-select" id="tire-change-car" required>${cars.map(car => `<option value="${car.id}">${car.placa}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Marca</label><select class="form-select" id="tire-change-brand" required>${brands.map(brand => `<option value="${brand.id}">${brand.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Posição</label><select class="form-select" id="tire-change-position" required><option>Dianteiro</option><option>Tração</option><option>Carreta</option></select></div><div class="form-group"><label class="form-label">KM Atual</label><input type="number" id="tire-change-km" class="form-input" required></div><div class="form-group"><label class="form-label">Data Troca</label><input type="date" id="tire-change-date" class="form-input" required></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="tire-change-modal">Cancelar</button><button class="btn btn-primary" data-action="save-tire-change">Salvar</button></div></div></div>`;
        break;
      }
    }
    content.innerHTML = innerHTML;
    createIcons({ icons });
  }

  openCarModal() { document.getElementById('car-modal').classList.add('active'); }
  saveCar() {
    this.dataService.saveCar({ placa: document.getElementById('car-placa').value, marca: document.getElementById('car-marca').value }, this.user.id);
    document.getElementById('car-modal').classList.remove('active');
    this.showCadastroTab('cars');
  }

  openTireBrandModal() { document.getElementById('tire-brand-modal').classList.add('active'); }
  saveTireBrand() {
    this.dataService.saveTireBrand(document.getElementById('tire-brand-name').value);
    document.getElementById('tire-brand-modal').classList.remove('active');
    this.showCadastroTab('tire-brands');
  }

  openTireChangeModal() { document.getElementById('tire-change-modal').classList.add('active'); }
  saveTireChange() {
    const change = {
      carId: document.getElementById('tire-change-car').value,
      brandId: document.getElementById('tire-change-brand').value,
      posicao: document.getElementById('tire-change-position').value,
      kmAtual: document.getElementById('tire-change-km').value,
      dataTroca: document.getElementById('tire-change-date').value
    };
    this.dataService.saveTireChange(change, this.user.id);
    document.getElementById('tire-change-modal').classList.remove('active');
    this.showCadastroTab('tire-changes');
  }

  renderMotoristas(content) {
    const motoristas = this.authService.getAllUsers().filter(u => u.perfil === 'motorista' && u.adminVinculado === this.user.id);
    content.innerHTML = `
      <div class="page-header flex-between">
        <div><h1 class="page-title">Motoristas</h1><p class="page-subtitle">Gerencie seus motoristas e permissões</p></div>
        <button class="btn btn-primary" data-action="invite-driver"><i data-lucide="share-2"></i>Convidar Motorista</button>
      </div>
      <div class="card">
        ${motoristas.length === 0 ? `<div class="empty-state"><i data-lucide="users"></i><h3>Nenhum motorista</h3><p>Clique em "Convidar Motorista" para gerar um link.</p></div>` : `
          <table class="table">
            <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Teste</th><th>Ações</th></tr></thead>
            <tbody>
              ${motoristas.map(motorista => {
                const trialEnds = new Date(motorista.trialEndsAt);
                return `<tr><td>${motorista.nome}</td><td>${motorista.email}</td><td>${motorista.telefone}</td><td><span class="badge ${trialEnds < new Date() ? 'badge-danger' : 'badge-success'}">Até ${trialEnds.toLocaleDateString('pt-BR')}</span></td><td><button class="btn btn-sm btn-primary" data-action="manage-permissions" data-driver-id="${motorista.id}"><i data-lucide="shield"></i>Permissões</button></td></tr>`;
              }).join('')}
            </tbody>
          </table>`}
      </div>
      <div id="invite-driver-modal" class="modal"><div class="modal-content"><div class="modal-header"><h2>Convidar Motorista</h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="invite-driver-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><p>Copie o link abaixo para enviar ao motorista.</p><div class="form-group mt-2"><input type="text" class="form-input" id="invite-link-input" readonly></div></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="invite-driver-modal">Fechar</button></div></div></div>
      <div id="permissions-modal" class="modal"><div class="modal-content"><div class="modal-header"><h2>Gerenciar Permissões</h2><button class="icon-btn" data-action="close-sub-modal" data-modal-id="permissions-modal"><i data-lucide="x"></i></button></div><div class="modal-body"><p id="driver-permissions-name" class="mb-3 font-weight-bold"></p><form id="permissions-form"><div class="form-group"><label class="flex gap-2"><input type="checkbox" id="perm-tire-changes"><span>Visualizar Trocas de Pneu</span></label></div><div class="form-group"><label class="flex gap-2"><input type="checkbox" id="perm-fuelings"><span>Visualizar Abastecimentos</span></label></div><div class="form-group"><label class="flex gap-2"><input type="checkbox" id="perm-expenses"><span>Visualizar Despesas</span></label></div></form></div><div class="modal-footer"><button class="btn btn-secondary" data-action="close-sub-modal" data-modal-id="permissions-modal">Cancelar</button><button class="btn btn-primary" id="save-permissions-btn" data-action="save-permissions">Salvar</button></div></div></div>`;
    createIcons({ icons });
  }

  showInviteDriverModal() {
    const inviteLink = `${window.location.origin}/?invite_admin_id=${this.user.id}`;
    const inviteInput = document.getElementById('invite-link-input');
    inviteInput.value = inviteLink;
    document.getElementById('invite-driver-modal').classList.add('active');
    inviteInput.focus();
    inviteInput.select();
  }

  openPermissionsModal(driverId) {
    const driver = this.authService.getAllUsers().find(m => m.id === driverId);
    const permissions = this.dataService.getPermissions(driverId);
    document.getElementById('driver-permissions-name').textContent = `Motorista: ${driver.nome}`;
    document.getElementById('perm-tire-changes').checked = permissions.viewTireChanges;
    document.getElementById('perm-fuelings').checked = permissions.viewFuelings;
    document.getElementById('perm-expenses').checked = permissions.viewExpenses;
    document.getElementById('save-permissions-btn').dataset.currentDriverId = driverId;
    document.getElementById('permissions-modal').classList.add('active');
  }

  savePermissions(driverId) {
    if (!driverId) return;
    const permissions = {
      viewTireChanges: document.getElementById('perm-tire-changes').checked,
      viewFuelings: document.getElementById('perm-fuelings').checked,
      viewExpenses: document.getElementById('perm-expenses').checked
    };
    this.dataService.savePermissions(driverId, permissions);
    document.getElementById('permissions-modal').classList.remove('active');
  }

  renderConfig(content) {
    const settings = this.dataService.getSettings(this.user.id);
    content.innerHTML = `
      <div class="page-header"><h1 class="page-title">Configurações</h1><p class="page-subtitle">Ajuste as configurações do sistema</p></div>
      <div class="card">
        <h3 class="mb-3">Configurações de Comissão</h3>
        <form id="settings-form">
          <div class="form-group"><label class="form-label">Percentual de Comissão (%)</label><input type="number" class="form-input" id="commission-percentage" value="${settings.commissionPercentage}" step="0.01" min="0" max="100" required><p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 0.5rem;">Este percentual será usado no cálculo automático da comissão.</p></div>
          <button type="submit" class="btn btn-primary" data-action="save-settings"><i data-lucide="save"></i>Salvar</button>
        </form>
      </div>
      <div class="card mt-3">
        <h3 class="mb-2">Informações da Conta</h3>
        <p><strong>Nome:</strong> ${this.user.nome}</p>
        <p><strong>Email:</strong> ${this.user.email}</p>
      </div>`;
    createIcons({ icons });
  }

  saveSettings() {
    const newSettings = { commissionPercentage: parseFloat(document.getElementById('commission-percentage').value) };
    this.dataService.saveSettings(this.user.id, newSettings);
    alert('Configurações salvas com sucesso!');
  }
}
