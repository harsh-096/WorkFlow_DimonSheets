const GuniDashboard = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Guni';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    try {
      const stats = await GuniDB.getDashboardStats();
      const recentChalans = await GuniDB.getChalansWithItems();

      c.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-number">${stats.openChalans}</div><div class="stat-label">Open Chalans</div></div>
          <div class="stat-card"><div class="stat-number">${stats.totalSheetsReceived}</div><div class="stat-label">Sheets Received</div></div>
          <div class="stat-card"><div class="stat-number">${stats.totalSheetsCompleted}</div><div class="stat-label">Sheets Completed</div></div>
          <div class="stat-card"><div class="stat-number">${stats.totalSheetsDispatched}</div><div class="stat-label">Sheets Dispatched</div></div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="btn btn-sm btn-outline" style="flex:1;" onclick="window.location.hash='persons'">👤 People</button>
          <button class="btn btn-sm btn-outline" style="flex:1;" onclick="window.location.hash='designs'">🎨 Designs</button>
          <button class="btn btn-sm btn-outline" style="flex:1;" onclick="window.location.hash='reports'">📄 Reports</button>
        </div>

        <div class="page-header" style="margin-top:4px;">
          <h2>Recent Chalans</h2>
          <button class="btn btn-sm btn-primary" onclick="window.location.hash='chalans'">View All</button>
        </div>
        <div class="card" id="recent-chalans">
          ${recentChalans.slice(0, 5).map(ch => `
            <div class="list-item" onclick="window.location.hash='chalan/detail/${ch.id}'">
              <div class="info">
                <div class="title">Chalan #${GuniUtils.escapeHtml(ch.chalan_number)}</div>
                <div class="desc">${ch.person ? GuniUtils.escapeHtml(ch.person.name) : 'No person'} · ${GuniUtils.formatDate(ch.created_at)}</div>
              </div>
              <span class="status-badge ${ch.status === 'closed' ? 'status-closed' : 'status-open'}">${ch.status || 'open'}</span>
            </div>
          `).join('')}
          ${recentChalans.length === 0 ? '<div class="empty-state"><div class="empty-icon">📋</div><h3>No Chalans Yet</h3><p>Tap + to create your first chalan</p></div>' : ''}
        </div>
      `;
    } catch (e) {
      c.innerHTML = `<div class="empty-state"><h3>Error loading data</h3><p>${e.message}</p></div>`;
    }
    GuniUtils.showLoading(false);
  }
};
