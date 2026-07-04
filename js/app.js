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
    if (page === 'dispatch-new' && parts[1]) {
      this.currentChalanId = parseInt(parts[1]);
      this.showPage('dispatch-new');
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
      case 'dispatch-new': GuniDispatch.renderNew(this.currentChalanId); break;
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
    const backupFolder = localStorage.getItem('guni_backup_folder') || '';
    const autoBackup = localStorage.getItem('guni_auto_backup') === 'true';
    c.innerHTML = `
      <div class="page-header">
        <h2>Settings</h2>
      </div>

      <div class="card" style="border-left:3px solid var(--warning);">
        <h3>⚠️ Data Storage</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          The app stores all data <strong>inside your phone's browser storage</strong> (IndexedDB).
          You cannot directly change this folder — it's managed by the browser.
        </p>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">
          <strong>To protect your data:</strong>
        </p>
        <ul style="font-size:13px;color:var(--text-secondary);margin-left:16px;margin-bottom:8px;">
          <li>Set up <strong>Auto-Backup</strong> below to a folder you choose</li>
          <li>The app will save a backup there after every change</li>
          <li>You can also manually download backup anytime</li>
        </ul>
      </div>

      <div class="card">
        <h3>📂 Auto-Backup Folder</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">
          Choose a folder on your device where backups will be saved automatically.
        </p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
          <button class="btn btn-primary" onclick="GuniApp.chooseBackupFolder()">${backupFolder ? '📁 Change Folder' : '📁 Choose Folder'}</button>
          ${backupFolder ? `<button class="btn btn-sm btn-danger" onclick="GuniApp.removeBackupFolder()">× Remove</button>` : ''}
        </div>
        ${backupFolder ? `<p style="font-size:12px;color:var(--success);word-break:break-all;">✅ Folder selected</p>` : `<p style="font-size:12px;color:var(--text-secondary);">No folder selected. Backup will only be manual.</p>`}
      </div>

      <div class="card">
        <h3>🔄 Auto-Backup Toggle</h3>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <p style="font-size:13px;color:var(--text-secondary);">Save backup automatically after every change</p>
          <label style="position:relative;display:inline-block;width:48px;height:26px;">
            <input type="checkbox" id="auto-backup-toggle" ${autoBackup && backupFolder ? 'checked' : ''} onchange="GuniApp.toggleAutoBackup()" style="opacity:0;width:0;height:0;">
            <span style="position:absolute;cursor:pointer;inset:0;background:${autoBackup && backupFolder ? 'var(--success)' : 'var(--border)'};border-radius:13px;transition:0.3s;">
              <span style="position:absolute;left:3px;top:3px;width:20px;height:20px;background:white;border-radius:50%;transition:0.3s;transform:${autoBackup && backupFolder ? 'translateX(22px)' : 'translateX(0)'};"></span>
            </span>
          </label>
        </div>
      </div>

      <div class="card">
        <h3>💾 Manual Backup</h3>
        <button class="btn btn-primary btn-block" onclick="GuniApp.exportBackup()" style="margin-bottom:8px;">📤 Download Backup Now</button>
        <button class="btn btn-secondary btn-block" onclick="GuniApp.importBackup()">📥 Restore from Backup File</button>
      </div>

      <div class="card">
        <h3>App Info</h3>
        <p style="font-size:13px;color:var(--text-secondary);">Version 1.0 · Offline PWA</p>
        <p style="font-size:13px;color:var(--text-secondary);">Data stored in: Chrome IndexedDB (phone storage)</p>
        <p style="font-size:13px;color:var(--text-secondary);">Check storage: Chrome ⋮ → Settings → Site Settings → Storage</p>
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
  },

  async chooseBackupFolder() {
    if (!window.showDirectoryPicker) {
      GuniUtils.showToast('Your browser does not support folder selection. Use manual backup instead.', 'error');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      localStorage.setItem('guni_backup_folder_handle', JSON.stringify({ name: dirHandle.name }));
      localStorage.setItem('guni_backup_folder', dirHandle.name);
      localStorage.setItem('guni_auto_backup', 'true');
      this._backupDirHandle = dirHandle;
      GuniUtils.showToast(`Folder selected: ${dirHandle.name}`);
      this.renderSettings();
      await this.saveAutoBackup();
    } catch (e) {
      if (e.name !== 'AbortError' && e.name !== 'SecurityError') {
        GuniUtils.showToast('Could not select folder: ' + e.message, 'error');
      }
    }
  },

  removeBackupFolder() {
    localStorage.removeItem('guni_backup_folder_handle');
    localStorage.removeItem('guni_backup_folder');
    localStorage.removeItem('guni_auto_backup');
    this._backupDirHandle = null;
    GuniUtils.showToast('Backup folder removed');
    this.renderSettings();
  },

  toggleAutoBackup() {
    const toggle = document.getElementById('auto-backup-toggle');
    const isOn = toggle?.checked || false;
    localStorage.setItem('guni_auto_backup', isOn ? 'true' : 'false');
    if (isOn && !localStorage.getItem('guni_backup_folder')) {
      GuniUtils.showToast('Select a backup folder first', 'error');
      toggle.checked = false;
      localStorage.setItem('guni_auto_backup', 'false');
    } else if (isOn) {
      GuniUtils.showToast('Auto-backup enabled');
      this.saveAutoBackup();
    } else {
      GuniUtils.showToast('Auto-backup disabled');
    }
  },

  async saveAutoBackup() {
    const isEnabled = localStorage.getItem('guni_auto_backup') === 'true';
    const folderName = localStorage.getItem('guni_backup_folder');
    if (!isEnabled || !folderName) return;
    try {
      let dirHandle = this._backupDirHandle;
      if (!dirHandle && window.showDirectoryPicker) {
        try {
          dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'guni-backup', startIn: 'documents' });
          this._backupDirHandle = dirHandle;
        } catch { return; }
      }
      if (!dirHandle) return;
      const data = await GuniDB.exportAll();
      const jsonStr = JSON.stringify(data, null, 2);
      const fileName = `guni-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
    } catch (e) {
      console.error('Auto-backup failed:', e);
    }
  },

  async autoBackupIfEnabled() {
    if (localStorage.getItem('guni_auto_backup') === 'true' && localStorage.getItem('guni_backup_folder')) {
      await this.saveAutoBackup();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => GuniApp.init());
