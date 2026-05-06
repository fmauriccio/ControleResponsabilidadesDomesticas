/* ================================================================
   CasaFlow — app.js
   Arquitetura POO: Database · Auth · UI · Charts · App
================================================================ */

'use strict';

// ─────────────────────────────────────────────
// CONFIGURAÇÃO SUPABASE
// ─────────────────────────────────────────────
const SUPABASE_URL = 'https://hyyjetmxkvuodozxwgif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ulmNU-GR3i8cxTCTVT6lGg_CZ14LE8C';

// ─────────────────────────────────────────────
// CLASSE: Database (camada de acesso a dados)
// ─────────────────────────────────────────────
class Database {
  constructor(url, key) {
    this.base = `${url}/rest/v1`;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async #request(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.base}${endpoint}`, {
        headers: this.headers,
        ...options
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      console.error('[DB Error]', e);
      throw e;
    }
  }

  select(table, query = '') {
    const qs = query ? `?${query}` : '';
    return this.#request(`/${table}${qs}`);
  }

  insert(table, data) {
    return this.#request(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  update(table, id, data) {
    return this.#request(`/${table}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  remove(table, id) {
    return this.#request(`/${table}?id=eq.${id}`, {
      method: 'DELETE'
    });
  }

  removeWhere(table, field, value) {
    return this.#request(`/${table}?${field}=eq.${value}`, {
      method: 'DELETE'
    });
  }
}

// ─────────────────────────────────────────────
// CLASSE: Auth (autenticação customizada)
// ─────────────────────────────────────────────
class Auth {
  #db;
  #user = null;

  constructor(db) {
    this.#db = db;
    const saved = localStorage.getItem('cf_user');
    if (saved) this.#user = JSON.parse(saved);
  }

  get currentUser() { return this.#user; }
  get isLoggedIn()  { return !!this.#user; }

  async login(username, senha) {
    if (!username || !senha) throw new Error('Preencha usuário e senha');
    const rows = await this.#db.select('usuarios',
      `username=eq.${encodeURIComponent(username)}&senha=eq.${encodeURIComponent(senha)}`
    );
    if (!rows.length) throw new Error('Usuário ou senha incorretos');
    this.#user = rows[0];
    localStorage.setItem('cf_user', JSON.stringify(rows[0]));
    return rows[0];
  }

  async register(nome, username, senha) {
    if (!nome || !username || !senha) throw new Error('Preencha todos os campos');
    if (senha.length < 4) throw new Error('Senha deve ter no mínimo 4 caracteres');
    const existing = await this.#db.select('usuarios', `username=eq.${encodeURIComponent(username)}`);
    if (existing.length) throw new Error('Usuário já existe');
    const rows = await this.#db.insert('usuarios', { nome, username, senha });
    this.#user = rows[0];
    localStorage.setItem('cf_user', JSON.stringify(rows[0]));
    return rows[0];
  }

  logout() {
    this.#user = null;
    localStorage.removeItem('cf_user');
  }
}

// ─────────────────────────────────────────────
// CLASSE: UI (renderização e modais)
// ─────────────────────────────────────────────
class UI {
  static EMOJIS = ['😊','😎','🦁','🐻','🦊','🐼','🌟','🔥','⚡','🎯','🏆','💪','🌈','🍀','🎨'];

  static toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  static openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  static closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  }

  static closeModalOut(e, id) {
    if (e.target.id === id) UI.closeModal(id);
  }

  static togglePwd(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
  }

  static populateSelect(selectId, items, valueFn, labelFn, placeholder = '— Selecionar —') {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = valueFn(item);
      opt.textContent = labelFn(item);
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  }

  static buildEmojiPicker(containerId, selectedEmoji = '😊') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    UI.EMOJIS.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-opt' + (em === selectedEmoji ? ' selected' : '');
      btn.textContent = em;
      btn.dataset.emoji = em;
      btn.onclick = () => {
        container.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      container.appendChild(btn);
    });
  }

  static getSelectedEmoji(containerId) {
    const sel = document.querySelector(`#${containerId} .emoji-opt.selected`);
    return sel ? sel.dataset.emoji : '😊';
  }

  static setPriority(btn) {
    btn.closest('.priority-btns')?.querySelectorAll('.prio-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  static getActivePriority() {
    return document.querySelector('.prio-btn.active')?.dataset.val ?? 'media';
  }

  static setActivePriority(val) {
    document.querySelectorAll('.prio-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === val);
    });
  }

  static badge(text, cls) {
    return `<span class="badge badge-${cls}">${text}</span>`;
  }

  static statusBadge(status) {
    const map = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída' };
    return UI.badge(map[status] ?? status, status);
  }

  static priorityBadge(p) {
    const map = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
    return UI.badge(map[p] ?? p, p);
  }

  static empty(msg = 'Nenhum item encontrado') {
    return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
  }

  static loading() {
    return `<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>`;
  }
}

// ─────────────────────────────────────────────
// CLASSE: Charts (gráficos Chart.js)
// ─────────────────────────────────────────────
class Charts {
  #instances = {};

  #palette = ['#6c63ff','#43e97b','#f9ca24','#ff6b6b','#74b9ff','#fd79a8'];

  #defaultOpts(type) {
    const base = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#8990a8', font: { family: 'DM Sans', size: 12 } }
        },
        tooltip: { backgroundColor: '#1e2330', titleColor: '#eef0f5', bodyColor: '#8990a8' }
      }
    };
    if (type === 'bar' || type === 'line') {
      base.scales = {
        x: { ticks: { color: '#8990a8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8990a8' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      };
    }
    return base;
  }

  #destroy(id) {
    if (this.#instances[id]) {
      this.#instances[id].destroy();
      delete this.#instances[id];
    }
  }

  renderBar(canvasId, labels, data, label = '') {
    this.#destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.#instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label, data, backgroundColor: this.#palette, borderRadius: 6, borderSkipped: false }]
      },
      options: this.#defaultOpts('bar')
    });
  }

  renderDoughnut(canvasId, labels, data) {
    this.#destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.#instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: this.#palette, borderWidth: 0, hoverOffset: 6 }]
      },
      options: { ...this.#defaultOpts('doughnut'), cutout: '68%' }
    });
  }

  renderLine(canvasId, labels, data, label = '') {
    this.#destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.#instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label, data,
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#6c63ff',
          pointRadius: 4,
          tension: 0.35,
          fill: true
        }]
      },
      options: this.#defaultOpts('line')
    });
  }

  renderPie(canvasId, labels, data) {
    this.#destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.#instances[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: this.#palette, borderWidth: 0, hoverOffset: 6 }]
      },
      options: this.#defaultOpts('pie')
    });
  }
}

// ─────────────────────────────────────────────
// CLASSE: App (controlador principal)
// ─────────────────────────────────────────────
class App {
  #db;
  #auth;
  #ui;
  #charts;

  // Estado em memória
  #state = {
    responsaveis: [],
    atividades: [],
    designacoes: [],
    areas: [],
    membros: []
  };

  constructor() {
    this.#db     = new Database(SUPABASE_URL, SUPABASE_KEY);
    this.#auth   = new Auth(this.#db);
    this.#ui     = new UI();
    this.#charts = new Charts();
  }

  // ── INICIALIZAÇÃO ──────────────────────────
  async init() {
    this.#setDate();
    if (this.#auth.isLoggedIn) {
      await this.#loadAll();
      this.#showApp();
    } else {
      this.#showAuth();
    }
    this.#bindGlobals();
  }

  #showAuth() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  #showApp() {
    const user = this.#auth.currentUser;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('greetUser').textContent = user?.nome?.split(' ')[0] ?? '';
    document.getElementById('sidebarUser').textContent = `👤 ${user?.username ?? ''}`;
    const initials = (user?.nome ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('topAvatar').textContent = initials;
    this.showPage('dashboard');
  }

  #setDate() {
    const el = document.getElementById('dateBadge');
    if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  async #loadAll() {
    try {
      const [resp, ativ, desig, areas, membros] = await Promise.all([
        this.#db.select('responsaveis', 'order=nome.asc'),
        this.#db.select('atividades',   'order=created_at.desc'),
        this.#db.select('designacoes',  'order=created_at.desc'),
        this.#db.select('areas_gestao', 'order=nome.asc'),
        this.#db.select('area_membros')
      ]);
      this.#state.responsaveis = resp   ?? [];
      this.#state.atividades   = ativ   ?? [];
      this.#state.designacoes  = desig  ?? [];
      this.#state.areas        = areas  ?? [];
      this.#state.membros      = membros ?? [];
    } catch (e) {
      UI.toast('Erro ao carregar dados: ' + e.message, 'error');
    }
  }

  // ── NAVEGAÇÃO ──────────────────────────────
  showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`page-${page}`);
    if (section) section.classList.remove('hidden');

    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    const titles = {
      dashboard: 'Dashboard', atividades: 'Atividades',
      designacoes: 'Designações', gestao: 'Gestão de Área',
      responsaveis: 'Responsáveis', relatorios: 'Relatórios'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] ?? page;

    // Fechar sidebar no mobile
    if (window.innerWidth < 768) this.toggleSidebar(false);

    this.#renderPage(page);
  }

  async #renderPage(page) {
    await this.#loadAll();
    switch (page) {
      case 'dashboard':    this.#renderDashboard();    break;
      case 'atividades':   this.renderAtividades();     break;
      case 'designacoes':  this.#renderDesignacoes();   break;
      case 'gestao':       this.#renderGestao();        break;
      case 'responsaveis': this.#renderResponsaveis();  break;
    }
  }

  // ── SIDEBAR ────────────────────────────────
  toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    const open = force !== undefined ? force : !isOpen;
    sidebar.classList.toggle('open', open);
    // overlay para mobile
    let overlay = document.getElementById('sidebarOverlay');
    if (open && window.innerWidth < 768) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        overlay.onclick = () => this.toggleSidebar(false);
        document.body.appendChild(overlay);
      }
      overlay.classList.add('visible');
    } else if (overlay) {
      overlay.classList.remove('visible');
    }
  }

  // ── AUTH ───────────────────────────────────
  switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
    });
  }

  async doLogin() {
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    const username = document.getElementById('loginUser').value.trim();
    const senha    = document.getElementById('loginPass').value;
    try {
      await this.#auth.login(username, senha);
      await this.#loadAll();
      this.#showApp();
    } catch (e) {
      errEl.textContent = e.message;
    }
  }

  async doRegister() {
    const errEl = document.getElementById('regError');
    errEl.textContent = '';
    const nome    = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const senha   = document.getElementById('regPass').value;
    const senha2  = document.getElementById('regPass2').value;
    if (senha !== senha2) { errEl.textContent = 'As senhas não coincidem'; return; }
    try {
      await this.#auth.register(nome, username, senha);
      await this.#loadAll();
      this.#showApp();
    } catch (e) {
      errEl.textContent = e.message;
    }
  }

  doLogout() {
    this.#auth.logout();
    this.#showAuth();
  }

  // ── DASHBOARD ──────────────────────────────
  #renderDashboard() {
    const { atividades, responsaveis, areas } = this.#state;
    const total     = atividades.length;
    const concluidas = atividades.filter(a => a.status === 'concluida').length;
    const pendentes  = atividades.filter(a => a.status === 'pendente').length;
    const andamento  = atividades.filter(a => a.status === 'em_andamento').length;

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card c1"><div class="stat-icon">📋</div>
        <div class="stat-val">${total}</div><div class="stat-label">Total de Atividades</div></div>
      <div class="stat-card c2"><div class="stat-icon">✅</div>
        <div class="stat-val">${concluidas}</div><div class="stat-label">Concluídas</div></div>
      <div class="stat-card c3"><div class="stat-icon">⏳</div>
        <div class="stat-val">${pendentes}</div><div class="stat-label">Pendentes</div></div>
      <div class="stat-card c4"><div class="stat-icon">🔄</div>
        <div class="stat-val">${andamento}</div><div class="stat-label">Em Andamento</div></div>
    `;

    // Gráfico: conclusão por responsável
    const barLabels = responsaveis.map(r => r.apelido || r.nome.split(' ')[0]);
    const barData   = responsaveis.map(r =>
      atividades.filter(a => a.responsavel_id === r.id && a.status === 'concluida').length
    );
    this.#charts.renderBar('chartBar', barLabels, barData, 'Concluídas');

    // Gráfico: status
    this.#charts.renderDoughnut('chartDoughnut',
      ['Pendente', 'Em andamento', 'Concluída'],
      [pendentes, andamento, concluidas]
    );

    // Gráfico: por período (linha, últimas 7 criações por dia)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const lineData = days.map(d =>
      atividades.filter(a => (a.created_at || '').slice(0, 10) === d).length
    );
    this.#charts.renderLine('chartPeriod',
      days.map(d => d.slice(5)), lineData, 'Atividades criadas'
    );

    // Gráfico: por área
    const areaLabels = areas.map(a => a.nome);
    const areaData   = areas.map(a =>
      atividades.filter(at => at.area_id === a.id).length
    );
    this.#charts.renderPie('chartArea', areaLabels, areaData);

    // Lista de hoje
    const today = new Date().toISOString().slice(0, 10);
    const todayItems = atividades.filter(a =>
      a.recorrencia === 'diaria' || (a.created_at || '').slice(0, 10) === today
    ).slice(0, 8);

    const todayList = document.getElementById('todayList');
    if (!todayItems.length) {
      todayList.innerHTML = UI.empty('Nenhuma atividade para hoje');
      return;
    }
    todayList.innerHTML = todayItems.map(a => {
      const resp = this.#state.responsaveis.find(r => r.id === a.responsavel_id);
      const done = a.status === 'concluida';
      return `
        <div class="today-item">
          <div class="today-check ${done ? 'done' : ''}" onclick="app.toggleTodayCheck('${a.id}', this)"></div>
          <div class="today-info">
            <div class="today-name ${done ? 'striked' : ''}">${a.nome}</div>
            <div class="today-sub">${a.periodo || a.recorrencia}</div>
          </div>
          <span class="today-resp">${resp ? resp.emoji + ' ' + (resp.apelido || resp.nome.split(' ')[0]) : ''}</span>
        </div>
      `;
    }).join('');
  }

  async toggleTodayCheck(id, el) {
    const atv = this.#state.atividades.find(a => a.id === id);
    if (!atv) return;
    const newStatus = atv.status === 'concluida' ? 'pendente' : 'concluida';
    await this.#db.update('atividades', id, { status: newStatus });
    atv.status = newStatus;
    el.classList.toggle('done', newStatus === 'concluida');
    el.nextElementSibling.querySelector('.today-name').classList.toggle('striked', newStatus === 'concluida');
    UI.toast(newStatus === 'concluida' ? 'Atividade concluída! ✅' : 'Atividade reaberta');
    this.#renderDashboard();
  }

  // ── ATIVIDADES ─────────────────────────────
  renderAtividades() {
    const search  = (document.getElementById('searchAtiv')?.value ?? '').toLowerCase();
    const status  = document.getElementById('filterStatus')?.value ?? '';
    const respId  = document.getElementById('filterResp')?.value ?? '';

    UI.populateSelect('filterResp', this.#state.responsaveis, r => r.id, r => r.apelido || r.nome, 'Todos responsáveis');
    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`, '— Selecionar —');
    UI.populateSelect('ativGestao', this.#state.areas,         a => a.id, a => a.nome, '— Nenhuma —');

    let list = this.#state.atividades;
    if (search) list = list.filter(a => a.nome.toLowerCase().includes(search) || (a.descricao ?? '').toLowerCase().includes(search));
    if (status) list = list.filter(a => a.status === status);
    if (respId) list = list.filter(a => a.responsavel_id === respId);

    const container = document.getElementById('ativList');
    if (!list.length) { container.innerHTML = UI.empty('Nenhuma atividade encontrada'); return; }

    container.innerHTML = list.map(a => {
      const resp = this.#state.responsaveis.find(r => r.id === a.responsavel_id);
      return `
        <div class="activity-card">
          <div class="card-top">
            <span class="card-name">${a.nome}</span>
            <div class="card-actions">
              <button class="btn-icon" onclick="app.editAtividade('${a.id}')" title="Editar">✏️</button>
              <button class="btn-icon" onclick="app.deleteAtividade('${a.id}')" title="Excluir">🗑️</button>
            </div>
          </div>
          <div class="card-meta">
            ${UI.statusBadge(a.status)}
            ${UI.priorityBadge(a.prioridade)}
            ${a.periodo ? `<span class="card-periodo">🕐 ${a.periodo}</span>` : ''}
          </div>
          ${a.descricao ? `<div class="card-desc">${a.descricao}</div>` : ''}
          <div class="card-resp">
            <div class="resp-dot"></div>
            ${resp ? `${resp.emoji} ${resp.nome}` : '<span style="color:var(--text3)">Sem responsável</span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  openModalAtividade() {
    document.getElementById('ativId').value = '';
    document.getElementById('ativNome').value = '';
    document.getElementById('ativDesc').value = '';
    document.getElementById('ativPeriodo').value = '';
    document.getElementById('ativRecorrencia').value = 'diaria';
    document.getElementById('ativStatus').value = 'pendente';
    document.getElementById('modalAtivTitle').textContent = 'Nova Atividade';
    UI.setActivePriority('media');
    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    UI.populateSelect('ativGestao', this.#state.areas,         a => a.id, a => a.nome, '— Nenhuma —');
    UI.openModal('modalAtividade');
  }

  editAtividade(id) {
    const a = this.#state.atividades.find(x => x.id === id);
    if (!a) return;
    document.getElementById('ativId').value = a.id;
    document.getElementById('ativNome').value = a.nome;
    document.getElementById('ativDesc').value = a.descricao ?? '';
    document.getElementById('ativPeriodo').value = a.periodo ?? '';
    document.getElementById('ativRecorrencia').value = a.recorrencia ?? 'diaria';
    document.getElementById('ativStatus').value = a.status ?? 'pendente';
    document.getElementById('modalAtivTitle').textContent = 'Editar Atividade';
    UI.setActivePriority(a.prioridade ?? 'media');
    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    UI.populateSelect('ativGestao', this.#state.areas,         x => x.id, x => x.nome, '— Nenhuma —');
    document.getElementById('ativResp').value   = a.responsavel_id ?? '';
    document.getElementById('ativGestao').value = a.area_id ?? '';
    UI.openModal('modalAtividade');
  }

  async salvarAtividade() {
    const id     = document.getElementById('ativId').value;
    const nome   = document.getElementById('ativNome').value.trim();
    if (!nome) { UI.toast('Informe o nome da atividade', 'error'); return; }

    const payload = {
      nome,
      descricao:      document.getElementById('ativDesc').value.trim(),
      periodo:        document.getElementById('ativPeriodo').value.trim(),
      recorrencia:    document.getElementById('ativRecorrencia').value,
      status:         document.getElementById('ativStatus').value,
      prioridade:     UI.getActivePriority(),
      responsavel_id: document.getElementById('ativResp').value || null,
      area_id:        document.getElementById('ativGestao').value || null
    };

    try {
      if (id) {
        await this.#db.update('atividades', id, payload);
        UI.toast('Atividade atualizada ✅');
      } else {
        await this.#db.insert('atividades', payload);
        UI.toast('Atividade criada ✅');
      }
      UI.closeModal('modalAtividade');
      await this.#loadAll();
      this.renderAtividades();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  async deleteAtividade(id) {
    if (!confirm('Excluir esta atividade?')) return;
    try {
      await this.#db.remove('atividades', id);
      UI.toast('Atividade excluída');
      await this.#loadAll();
      this.renderAtividades();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  // ── DESIGNAÇÕES ────────────────────────────
  #renderDesignacoes() {
    UI.populateSelect('desigAtiv', this.#state.atividades,  a => a.id, a => a.nome);
    UI.populateSelect('desigResp', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);

    const container = document.getElementById('designList');
    const list = this.#state.designacoes;
    if (!list.length) { container.innerHTML = UI.empty('Nenhuma designação cadastrada'); return; }

    container.innerHTML = list.map(d => {
      const atv  = this.#state.atividades.find(a => a.id === d.atividade_id);
      const resp = this.#state.responsaveis.find(r => r.id === d.responsavel_id);
      return `
        <div class="activity-card">
          <div class="card-top">
            <span class="card-name">${atv?.nome ?? '—'}</span>
            <div class="card-actions">
              <button class="btn-icon" onclick="app.deleteDesignacao('${d.id}')" title="Excluir">🗑️</button>
            </div>
          </div>
          <div class="card-resp">
            <div class="resp-dot"></div>
            ${resp ? `${resp.emoji} ${resp.nome}` : '—'}
          </div>
          ${d.data_inicio ? `<div class="card-periodo">📅 ${d.data_inicio} → ${d.data_fim ?? '?'}</div>` : ''}
          ${d.observacao ? `<div class="card-desc">${d.observacao}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  async salvarDesignacao() {
    const ativId = document.getElementById('desigAtiv').value;
    const respId = document.getElementById('desigResp').value;
    if (!ativId || !respId) { UI.toast('Selecione atividade e responsável', 'error'); return; }

    const payload = {
      atividade_id:   ativId,
      responsavel_id: respId,
      data_inicio:    document.getElementById('desigInicio').value || null,
      data_fim:       document.getElementById('desigFim').value    || null,
      observacao:     document.getElementById('desigObs').value.trim()
    };
    try {
      await this.#db.insert('designacoes', payload);
      UI.toast('Designação criada ✅');
      UI.closeModal('modalDesignacao');
      await this.#loadAll();
      this.#renderDesignacoes();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  async deleteDesignacao(id) {
    if (!confirm('Excluir esta designação?')) return;
    try {
      await this.#db.remove('designacoes', id);
      UI.toast('Designação excluída');
      await this.#loadAll();
      this.#renderDesignacoes();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  // ── GESTÃO DE ÁREA ─────────────────────────
  #renderGestao() {
    UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    this.#buildMembrosCheckboxes();

    const container = document.getElementById('gestaoList');
    const list = this.#state.areas;
    if (!list.length) { container.innerHTML = UI.empty('Nenhuma área cadastrada'); return; }

    container.innerHTML = list.map(area => {
      const gestor  = this.#state.responsaveis.find(r => r.id === area.gestor_id);
      const members = this.#state.membros
        .filter(m => m.area_id === area.id)
        .map(m => this.#state.responsaveis.find(r => r.id === m.responsavel_id))
        .filter(Boolean);
      return `
        <div class="gestao-card">
          <div class="gestao-top">
            <span class="gestao-nome">${area.nome}</span>
            <div class="card-actions">
              <button class="btn-icon" onclick="app.editArea('${area.id}')" title="Editar">✏️</button>
              <button class="btn-icon" onclick="app.deleteArea('${area.id}')" title="Excluir">🗑️</button>
            </div>
          </div>
          ${area.descricao ? `<div class="gestao-desc">${area.descricao}</div>` : ''}
          ${gestor ? `
            <div class="gestao-leader">
              <span>${gestor.emoji}</span>
              <div><div class="leader-label">Gestor</div><div class="leader-name">${gestor.nome}</div></div>
            </div>` : ''}
          <div class="gestao-team">
            ${members.map(m => `<span class="member-chip">${m.emoji} ${m.apelido || m.nome.split(' ')[0]}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  #buildMembrosCheckboxes(selectedIds = []) {
    const container = document.getElementById('gestaoMembros');
    if (!container) return;
    container.innerHTML = this.#state.responsaveis.map(r => `
      <label class="checkbox-item">
        <input type="checkbox" value="${r.id}" ${selectedIds.includes(r.id) ? 'checked' : ''}>
        <span>${r.emoji} ${r.nome}</span>
      </label>
    `).join('');
  }

  editArea(id) {
    const area = this.#state.areas.find(a => a.id === id);
    if (!area) return;
    document.getElementById('gestaoId').value   = area.id;
    document.getElementById('gestaoNome').value  = area.nome;
    document.getElementById('gestaoDesc').value  = area.descricao ?? '';
    document.getElementById('modalGestaoTitle').textContent = 'Editar Área';
    UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    document.getElementById('gestaoGestor').value = area.gestor_id ?? '';
    const memberIds = this.#state.membros.filter(m => m.area_id === id).map(m => m.responsavel_id);
    this.#buildMembrosCheckboxes(memberIds);
    UI.openModal('modalGestao');
  }

  async salvarGestao() {
    const id    = document.getElementById('gestaoId').value;
    const nome  = document.getElementById('gestaoNome').value.trim();
    if (!nome) { UI.toast('Informe o nome da área', 'error'); return; }

    const payload = {
      nome,
      descricao:  document.getElementById('gestaoDesc').value.trim(),
      gestor_id: document.getElementById('gestaoGestor').value || null
    };

    const checked = [...document.querySelectorAll('#gestaoMembros input:checked')].map(i => i.value);

    try {
      let areaId = id;
      if (id) {
        await this.#db.update('areas_gestao', id, payload);
      } else {
        const rows = await this.#db.insert('areas_gestao', payload);
        areaId = rows[0].id;
      }
      // Atualizar membros: apagar e re-inserir
      await this.#db.removeWhere('area_membros', 'area_id', areaId);
      for (const rId of checked) {
        await this.#db.insert('area_membros', { area_id: areaId, responsavel_id: rId });
      }
      UI.toast(id ? 'Área atualizada ✅' : 'Área criada ✅');
      UI.closeModal('modalGestao');
      await this.#loadAll();
      this.#renderGestao();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  async deleteArea(id) {
    if (!confirm('Excluir esta área?')) return;
    try {
      await this.#db.remove('areas_gestao', id);
      UI.toast('Área excluída');
      await this.#loadAll();
      this.#renderGestao();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  // ── RESPONSÁVEIS ───────────────────────────
  #renderResponsaveis() {
    UI.buildEmojiPicker('emojiPicker');
    const container = document.getElementById('respList');
    const list = this.#state.responsaveis;
    if (!list.length) { container.innerHTML = UI.empty('Nenhum responsável cadastrado'); return; }

    container.innerHTML = list.map(r => {
      const total     = this.#state.atividades.filter(a => a.responsavel_id === r.id).length;
      const concluidas = this.#state.atividades.filter(a => a.responsavel_id === r.id && a.status === 'concluida').length;
      return `
        <div class="resp-card">
          <div class="resp-emoji">${r.emoji}</div>
          <div class="resp-name">${r.nome}</div>
          ${r.apelido ? `<div class="resp-sub">${r.apelido}</div>` : ''}
          <div class="resp-stats">
            <span class="resp-stat">📋 ${total}</span>
            <span class="resp-stat">✅ ${concluidas}</span>
          </div>
          <div class="resp-actions">
            <button class="btn-icon" onclick="app.deleteResponsavel('${r.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async salvarResponsavel() {
    const nome    = document.getElementById('respNome').value.trim();
    const apelido = document.getElementById('respApelido').value.trim();
    if (!nome) { UI.toast('Informe o nome', 'error'); return; }
    const emoji = UI.getSelectedEmoji('emojiPicker');
    try {
      await this.#db.insert('responsaveis', { nome, apelido, emoji });
      UI.toast('Responsável adicionado ✅');
      document.getElementById('respNome').value    = '';
      document.getElementById('respApelido').value = '';
      UI.closeModal('modalResponsavel');
      await this.#loadAll();
      this.#renderResponsaveis();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  async deleteResponsavel(id) {
    if (!confirm('Excluir este responsável?')) return;
    try {
      await this.#db.remove('responsaveis', id);
      UI.toast('Responsável excluído');
      await this.#loadAll();
      this.#renderResponsaveis();
    } catch (e) {
      UI.toast('Erro: ' + e.message, 'error');
    }
  }

  // ── RELATÓRIOS ─────────────────────────────
  async gerarRelatorio() {
    UI.populateSelect('repResp', this.#state.responsaveis, r => r.id, r => r.nome, 'Todos responsáveis');
    const respId  = document.getElementById('repResp').value;
    const periodo = document.getElementById('repPeriodo').value;

    let list = [...this.#state.atividades];
    if (respId)  list = list.filter(a => a.responsavel_id === respId);
    if (periodo) list = list.filter(a => (a.periodo ?? '').toLowerCase().includes(periodo.toLowerCase()));

    const container = document.getElementById('relatorioContent');
    if (!list.length) { container.innerHTML = UI.empty('Nenhuma atividade para os filtros selecionados'); return; }

    container.innerHTML = `
      <div class="report-table-wrap">
        <table>
          <thead><tr>
            <th>Atividade</th><th>Status</th><th>Prioridade</th>
            <th>Período</th><th>Responsável</th>
          </tr></thead>
          <tbody>
            ${list.map(a => {
              const resp = this.#state.responsaveis.find(r => r.id === a.responsavel_id);
              return `<tr>
                <td>${a.nome}</td>
                <td>${UI.statusBadge(a.status)}</td>
                <td>${UI.priorityBadge(a.prioridade)}</td>
                <td>${a.periodo || '—'}</td>
                <td>${resp ? `${resp.emoji} ${resp.nome}` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── BINDINGS GLOBAIS (exigidos pelo HTML) ──
  #bindGlobals() {
    window.app              = this;
    window.switchTab        = tab  => this.switchTab(tab);
    window.doLogin          = ()   => this.doLogin();
    window.doRegister       = ()   => this.doRegister();
    window.doLogout         = ()   => this.doLogout();
    window.showPage         = page => this.showPage(page);
    window.toggleSidebar    = ()   => this.toggleSidebar();
    window.togglePwd        = (id, btn) => UI.togglePwd(id, btn);
    window.setPriority      = btn  => UI.setPriority(btn);
    window.openModal        = id   => {
      if (id === 'modalAtividade') this.openModalAtividade();
      else if (id === 'modalDesignacao') {
        UI.populateSelect('desigAtiv', this.#state.atividades,  a => a.id, a => a.nome);
        UI.populateSelect('desigResp', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
        document.getElementById('desigId').value = '';
        document.getElementById('desigInicio').value = '';
        document.getElementById('desigFim').value = '';
        document.getElementById('desigObs').value = '';
        UI.openModal(id);
      } else if (id === 'modalGestao') {
        document.getElementById('gestaoId').value   = '';
        document.getElementById('gestaoNome').value  = '';
        document.getElementById('gestaoDesc').value  = '';
        document.getElementById('modalGestaoTitle').textContent = 'Nova Área de Gestão';
        UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
        this.#buildMembrosCheckboxes();
        UI.openModal(id);
      } else if (id === 'modalResponsavel') {
        document.getElementById('respNome').value    = '';
        document.getElementById('respApelido').value = '';
        UI.buildEmojiPicker('emojiPicker');
        UI.openModal(id);
      } else {
        UI.openModal(id);
      }
    };
    window.closeModal       = id   => UI.closeModal(id);
    window.closeModalOut    = (e, id) => UI.closeModalOut(e, id);
    window.salvarAtividade  = ()   => this.salvarAtividade();
    window.salvarDesignacao = ()   => this.salvarDesignacao();
    window.salvarGestao     = ()   => this.salvarGestao();
    window.salvarResponsavel= ()   => this.salvarResponsavel();
    window.renderAtividades = ()   => this.renderAtividades();
    window.gerarRelatorio   = ()   => this.gerarRelatorio();
  }
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
