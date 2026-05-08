/* ================================================================
   CasaFlow — app.js  (v3 — Dashboard por usuário + Atividades agrupadas)
   POO: Database · Auth · Periodo · UI · Charts · App
================================================================ */

'use strict';

const SUPABASE_URL = 'https://hyyjetmxkvuodozxwgif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ulmNU-GR3i8cxTCTVT6lGg_CZ14LE8C';

// ─────────────────────────────────────────────────────────────
// CLASSE: Periodo
// ─────────────────────────────────────────────────────────────
class Periodo {
  static getRef(recorrencia) {
    const hoje = new Date();
    if (recorrencia === 'diaria') return Periodo.iso(hoje);
    if (recorrencia === 'semanal') {
      const dow = hoje.getDay();
      const seg = new Date(hoje);
      seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
      return Periodo.iso(seg);
    }
    if (recorrencia === 'mensal') {
      const m = String(hoje.getMonth() + 1).padStart(2, '0');
      return `${hoje.getFullYear()}-${m}-01`;
    }
    return null;
  }

  static iso(date)           { return date.toISOString().slice(0, 10); }
  static hoje()              { return Periodo.iso(new Date()); }
  static icone(rec)          { return { diaria:'☀️', semanal:'📅', mensal:'📆', unica:'📌' }[rec] ?? '📋'; }
  static label(rec)          { return { diaria:'Diária', semanal:'Semanal', mensal:'Mensal', unica:'Única vez' }[rec] ?? rec; }
  static labelPeriodo(rec)   { return { diaria:'hoje', semanal:'esta semana', mensal:'este mês', unica:'' }[rec] ?? ''; }
}

// ─────────────────────────────────────────────────────────────
// CLASSE: Database
// ─────────────────────────────────────────────────────────────
class Database {
  constructor(url, key) {
    this.base = `${url}/rest/v1`;
    this.headers = {
      'apikey': key, 'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    };
  }

  async #req(endpoint, opts = {}) {
    const res = await fetch(`${this.base}${endpoint}`, { headers: this.headers, ...opts });
    if (!res.ok) throw new Error(await res.text());
    const t = await res.text();
    return t ? JSON.parse(t) : [];
  }

  select(table, qs = '')  { return this.#req(`/${table}${qs ? '?' + qs : ''}`); }
  insert(table, data)     { return this.#req(`/${table}`, { method: 'POST', body: JSON.stringify(data) }); }
  update(table, id, data) { return this.#req(`/${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  remove(table, id)       { return this.#req(`/${table}?id=eq.${id}`, { method: 'DELETE' }); }
  removeWhere(t, f, v)    { return this.#req(`/${t}?${f}=eq.${v}`, { method: 'DELETE' }); }
}

// ─────────────────────────────────────────────────────────────
// CLASSE: Auth
// ─────────────────────────────────────────────────────────────
class Auth {
  #db; #user = null;

  constructor(db) {
    this.#db = db;
    const s = localStorage.getItem('cf_user');
    if (s) try { this.#user = JSON.parse(s); } catch {}
  }

  get currentUser() { return this.#user; }
  get isLoggedIn()  { return !!this.#user; }

  async login(username, senha) {
    if (!username || !senha) throw new Error('Preencha usuário e senha');
    const rows = await this.#db.select('usuarios',
      `username=eq.${encodeURIComponent(username)}&senha=eq.${encodeURIComponent(senha)}`);
    if (!rows.length) throw new Error('Usuário ou senha incorretos');
    this.#user = rows[0];
    localStorage.setItem('cf_user', JSON.stringify(rows[0]));
    return rows[0];
  }

  async register(nome, username, senha) {
    if (!nome || !username || !senha) throw new Error('Preencha todos os campos');
    if (senha.length < 4) throw new Error('Senha deve ter no mínimo 4 caracteres');
    const ex = await this.#db.select('usuarios', `username=eq.${encodeURIComponent(username)}`);
    if (ex.length) throw new Error('Usuário já existe');
    const rows = await this.#db.insert('usuarios', { nome, username, senha });
    this.#user = rows[0];
    localStorage.setItem('cf_user', JSON.stringify(rows[0]));
    return rows[0];
  }

  logout() { this.#user = null; localStorage.removeItem('cf_user'); }
}

// ─────────────────────────────────────────────────────────────
// CLASSE: UI
// ─────────────────────────────────────────────────────────────
class UI {
  static EMOJIS = ['😊','😎','🦁','🐻','🦊','🐼','🌟','🔥','⚡','🎯','🏆','💪','🌈','🍀','🎨','🐙','🦋','🦄'];

  static toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = `toast ${type}`; el.classList.remove('hidden');
    clearTimeout(UI._tt);
    UI._tt = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  static openModal(id)        { document.getElementById(id)?.classList.remove('hidden'); }
  static closeModal(id)       { document.getElementById(id)?.classList.add('hidden'); }
  static closeModalOut(e, id) { if (e.target.id === id) UI.closeModal(id); }

  static togglePwd(inputId, btn) {
    const inp = document.getElementById(inputId); if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
  }

  static populateSelect(selId, items, valFn, lblFn, ph = '— Selecionar —') {
    const sel = document.getElementById(selId); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${ph}</option>` +
      items.map(i => `<option value="${valFn(i)}">${lblFn(i)}</option>`).join('');
    if (cur) sel.value = cur;
  }

  static buildEmojiPicker(cId, selected = '😊') {
    const c = document.getElementById(cId); if (!c) return;
    c.innerHTML = UI.EMOJIS.map(em =>
      `<button type="button" class="emoji-opt${em === selected ? ' selected' : ''}" data-emoji="${em}"
        onclick="this.closest('.emoji-picker').querySelectorAll('.emoji-opt').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">${em}</button>`
    ).join('');
  }

  static getSelectedEmoji(cId) {
    return document.querySelector(`#${cId} .emoji-opt.selected`)?.dataset.emoji ?? '😊';
  }

  static setPriority(btn) {
    btn.closest('.priority-btns')?.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  static getActivePriority() { return document.querySelector('.prio-btn.active')?.dataset.val ?? 'media'; }
  static setActivePriority(val) {
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  }

  static badge(text, cls)       { return `<span class="badge badge-${cls}">${text}</span>`; }
  static priorityBadge(p)       { return UI.badge({ baixa:'Baixa', media:'Média', alta:'Alta' }[p] ?? p, p); }
  static statusBadge(ok, rec)   {
    const lbl = Periodo.labelPeriodo(rec);
    return ok
      ? `<span class="badge badge-concluida">✅ Feito${lbl ? ' ' + lbl : ''}</span>`
      : `<span class="badge badge-pendente">⏳ Pendente</span>`;
  }

  static empty(msg = 'Nenhum item encontrado') {
    return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
  }

  static progressBar(done, total) {
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    return `<div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span class="progress-label">${done}/${total} • ${pct}%</span>`;
  }
}

// ─────────────────────────────────────────────────────────────
// CLASSE: Charts
// ─────────────────────────────────────────────────────────────
class Charts {
  #inst = {};
  #pal  = ['#6c63ff','#43e97b','#f9ca24','#ff6b6b','#74b9ff','#fd79a8','#a29bfe'];

  #opts(type) {
    const b = {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#8990a8', font: { family: 'DM Sans', size: 12 } } },
        tooltip: { backgroundColor: '#1e2330', titleColor: '#eef0f5', bodyColor: '#8990a8' }
      }
    };
    if (type === 'bar' || type === 'line') {
      b.scales = {
        x: { ticks: { color: '#8990a8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8990a8' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
      };
    }
    return b;
  }

  #destroy(id) { if (this.#inst[id]) { this.#inst[id].destroy(); delete this.#inst[id]; } }

  bar(id, labels, data, label = '') {
    this.#destroy(id);
    const ctx = document.getElementById(id); if (!ctx) return;
    this.#inst[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data, backgroundColor: this.#pal, borderRadius: 6, borderSkipped: false }] },
      options: this.#opts('bar')
    });
  }

  doughnut(id, labels, data) {
    this.#destroy(id);
    const ctx = document.getElementById(id); if (!ctx) return;
    this.#inst[id] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: this.#pal, borderWidth: 0, hoverOffset: 6 }] },
      options: { ...this.#opts('doughnut'), cutout: '68%' }
    });
  }

  line(id, labels, data, label = '') {
    this.#destroy(id);
    const ctx = document.getElementById(id); if (!ctx) return;
    this.#inst[id] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label, data, borderColor: '#6c63ff', backgroundColor: 'rgba(108,99,255,0.12)', borderWidth: 2.5, pointBackgroundColor: '#6c63ff', pointRadius: 4, tension: 0.35, fill: true }] },
      options: this.#opts('line')
    });
  }

  pie(id, labels, data) {
    this.#destroy(id);
    const ctx = document.getElementById(id); if (!ctx) return;
    this.#inst[id] = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: this.#pal, borderWidth: 0, hoverOffset: 6 }] },
      options: this.#opts('pie')
    });
  }
}

// ─────────────────────────────────────────────────────────────
// CLASSE: App
// ─────────────────────────────────────────────────────────────
class App {
  #db; #auth; #charts;

  #state = {
    responsaveis: [],
    atividades:   [],
    designacoes:  [],
    areas:        [],
    membros:      [],
    conclusoes:   [],
    myResponsavel: null   // responsavel vinculado ao usuario logado
  };

  constructor() {
    this.#db     = new Database(SUPABASE_URL, SUPABASE_KEY);
    this.#auth   = new Auth(this.#db);
    this.#charts = new Charts();
  }

  // ── INIT ──────────────────────────────────────────────────
  async init() {
    document.getElementById('dateBadge').textContent =
      new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

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
    const u = this.#auth.currentUser;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('greetUser').textContent   = u?.nome?.split(' ')[0] ?? '';
    document.getElementById('sidebarUser').textContent = `👤 ${u?.username ?? ''}`;
    document.getElementById('topAvatar').textContent   =
      (u?.nome ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Badge do responsável vinculado na topbar
    const myR = this.#state.myResponsavel;
    const badge = document.getElementById('myRespBadge');
    if (badge) badge.textContent = myR ? `${myR.emoji} ${myR.apelido || myR.nome.split(' ')[0]}` : '';

    this.showPage('dashboard');
  }

  // ── CARREGAR DADOS ────────────────────────────────────────
  async #loadAll() {
    const [resp, ativ, desig, areas, membros, conclusoes] = await Promise.all([
      this.#db.select('responsaveis', 'order=nome.asc'),
      this.#db.select('atividades',   'order=created_at.desc'),
      this.#db.select('designacoes',  'order=created_at.desc'),
      this.#db.select('areas_gestao', 'order=nome.asc'),
      this.#db.select('area_membros'),
      this.#db.select('registros_conclusao')
    ]);
    this.#state.responsaveis = resp       ?? [];
    this.#state.atividades   = ativ       ?? [];
    this.#state.designacoes  = desig      ?? [];
    this.#state.areas        = areas      ?? [];
    this.#state.membros      = membros    ?? [];
    this.#state.conclusoes   = conclusoes ?? [];

    // Encontra o responsavel vinculado ao usuario logado
    this.#state.myResponsavel = this.#state.responsaveis.find(
      r => r.usuario_id === this.#auth.currentUser?.id
    ) ?? null;
  }

  // ── LÓGICA DE RECORRÊNCIA ─────────────────────────────────
  #isConcluida(atv) {
    if (atv.recorrencia === 'unica') return atv.status === 'concluida';
    const ref = Periodo.getRef(atv.recorrencia);
    return this.#state.conclusoes.some(c => c.atividade_id === atv.id && c.periodo_ref === ref);
  }

  async toggleConclusao(ativId) {
    const atv = this.#state.atividades.find(a => a.id === ativId);
    if (!atv) return;

    if (atv.recorrencia === 'unica') {
      const novo = atv.status === 'concluida' ? 'pendente' : 'concluida';
      await this.#db.update('atividades', ativId, { status: novo });
      atv.status = novo;
      UI.toast(novo === 'concluida' ? '✅ Concluída!' : '↩️ Reaberta');
    } else {
      const ref = Periodo.getRef(atv.recorrencia);
      const existing = this.#state.conclusoes.find(c => c.atividade_id === ativId && c.periodo_ref === ref);
      if (existing) {
        await this.#db.remove('registros_conclusao', existing.id);
        this.#state.conclusoes = this.#state.conclusoes.filter(c => c.id !== existing.id);
        UI.toast('↩️ Marcada como pendente');
      } else {
        const rows = await this.#db.insert('registros_conclusao', { atividade_id: ativId, periodo_ref: ref });
        if (rows[0]) this.#state.conclusoes.push(rows[0]);
        UI.toast('✅ Concluída!');
      }
    }

    const pageId = document.querySelector('.page:not(.hidden)')?.id?.replace('page-', '');
    if (pageId) this.#renderPage(pageId, false);
  }

  // ── NAVEGAÇÃO ─────────────────────────────────────────────
  showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.remove('hidden');
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    const titles = {
      dashboard:'Dashboard', atividades:'Atividades', designacoes:'Designações',
      gestao:'Gestão de Área', responsaveis:'Responsáveis', relatorios:'Relatórios'
    };
    document.getElementById('pageTitle').textContent = titles[page] ?? page;
    if (window.innerWidth < 768) this.toggleSidebar(false);
    this.#renderPage(page, true);
  }

  async #renderPage(page, reload = true) {
    if (reload) await this.#loadAll();
    switch (page) {
      case 'dashboard':    this.#renderDashboard();   break;
      case 'atividades':   this.renderAtividades();    break;
      case 'designacoes':  this.#renderDesignacoes();  break;
      case 'gestao':       this.#renderGestao();       break;
      case 'responsaveis': this.#renderResponsaveis(); break;
    }
  }

  toggleSidebar(force) {
    const sb = document.getElementById('sidebar'); if (!sb) return;
    const open = force !== undefined ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    let ov = document.getElementById('sidebarOverlay');
    if (open && window.innerWidth < 768) {
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'sidebarOverlay'; ov.className = 'sidebar-overlay';
        ov.onclick = () => this.toggleSidebar(false);
        document.body.appendChild(ov);
      }
      ov.classList.add('visible');
    } else if (ov) ov.classList.remove('visible');
  }

  // ── AUTH ──────────────────────────────────────────────────
  switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.querySelectorAll('.tab-btn').forEach((b, i) =>
      b.classList.toggle('active', (i === 0) === (tab === 'login')));
  }

  async doLogin() {
    const errEl = document.getElementById('loginError'); errEl.textContent = '';
    try {
      await this.#auth.login(
        document.getElementById('loginUser').value.trim(),
        document.getElementById('loginPass').value
      );
      await this.#loadAll();
      this.#showApp();
    } catch (e) { errEl.textContent = e.message; }
  }

  async doRegister() {
    const errEl = document.getElementById('regError'); errEl.textContent = '';
    const nome   = document.getElementById('regName').value.trim();
    const user   = document.getElementById('regUser').value.trim();
    const senha  = document.getElementById('regPass').value;
    const senha2 = document.getElementById('regPass2').value;
    if (senha !== senha2) { errEl.textContent = 'As senhas não coincidem'; return; }
    try {
      const newUser = await this.#auth.register(nome, user, senha);

      // Cria automaticamente um responsável vinculado à conta
      await this.#db.insert('responsaveis', {
        nome:       newUser.nome,
        apelido:    newUser.username,
        emoji:      '😊',
        usuario_id: newUser.id
      });

      await this.#loadAll();
      this.#showApp();
    } catch (e) { errEl.textContent = e.message; }
  }

  doLogout() { this.#auth.logout(); this.#showAuth(); }

  // ── DASHBOARD (apenas atividades do usuário logado) ───────
  #renderDashboard() {
    const myR = this.#state.myResponsavel;

    // Sem responsável vinculado → mostrar aviso
    if (!myR) {
      document.getElementById('statsGrid').innerHTML = '';
      ['sectionDiarias','sectionSemanais','sectionMensais','sectionUnicas'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      document.getElementById('dashAlert').classList.remove('hidden');
      return;
    }

    document.getElementById('dashAlert').classList.add('hidden');

    // Filtrar apenas atividades do responsável logado
    const minhas    = this.#state.atividades.filter(a => a.responsavel_id === myR.id);
    const diarias   = minhas.filter(a => a.recorrencia === 'diaria');
    const semanais  = minhas.filter(a => a.recorrencia === 'semanal');
    const mensais   = minhas.filter(a => a.recorrencia === 'mensal');
    const unicas    = minhas.filter(a => a.recorrencia === 'unica');

    const dDone = diarias.filter(a  => this.#isConcluida(a)).length;
    const sDone = semanais.filter(a => this.#isConcluida(a)).length;
    const mDone = mensais.filter(a  => this.#isConcluida(a)).length;
    const uDone = unicas.filter(a   => this.#isConcluida(a)).length;

    // Stats
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card c1"><div class="stat-icon">☀️</div>
        <div class="stat-val">${dDone}/${diarias.length}</div><div class="stat-label">Concluídas hoje</div></div>
      <div class="stat-card c2"><div class="stat-icon">📅</div>
        <div class="stat-val">${sDone}/${semanais.length}</div><div class="stat-label">Esta semana</div></div>
      <div class="stat-card c3"><div class="stat-icon">📆</div>
        <div class="stat-val">${mDone}/${mensais.length}</div><div class="stat-label">Este mês</div></div>
      <div class="stat-card c4"><div class="stat-icon">📌</div>
        <div class="stat-val">${uDone}/${unicas.length}</div><div class="stat-label">Únicas</div></div>
    `;

    // Seções de tarefas — apenas as minhas
    this.#renderTaskSection('sectionDiarias',  diarias,  '☀️ Diárias — Hoje',        'diaria');
    this.#renderTaskSection('sectionSemanais', semanais, '📅 Semanais — Esta Semana', 'semanal');
    this.#renderTaskSection('sectionMensais',  mensais,  '📆 Mensais — Este Mês',     'mensal');
    this.#renderTaskSection('sectionUnicas',   unicas,   '📌 Únicas / Avulsas',       'unica');

    // Gráficos (baseados nas atividades do usuário)
    this.#charts.doughnut('chartDoughnut',
      ['Diárias','Semanais','Mensais','Únicas'],
      [diarias.length, semanais.length, mensais.length, unicas.length]
    );
    this.#charts.bar('chartBar',
      ['Diárias','Semanais','Mensais','Únicas'],
      [dDone, sDone, mDone, uDone], 'Concluídas no período'
    );

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return Periodo.iso(d);
    });
    // Apenas conclusões das minhas atividades
    const myIds = new Set(minhas.map(a => a.id));
    this.#charts.line('chartPeriod',
      days.map(d => d.slice(5)),
      days.map(d => this.#state.conclusoes.filter(c => myIds.has(c.atividade_id) && c.periodo_ref === d).length),
      'Minhas conclusões'
    );

    this.#charts.pie('chartArea',
      this.#state.areas.length ? this.#state.areas.map(a => a.nome) : ['Sem área'],
      this.#state.areas.length
        ? this.#state.areas.map(a => minhas.filter(at => at.area_id === a.id).length)
        : [1]
    );
  }

  #renderTaskSection(sectionId, atividades, titulo, recorrencia) {
    const el = document.getElementById(sectionId); if (!el) return;

    if (!atividades.length) {
      el.innerHTML = `
        <div class="task-section-header">
          <span class="task-section-title">${titulo}</span>
          <span class="task-empty-label">nenhuma cadastrada</span>
        </div>`;
      return;
    }

    const done  = atividades.filter(a => this.#isConcluida(a)).length;
    const total = atividades.length;
    const sorted = [...atividades].sort((a, b) => (this.#isConcluida(a) ? 1 : 0) - (this.#isConcluida(b) ? 1 : 0));

    el.innerHTML = `
      <div class="task-section-header">
        <span class="task-section-title">${titulo}</span>
        <div class="task-progress">${UI.progressBar(done, total)}</div>
      </div>
      <div class="task-list">
        ${sorted.map(a => {
          const ok = this.#isConcluida(a);
          return `
            <div class="task-item ${ok ? 'task-done' : ''}">
              <button class="task-check ${ok ? 'checked' : ''}" onclick="app.toggleConclusao('${a.id}')" title="${ok ? 'Desmarcar' : 'Marcar como feito'}">
                ${ok ? '✓' : ''}
              </button>
              <div class="task-info">
                <div class="task-name ${ok ? 'striked' : ''}">${a.nome}</div>
                ${a.periodo ? `<div class="task-sub">🕐 ${a.periodo}</div>` : ''}
              </div>
              <div class="task-meta">
                ${UI.priorityBadge(a.prioridade)}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── ATIVIDADES (todas, agrupadas por responsável) ─────────
  renderAtividades() {
    const search = (document.getElementById('searchAtiv')?.value ?? '').toLowerCase();
    const recFil = document.getElementById('filterRecorr')?.value ?? '';

    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    UI.populateSelect('ativGestao', this.#state.areas, a => a.id, a => a.nome, '— Nenhuma —');

    let list = [...this.#state.atividades];
    if (search) list = list.filter(a =>
      a.nome.toLowerCase().includes(search) || (a.descricao ?? '').toLowerCase().includes(search));
    if (recFil) list = list.filter(a => a.recorrencia === recFil);

    const container = document.getElementById('ativList');
    if (!list.length) { container.innerHTML = UI.empty('Nenhuma atividade encontrada'); return; }

    // Agrupar por responsavel_id
    const grupos = new Map(); // responsavel_id → { responsavel, atividades[] }

    list.forEach(a => {
      const key  = a.responsavel_id ?? '__none__';
      const resp = this.#state.responsaveis.find(r => r.id === a.responsavel_id) ?? null;
      if (!grupos.has(key)) grupos.set(key, { resp, atividades: [] });
      grupos.get(key).atividades.push(a);
    });

    // Ordenar: grupos com responsavel primeiro, sem responsavel por último
    const entries = [...grupos.entries()].sort(([ka], [kb]) => {
      if (ka === '__none__') return 1;
      if (kb === '__none__') return -1;
      const na = grupos.get(ka).resp?.nome ?? '';
      const nb = grupos.get(kb).resp?.nome ?? '';
      return na.localeCompare(nb);
    });

    container.innerHTML = entries.map(([key, { resp, atividades }]) => {
      const isMe = resp && this.#state.myResponsavel?.id === resp.id;
      const doneCount = atividades.filter(a => this.#isConcluida(a)).length;

      const header = resp
        ? `<div class="resp-group-header">
             <div class="resp-group-left">
               <span class="resp-group-emoji">${resp.emoji}</span>
               <div>
                 <div class="resp-group-name">
                   ${resp.nome}
                   ${isMe ? '<span class="you-badge">Você</span>' : ''}
                 </div>
                 <div class="resp-group-sub">${resp.apelido ? '@' + resp.apelido + ' · ' : ''}${atividades.length} atividade${atividades.length !== 1 ? 's' : ''} · ${doneCount} concluída${doneCount !== 1 ? 's' : ''}</div>
               </div>
             </div>
             <div class="resp-group-progress">${UI.progressBar(doneCount, atividades.length)}</div>
           </div>`
        : `<div class="resp-group-header resp-group-none">
             <div class="resp-group-left">
               <span class="resp-group-emoji">👤</span>
               <div>
                 <div class="resp-group-name">Sem responsável</div>
                 <div class="resp-group-sub">${atividades.length} atividade${atividades.length !== 1 ? 's' : ''}</div>
               </div>
             </div>
           </div>`;

      const cards = atividades.map(a => this.#buildActivityCard(a)).join('');

      return `<div class="resp-group ${isMe ? 'resp-group-me' : ''}">${header}<div class="card-grid">${cards}</div></div>`;
    }).join('');
  }

  #buildActivityCard(a) {
    const ok   = this.#isConcluida(a);
    return `
      <div class="activity-card ${ok ? 'card-done' : ''}">
        <div class="card-top">
          <button class="task-check ${ok ? 'checked' : ''}" onclick="app.toggleConclusao('${a.id}')" title="${ok ? 'Desmarcar' : 'Marcar como feito'}">
            ${ok ? '✓' : ''}
          </button>
          <span class="card-name ${ok ? 'striked' : ''}">${a.nome}</span>
          <div class="card-actions">
            <button class="btn-icon" onclick="app.editAtividade('${a.id}')" title="Editar">✏️</button>
            <button class="btn-icon" onclick="app.deleteAtividade('${a.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="card-meta">
          ${UI.statusBadge(ok, a.recorrencia)}
          ${UI.priorityBadge(a.prioridade)}
          <span class="recorr-badge">${Periodo.icone(a.recorrencia)} ${Periodo.label(a.recorrencia)}</span>
          ${a.periodo ? `<span class="card-periodo">🕐 ${a.periodo}</span>` : ''}
        </div>
        ${a.descricao ? `<div class="card-desc">${a.descricao}</div>` : ''}
      </div>`;
  }

  openModalAtividade() {
    document.getElementById('ativId').value = '';
    document.getElementById('ativNome').value = '';
    document.getElementById('ativDesc').value = '';
    document.getElementById('ativPeriodo').value = '';
    document.getElementById('ativRecorrencia').value = 'diaria';
    document.getElementById('modalAtivTitle').textContent = 'Nova Atividade';
    UI.setActivePriority('media');
    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    UI.populateSelect('ativGestao', this.#state.areas, a => a.id, a => a.nome, '— Nenhuma —');
    // Pré-selecionar o responsável do usuário logado
    if (this.#state.myResponsavel) {
      document.getElementById('ativResp').value = this.#state.myResponsavel.id;
    }
    UI.openModal('modalAtividade');
  }

  editAtividade(id) {
    const a = this.#state.atividades.find(x => x.id === id); if (!a) return;
    document.getElementById('ativId').value = a.id;
    document.getElementById('ativNome').value = a.nome;
    document.getElementById('ativDesc').value = a.descricao ?? '';
    document.getElementById('ativPeriodo').value = a.periodo ?? '';
    document.getElementById('ativRecorrencia').value = a.recorrencia ?? 'diaria';
    document.getElementById('modalAtivTitle').textContent = 'Editar Atividade';
    UI.setActivePriority(a.prioridade ?? 'media');
    UI.populateSelect('ativResp',   this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    UI.populateSelect('ativGestao', this.#state.areas, x => x.id, x => x.nome, '— Nenhuma —');
    document.getElementById('ativResp').value   = a.responsavel_id ?? '';
    document.getElementById('ativGestao').value = a.area_id ?? '';
    UI.openModal('modalAtividade');
  }

  async salvarAtividade() {
    const id   = document.getElementById('ativId').value;
    const nome = document.getElementById('ativNome').value.trim();
    if (!nome) { UI.toast('Informe o nome da atividade', 'error'); return; }
    const payload = {
      nome,
      descricao:      document.getElementById('ativDesc').value.trim(),
      periodo:        document.getElementById('ativPeriodo').value.trim(),
      recorrencia:    document.getElementById('ativRecorrencia').value,
      prioridade:     UI.getActivePriority(),
      responsavel_id: document.getElementById('ativResp').value || null,
      area_id:        document.getElementById('ativGestao').value || null,
      status: 'pendente'
    };
    try {
      if (id) { await this.#db.update('atividades', id, payload); UI.toast('Atividade atualizada ✅'); }
      else    { await this.#db.insert('atividades', payload);      UI.toast('Atividade criada ✅'); }
      UI.closeModal('modalAtividade');
      await this.#loadAll();
      this.renderAtividades();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  async deleteAtividade(id) {
    if (!confirm('Excluir esta atividade?')) return;
    try {
      await this.#db.remove('atividades', id);
      UI.toast('Atividade excluída');
      await this.#loadAll();
      this.renderAtividades();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  // ── DESIGNAÇÕES ───────────────────────────────────────────
  #renderDesignacoes() {
    UI.populateSelect('desigAtiv', this.#state.atividades,   a => a.id, a => `${Periodo.icone(a.recorrencia)} ${a.nome}`);
    UI.populateSelect('desigResp', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    const c = document.getElementById('designList');
    if (!this.#state.designacoes.length) { c.innerHTML = UI.empty('Nenhuma designação cadastrada'); return; }
    c.innerHTML = this.#state.designacoes.map(d => {
      const atv  = this.#state.atividades.find(a => a.id === d.atividade_id);
      const resp = this.#state.responsaveis.find(r => r.id === d.responsavel_id);
      return `
        <div class="activity-card">
          <div class="card-top">
            <span class="card-name">${atv ? Periodo.icone(atv.recorrencia) + ' ' + atv.nome : '—'}</span>
            <button class="btn-icon" onclick="app.deleteDesignacao('${d.id}')">🗑️</button>
          </div>
          <div class="card-resp"><div class="resp-dot"></div>${resp ? `${resp.emoji} ${resp.nome}` : '—'}</div>
          ${d.data_inicio || d.data_fim ? `<div class="card-periodo">📅 ${d.data_inicio||'?'} → ${d.data_fim||'?'}</div>` : ''}
          ${d.observacao ? `<div class="card-desc">${d.observacao}</div>` : ''}
        </div>`;
    }).join('');
  }

  async salvarDesignacao() {
    const ativId = document.getElementById('desigAtiv').value;
    const respId = document.getElementById('desigResp').value;
    if (!ativId || !respId) { UI.toast('Selecione atividade e responsável', 'error'); return; }
    try {
      await this.#db.insert('designacoes', {
        atividade_id: ativId, responsavel_id: respId,
        data_inicio: document.getElementById('desigInicio').value || null,
        data_fim:    document.getElementById('desigFim').value    || null,
        observacao:  document.getElementById('desigObs').value.trim()
      });
      UI.toast('Designação criada ✅'); UI.closeModal('modalDesignacao');
      await this.#loadAll(); this.#renderDesignacoes();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  async deleteDesignacao(id) {
    if (!confirm('Excluir?')) return;
    try {
      await this.#db.remove('designacoes', id);
      UI.toast('Designação excluída'); await this.#loadAll(); this.#renderDesignacoes();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  // ── GESTÃO DE ÁREA ────────────────────────────────────────
  #renderGestao() {
    UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    this.#buildMembrosCheckboxes();
    const c = document.getElementById('gestaoList');
    if (!this.#state.areas.length) { c.innerHTML = UI.empty('Nenhuma área cadastrada'); return; }
    c.innerHTML = this.#state.areas.map(area => {
      const gestor  = this.#state.responsaveis.find(r => r.id === area.gestor_id);
      const members = this.#state.membros.filter(m => m.area_id === area.id)
        .map(m => this.#state.responsaveis.find(r => r.id === m.responsavel_id)).filter(Boolean);
      return `
        <div class="gestao-card">
          <div class="gestao-top">
            <span class="gestao-nome">${area.nome}</span>
            <div class="card-actions">
              <button class="btn-icon" onclick="app.editArea('${area.id}')">✏️</button>
              <button class="btn-icon" onclick="app.deleteArea('${area.id}')">🗑️</button>
            </div>
          </div>
          ${area.descricao ? `<div class="gestao-desc">${area.descricao}</div>` : ''}
          ${gestor ? `<div class="gestao-leader"><span>${gestor.emoji}</span><div><div class="leader-label">Gestor</div><div class="leader-name">${gestor.nome}</div></div></div>` : ''}
          <div class="gestao-team">${members.map(m => `<span class="member-chip">${m.emoji} ${m.apelido || m.nome.split(' ')[0]}</span>`).join('')}</div>
        </div>`;
    }).join('');
  }

  #buildMembrosCheckboxes(selectedIds = []) {
    const c = document.getElementById('gestaoMembros'); if (!c) return;
    c.innerHTML = this.#state.responsaveis.map(r => `
      <label class="checkbox-item">
        <input type="checkbox" value="${r.id}" ${selectedIds.includes(r.id) ? 'checked' : ''}>
        <span>${r.emoji} ${r.nome}</span>
      </label>`).join('');
  }

  editArea(id) {
    const area = this.#state.areas.find(a => a.id === id); if (!area) return;
    document.getElementById('gestaoId').value   = area.id;
    document.getElementById('gestaoNome').value  = area.nome;
    document.getElementById('gestaoDesc').value  = area.descricao ?? '';
    document.getElementById('modalGestaoTitle').textContent = 'Editar Área';
    UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
    document.getElementById('gestaoGestor').value = area.gestor_id ?? '';
    this.#buildMembrosCheckboxes(this.#state.membros.filter(m => m.area_id === id).map(m => m.responsavel_id));
    UI.openModal('modalGestao');
  }

  async salvarGestao() {
    const id = document.getElementById('gestaoId').value;
    const nome = document.getElementById('gestaoNome').value.trim();
    if (!nome) { UI.toast('Informe o nome', 'error'); return; }
    const payload = { nome, descricao: document.getElementById('gestaoDesc').value.trim(), gestor_id: document.getElementById('gestaoGestor').value || null };
    const checked = [...document.querySelectorAll('#gestaoMembros input:checked')].map(i => i.value);
    try {
      let areaId = id;
      if (id) { await this.#db.update('areas_gestao', id, payload); }
      else { const rows = await this.#db.insert('areas_gestao', payload); areaId = rows[0].id; }
      await this.#db.removeWhere('area_membros', 'area_id', areaId);
      for (const rId of checked) await this.#db.insert('area_membros', { area_id: areaId, responsavel_id: rId });
      UI.toast(id ? 'Área atualizada ✅' : 'Área criada ✅'); UI.closeModal('modalGestao');
      await this.#loadAll(); this.#renderGestao();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  async deleteArea(id) {
    if (!confirm('Excluir?')) return;
    try {
      await this.#db.remove('areas_gestao', id);
      UI.toast('Área excluída'); await this.#loadAll(); this.#renderGestao();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  // ── RESPONSÁVEIS ──────────────────────────────────────────
  #renderResponsaveis() {
    UI.buildEmojiPicker('emojiPicker');
    const c    = document.getElementById('respList');
    const myR  = this.#state.myResponsavel;
    const uid  = this.#auth.currentUser?.id;

    if (!this.#state.responsaveis.length) { c.innerHTML = UI.empty('Nenhum responsável cadastrado'); return; }

    c.innerHTML = this.#state.responsaveis.map(r => {
      const total  = this.#state.atividades.filter(a => a.responsavel_id === r.id).length;
      const feitas = this.#state.atividades.filter(a => a.responsavel_id === r.id && this.#isConcluida(a)).length;
      const isMe   = myR?.id === r.id;
      const isLinked = !!r.usuario_id;

      return `
        <div class="resp-card ${isMe ? 'resp-card-me' : ''}">
          ${isMe ? '<div class="resp-me-badge">Você</div>' : ''}
          <div class="resp-emoji">${r.emoji}</div>
          <div class="resp-name">${r.nome}</div>
          ${r.apelido ? `<div class="resp-sub">@${r.apelido}</div>` : ''}
          <div class="resp-stats">
            <span class="resp-stat">📋 ${total}</span>
            <span class="resp-stat">✅ ${feitas}</span>
          </div>
          ${isLinked && !isMe ? '<div class="resp-linked-badge">🔗 Vinculado</div>' : ''}
          <div class="resp-actions">
            ${!isLinked ? `<button class="btn-secondary resp-link-btn" onclick="app.vincularResponsavel('${r.id}')" title="Vincular à minha conta">🔗 Vincular</button>` : ''}
            ${isMe ? '' : `<button class="btn-icon" onclick="app.deleteResponsavel('${r.id}')">🗑️</button>`}
          </div>
        </div>`;
    }).join('');
  }

  // Vincula um responsável existente à conta logada
  async vincularResponsavel(respId) {
    const uid = this.#auth.currentUser?.id;
    if (!uid) return;
    if (this.#state.myResponsavel) {
      if (!confirm('Você já tem um responsável vinculado. Deseja trocar o vínculo?')) return;
      // Desvincula o antigo
      await this.#db.update('responsaveis', this.#state.myResponsavel.id, { usuario_id: null });
    }
    try {
      await this.#db.update('responsaveis', respId, { usuario_id: uid });
      UI.toast('✅ Responsável vinculado à sua conta!');
      await this.#loadAll();
      this.#renderResponsaveis();
      // Atualizar badge no topbar
      const myR = this.#state.myResponsavel;
      const badge = document.getElementById('myRespBadge');
      if (badge && myR) badge.textContent = `${myR.emoji} ${myR.apelido || myR.nome.split(' ')[0]}`;
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  async salvarResponsavel() {
    const nome = document.getElementById('respNome').value.trim();
    if (!nome) { UI.toast('Informe o nome', 'error'); return; }
    try {
      await this.#db.insert('responsaveis', {
        nome, apelido: document.getElementById('respApelido').value.trim(),
        emoji: UI.getSelectedEmoji('emojiPicker')
      });
      UI.toast('Responsável adicionado ✅'); UI.closeModal('modalResponsavel');
      document.getElementById('respNome').value = '';
      document.getElementById('respApelido').value = '';
      await this.#loadAll(); this.#renderResponsaveis();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  async deleteResponsavel(id) {
    if (!confirm('Excluir este responsável?')) return;
    try {
      await this.#db.remove('responsaveis', id);
      UI.toast('Excluído'); await this.#loadAll(); this.#renderResponsaveis();
    } catch (e) { UI.toast('Erro: ' + e.message, 'error'); }
  }

  // ── RELATÓRIOS ────────────────────────────────────────────
  async gerarRelatorio() {
    UI.populateSelect('repResp', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`, 'Todos responsáveis');
    const respId = document.getElementById('repResp').value;
    const recFil = document.getElementById('repRecorr').value;
    let list = [...this.#state.atividades];
    if (respId) list = list.filter(a => a.responsavel_id === respId);
    if (recFil) list = list.filter(a => a.recorrencia === recFil);

    const c = document.getElementById('relatorioContent');
    if (!list.length) { c.innerHTML = UI.empty('Nenhuma atividade encontrada'); return; }

    const done = list.filter(a => this.#isConcluida(a)).length;
    const pct  = list.length ? Math.round(done / list.length * 100) : 0;

    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card c1"><div class="stat-val">${list.length}</div><div class="stat-label">Total</div></div>
        <div class="stat-card c2"><div class="stat-val">${done}</div><div class="stat-label">Concluídas (período atual)</div></div>
        <div class="stat-card c3"><div class="stat-val">${pct}%</div><div class="stat-label">Taxa no período</div></div>
      </div>
      <div class="report-table-wrap"><table>
        <thead><tr><th>Atividade</th><th>Recorrência</th><th>Horário/Sub</th><th>Status Atual</th><th>Prioridade</th><th>Responsável</th></tr></thead>
        <tbody>
          ${list.map(a => {
            const resp = this.#state.responsaveis.find(r => r.id === a.responsavel_id);
            const ok   = this.#isConcluida(a);
            return `<tr>
              <td>${a.nome}</td>
              <td>${Periodo.icone(a.recorrencia)} ${Periodo.label(a.recorrencia)}</td>
              <td>${a.periodo || '—'}</td>
              <td>${UI.statusBadge(ok, a.recorrencia)}</td>
              <td>${UI.priorityBadge(a.prioridade)}</td>
              <td>${resp ? resp.emoji + ' ' + resp.nome : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  }

  // ── BINDINGS GLOBAIS ──────────────────────────────────────
  #bindGlobals() {
    window.app = this;
    window.switchTab        = t     => this.switchTab(t);
    window.doLogin          = ()    => this.doLogin();
    window.doRegister       = ()    => this.doRegister();
    window.doLogout         = ()    => this.doLogout();
    window.showPage         = page  => this.showPage(page);
    window.toggleSidebar    = ()    => this.toggleSidebar();
    window.togglePwd        = (id, btn) => UI.togglePwd(id, btn);
    window.setPriority      = btn   => UI.setPriority(btn);
    window.closeModal       = id    => UI.closeModal(id);
    window.closeModalOut    = (e, id) => UI.closeModalOut(e, id);
    window.renderAtividades = ()    => this.renderAtividades();
    window.salvarAtividade  = ()    => this.salvarAtividade();
    window.salvarDesignacao = ()    => this.salvarDesignacao();
    window.salvarGestao     = ()    => this.salvarGestao();
    window.salvarResponsavel= ()    => this.salvarResponsavel();
    window.gerarRelatorio   = ()    => this.gerarRelatorio();

    window.openModal = id => {
      if (id === 'modalAtividade') { this.openModalAtividade(); return; }
      if (id === 'modalDesignacao') {
        UI.populateSelect('desigAtiv', this.#state.atividades, a => a.id, a => `${Periodo.icone(a.recorrencia)} ${a.nome}`);
        UI.populateSelect('desigResp', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
        ['desigId','desigInicio','desigFim','desigObs'].forEach(i => { document.getElementById(i).value = ''; });
      }
      if (id === 'modalGestao') {
        ['gestaoId','gestaoNome','gestaoDesc'].forEach(i => { document.getElementById(i).value = ''; });
        document.getElementById('modalGestaoTitle').textContent = 'Nova Área de Gestão';
        UI.populateSelect('gestaoGestor', this.#state.responsaveis, r => r.id, r => `${r.emoji} ${r.nome}`);
        this.#buildMembrosCheckboxes();
      }
      if (id === 'modalResponsavel') {
        ['respNome','respApelido'].forEach(i => { document.getElementById(i).value = ''; });
        UI.buildEmojiPicker('emojiPicker');
      }
      UI.openModal(id);
    };
  }
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => new App().init());
