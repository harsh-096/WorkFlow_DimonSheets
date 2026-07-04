const GuniProduction = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Production';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalans = await GuniDB.getChalansWithItems();
    const activeItems = [];
    chalans.forEach(ch => {
      ch.items.forEach(item => {
        if (item.total_produced < item.quantity_received) {
          activeItems.push({ chalan: ch, item });
        }
      });
    });

    c.innerHTML = `
      <div class="page-header">
        <h2>Production</h2>
      </div>
      ${activeItems.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>All Caught Up!</h3>
            <p>No pending production items</p>
          </div>
        </div>
      ` : activeItems.map(({ chalan, item }) => `
        <div class="card">
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <div style="flex:1;">
              <h3>${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'}</h3>
              <p style="font-size:13px;color:var(--text-secondary);">Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</p>
            </div>
          </div>
          <div class="row"><span class="label">Progress</span><span class="value">${item.total_produced} / ${item.quantity_received}</span></div>
          <div class="progress-bar" style="height:6px;background:var(--border);border-radius:3px;margin:8px 0;">
            <div style="height:100%;width:${Math.min(100, (item.total_produced / item.quantity_received) * 100)}%;background:var(--primary);border-radius:3px;transition:width 0.3s;"></div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="GuniProduction.showForm(${item.id}, ${chalan.id})">+ Add Production</button>
        </div>
      `).join('')}
    `;
    GuniUtils.showLoading(false);
  },

  async showForm(chalanItemId, chalanId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'production-modal';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>Add Production</h3>
        <div class="form-group">
          <label>Sheets Completed *</label>
          <input class="form-input" type="number" id="prod-sheets" placeholder="Number of sheets made" min="1" step="1">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input class="form-input" type="date" id="prod-date" value="${GuniUtils.todayInput()}">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-textarea" id="prod-notes" placeholder="Optional notes"></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="GuniProduction.save(${chalanItemId}, ${chalanId})">Save Production</button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('prod-sheets')?.focus(), 200);
  },

  async save(chalanItemId, chalanId) {
    const sheets = parseInt(document.getElementById('prod-sheets')?.value);
    if (!sheets || sheets <= 0) { GuniUtils.showToast('Enter valid sheets count', 'error'); return; }
    const date = document.getElementById('prod-date')?.value;
    const notes = document.getElementById('prod-notes')?.value.trim();

    await GuniDB.add('production', {
      chalan_item_id: chalanItemId,
      sheets_completed: sheets,
      production_date: date ? new Date(date).toISOString() : GuniUtils.nowISO(),
      notes: notes || ''
    });

    document.getElementById('production-modal')?.remove();
    GuniUtils.showToast('Production recorded!');
    if (window.location.hash.includes('chalan/detail')) {
      GuniChalans.renderDetail(chalanId);
    } else {
      this.render();
    }
  }
};
