const GuniApp = {
  currentPage: '',
  currentChalanId: null,

  routes: {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'persons': 'persons',
    'designs': 'designs',
    'chalans': 'chalans',
    'chalan-new': 'chalan-new',
    'chalan-detail': 'chalan-detail',
    'comparison': 'comparison',
    'dispatches': 'dispatches',
    'dispatch-new': 'dispatch-new',
    'dispatch-detail': 'dispatch-detail',
    'reports': 'reports',
    'settings': 'settings'
  },

  async init() {
    await GuniDB.open();
    this.setupNavigation();
    this.setupRouter();
    this.registerSW();
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const page = item.dataset.page;
        window.location.hash = page;
      });
    });
  },

  setupRouter() {
  },

  handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const parts = hash.split('/');
    const page = parts[0];

    if (page === 'chalan' && parts[1] === 'detail' && parts[2]) {
      this.currentChalanId = parseInt(parts[2]);
      this.showPage('chalan-detail');
      return;
    }
    if (page === 'comparison' && parts[1]) {
      this.currentChalanId = parseInt(parts[1]);
      this.showPage('comparison-detail');
      return;
    }
    if (page === 'report' && parts[1] && parts[2]) {
      this.currentChalanId = parseInt(parts[2]);
      if (parts[1] === 'pdf') { GuniReports.generatePDF(this.currentChalanId); return; }
      if (parts[1] === 'png') { GuniReports.generatePNG(this.currentChalanId); return; }
      return;
    }
    if (page === 'dispatch' && parts[1] === 'detail' && parts[2]) {
      this.currentChalanId = parseInt(parts[2]);
      this.showPage('dispatch-detail');
      return;
    }

    if (this.routes[page]) {
      this.showPage(this.routes[page]);
    } else {
      this.showPage('dashboard');
    }
  },

  showPage(page) {
    this.currentPage = page;
    const container = document.getElementById('page-content');
    if (!container) return;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = {
      'dashboard': 'nav-dashboard',
      'persons': 'nav-persons',
      'designs': 'nav-designs',
      'chalans': 'nav-chalans',
      'chalan-new': 'nav-chalans',
      'chalan-detail': 'nav-chalans',
      'comparison': 'nav-comparison',
      'comparison-detail': 'nav-comparison',
      'dispatches': 'nav-dispatches',
      'dispatch-new': 'nav-dispatches',
      'dispatch-detail': 'nav-dispatches',
      'reports': 'nav-reports',
      'settings': 'nav-settings'
    };
    const navId = navMap[page];
    if (navId) {
      const el = document.getElementById(navId);
      if (el) el.classList.add('active');
    }

    GuniUtils.showLoading(true);
    container.scrollTop = 0;

    switch (page) {
      case 'dashboard': GuniDashboard.render(); break;
      case 'persons': GuniPersons.render(); break;
      case 'designs': GuniDesigns.render(); break;
      case 'chalans': GuniChalans.renderList(); break;
      case 'chalan-new': GuniChalans.renderNew(); break;
      case 'chalan-detail': GuniChalans.renderDetail(this.currentChalanId); break;
      case 'comparison': GuniComparison.render(); break;
      case 'comparison-detail': GuniComparison.renderForChalan(this.currentChalanId); break;
      case 'dispatches': GuniDispatch.renderList(); break;
      case 'dispatch-new': GuniDispatch.renderNew(); break;
      case 'dispatch-detail': GuniDispatch.renderDetail(this.currentChalanId); break;
      case 'reports': GuniReports.render(); break;
      case 'settings': this.renderSettings(); break;
      default: GuniDashboard.render();
    }
  },

  goBack() {
    const navMap = {
      'chalan-new': 'chalans',
      'chalan-detail': 'chalans',
      'comparison-detail': 'chalans',
      'dispatch-new': 'dispatches',
      'dispatch-detail': 'dispatches',
    };
    const target = navMap[this.currentPage] || 'dashboard';
    window.location.hash = target;
  },

  showMenu() {
    let overlay = document.getElementById('menu-overlay');
    if (overlay) { overlay.remove(); return; }
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'menu-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="modal" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3>Menu</h3>
          <button class="modal-close" onclick="document.getElementById('menu-overlay')?.remove()">×</button>
        </div>
        ${[
          { icon: '👤', label: 'People', page: 'persons' },
          { icon: '🎨', label: 'Designs', page: 'designs' },
          { icon: '📊', label: 'Comparison', page: 'comparison' },
          { icon: '📄', label: 'Reports', page: 'reports' },
          { icon: '⚙️', label: 'Settings', page: 'settings' }
        ].map(item => `
          <div class="list-item" onclick="document.getElementById('menu-overlay')?.remove();window.location.hash='${item.page}'">
            <span style="font-size:24px;width:40px;">${item.icon}</span>
            <div class="info"><div class="title">${item.label}</div></div>
          </div>
        `).join('')}
      </div>
    `;
    document.body.appendChild(overlay);
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },

  renderSettings() {
    const c = document.getElementById('page-content');
    c.innerHTML = `
      <div class="page-header">
        <h2>Settings</h2>
      </div>
      <div class="card" style="border-left:3px solid var(--warning);">
        <h3>⚠️ Data Storage Warning</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          All data (chalans, designs, photos) is stored <strong>inside your phone's browser storage</strong> (IndexedDB).
          You <strong>cannot choose a folder</strong> for this — it's managed by the browser automatically.
        </p>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          <strong>Data is at risk if:</strong>
        </p>
        <ul style="font-size:13px;color:var(--text-secondary);margin-left:16px;margin-bottom:8px;">
          <li>You clear Chrome/browser data</li>
          <li>You uninstall or switch phones</li>
          <li>The browser storage gets full</li>
        </ul>
        <p style="font-size:13px;font-weight:600;color:var(--text);">
          ✅ Always keep a backup! Export regularly below.
        </p>
      </div>
      <div class="card">
        <h3>Backup & Restore</h3>
        <p style="margin-bottom:12px;color:var(--text-secondary);">Download a JSON backup file. Keep it safe on your phone or cloud storage.</p>
        <button class="btn btn-primary btn-block" onclick="GuniApp.exportBackup()" style="margin-bottom:8px;">📤 Download Backup</button>
        <button class="btn btn-secondary btn-block" onclick="GuniApp.importBackup()">📥 Restore from Backup</button>
      </div>
      <div class="card">
        <h3>Where is my data?</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">
          Your data is NOT on Vercel's servers. It's in your phone's Chrome storage.
          To see it: Chrome ⋮ → Settings → Site Settings → Storage → find your app URL.
        </p>
        <p style="font-size:13px;color:var(--text-secondary);">
          Photos are stored as data inside the app storage — they take extra space.
          If storage gets full, export backup first, then clear site data.
        </p>
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async exportBackup() {
    GuniUtils.showLoading(true);
    try {
      const data = await GuniDB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guni-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      GuniUtils.showToast('Backup downloaded!');
    } catch (e) {
      GuniUtils.showToast('Backup failed: ' + e.message, 'error');
    }
    GuniUtils.showLoading(false);
  },

  async importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      const confirmed = await GuniUtils.confirmDialog('This will merge backup data with existing data. Continue?');
      if (!confirmed) return;
      GuniUtils.showLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await GuniDB.importAll(data);
        GuniUtils.showToast('Backup restored successfully!');
      } catch (err) {
        GuniUtils.showToast('Restore failed: ' + err.message, 'error');
      }
      GuniUtils.showLoading(false);
    };
    input.click();
  }
};

document.addEventListener('DOMContentLoaded', () => GuniApp.init());
