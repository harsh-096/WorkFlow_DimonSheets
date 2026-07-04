const GuniChalans = {
  async renderList() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Chalans';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalans = await GuniDB.getChalansWithItems();

    c.innerHTML = `
      <div class="page-header">
        <div><h2>All Chalans</h2><div class="subtitle">${chalans.length} total</div></div>
        <button class="btn btn-sm btn-primary" onclick="window.location.hash='chalan-new'">+ New</button>
      </div>
      <div class="card">
        ${chalans.length === 0 ? '<div class="empty-state"><div class="empty-icon">📋</div><h3>No Chalans Yet</h3><p>Create your first chalan</p></div>' :
        chalans.map(ch => `
          <div class="list-item" onclick="window.location.hash='chalan/detail/${ch.id}'">
            <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📋</div>
            <div class="info">
              <div class="title">Chalan #${GuniUtils.escapeHtml(ch.chalan_number)}</div>
              <div class="desc">${ch.person ? GuniUtils.escapeHtml(ch.person.name) : 'Unknown'} · ${ch.items.length} items · ${GuniUtils.formatDate(ch.created_at)}</div>
            </div>
            <span class="status-badge ${ch.status === 'closed' ? 'status-closed' : ch.items.some(i => i.total_produced > 0) ? 'status-partial' : 'status-open'}">${ch.status === 'closed' ? 'Closed' : ch.items.some(i => i.total_produced > 0) ? 'In Progress' : 'Open'}</span>
          </div>
        `).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async renderNew() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'New Chalan';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    const persons = await GuniDB.getAll('persons');
    const deliveryPersons = persons.filter(p => p.type === 'delivery' || p.type === 'worker');

    c.innerHTML = `
      <div class="card" style="margin-bottom:12px;">
        <div class="form-group">
          <label>Chalan Number *</label>
          <input class="form-input" id="chalan-number" placeholder="e.g. 12, 13, 14">
        </div>
        <div class="form-group">
          <label>Delivery Person *</label>
          <select class="form-select" id="chalan-person">
            <option value="">Select person...</option>
            ${deliveryPersons.map(p => `<option value="${p.id}">${GuniUtils.escapeHtml(p.name)}${p.phone ? ' (' + GuniUtils.escapeHtml(p.phone) + ')' : ''}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-secondary" style="margin-top:6px;" onclick="GuniPersons.showForm(null, () => GuniChalans.refreshPersonDropdown());">+ Add New Person</button>
        </div>
        <div class="form-group">
          <label>Date & Time</label>
          <input class="form-input" type="datetime-local" id="chalan-datetime" value="${GuniUtils.nowInput()}">
        </div>
        <div class="form-group">
          <label>Signature (Person Name)</label>
          <input class="form-input" id="chalan-signature" placeholder="Delivery person's name">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-textarea" id="chalan-notes" placeholder="Any notes..."></textarea>
        </div>
      </div>

      <div class="page-header">
        <h2>Items</h2>
        <button class="btn btn-sm btn-secondary" onclick="GuniChalans.addItemRow()">+ Add Design</button>
      </div>
      <div class="card" id="items-container">
        <div class="empty-state" style="padding:20px;">
          <p>No items added yet. Tap "Add Design" to add items.</p>
        </div>
      </div>

      <button class="btn btn-primary btn-block" onclick="GuniChalans.saveChalan()" style="margin-top:8px;">💾 Save Chalan</button>
    `;
    GuniUtils.showLoading(false);
  },

  _itemCount: 0,

  async addItemRow() {
    const designs = await GuniDB.getAll('designs');
    const container = document.getElementById('items-container');
    if (!container) return;

    if (designs.length === 0) {
      GuniUtils.showToast('Add designs first! Go to Menu → Designs', 'error');
      return;
    }

    const empty = container.querySelector('.empty-state');
    if (empty) container.innerHTML = '';

    this._itemCount++;
    const idx = this._itemCount;
    const row = document.createElement('div');
    row.className = 'chalan-item-row';
    row.id = `item-row-${idx}`;
    row.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);';
    row.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <select class="form-select" id="item-design-${idx}" style="flex:1;">
          <option value="">Select design...</option>
          ${designs.map(d => `<option value="${d.id}">${GuniUtils.escapeHtml(d.name)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="GuniChalans.removeItemRow(${idx})">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Total Sheets</label>
          <input class="form-input" type="number" id="item-qty-${idx}" placeholder="Qty" min="0" style="padding:8px;">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Lots</label>
          <input class="form-input" type="number" id="item-lots-${idx}" placeholder="Lots" min="0" style="padding:8px;">
        </div>
      </div>
    `;
    container.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  removeItemRow(idx) {
    const row = document.getElementById(`item-row-${idx}`);
    if (row) row.remove();
  },

  async refreshPersonDropdown() {
    const select = document.getElementById('chalan-person');
    if (!select) return;
    const currentValue = select.value;
    const persons = await GuniDB.getAll('persons');
    const deliveryPersons = persons.filter(p => p.type === 'delivery' || p.type === 'worker');
    select.innerHTML = `
      <option value="">Select person...</option>
      ${deliveryPersons.map(p => `<option value="${p.id}">${GuniUtils.escapeHtml(p.name)}${p.phone ? ' (' + GuniUtils.escapeHtml(p.phone) + ')' : ''}</option>`).join('')}
    `;
    if (currentValue) {
      const stillExists = deliveryPersons.some(p => p.id == currentValue);
      if (stillExists) select.value = currentValue;
    }
  },

  async saveChalan() {
    const number = document.getElementById('chalan-number')?.value.trim();
    const personId = parseInt(document.getElementById('chalan-person')?.value);
    const datetime = document.getElementById('chalan-datetime')?.value;
    const signature = document.getElementById('chalan-signature')?.value.trim();
    const notes = document.getElementById('chalan-notes')?.value.trim();

    if (!number) { GuniUtils.showToast('Chalan number is required', 'error'); return; }
    if (!personId) { GuniUtils.showToast('Select a delivery person', 'error'); return; }

    const rows = document.querySelectorAll('.chalan-item-row');
    const items = [];
    rows.forEach(row => {
      const id = row.id.replace('item-row-', '');
      const designId = parseInt(document.getElementById(`item-design-${id}`)?.value);
      const qty = parseInt(document.getElementById(`item-qty-${id}`)?.value) || 0;
      const lots = parseInt(document.getElementById(`item-lots-${id}`)?.value) || 0;
      if (designId && qty > 0) {
        items.push({ design_id: designId, quantity_received: qty, lots });
      }
    });

    if (items.length === 0) { GuniUtils.showToast('Add at least one item with quantity', 'error'); return; }

    GuniUtils.showLoading(true);
    try {
      const chalanId = await GuniDB.add('chalans', {
        chalan_number: number,
        delivery_person_id: personId,
        received_datetime: datetime ? new Date(datetime).toISOString() : GuniUtils.nowISO(),
        signature: signature || '',
        notes: notes || '',
        status: 'open'
      });

      for (const item of items) {
        await GuniDB.add('chalan_items', { chalan_id: chalanId, ...item });
      }

      GuniUtils.showToast('Chalan saved successfully!');
      window.location.hash = `chalan/detail/${chalanId}`;
    } catch (e) {
      GuniUtils.showToast('Error saving chalan: ' + e.message, 'error');
    }
    GuniUtils.showLoading(false);
  },

  async renderDetail(chalanId) {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Chalan Detail';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalan = await GuniDB.getChalanDetail(chalanId);
    if (!chalan) {
      c.innerHTML = '<div class="empty-state"><h3>Chalan not found</h3></div>';
      GuniUtils.showLoading(false);
      return;
    }

    c.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
          <div>
            <h3>Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</h3>
            <p style="font-size:13px;">${chalan.person ? GuniUtils.escapeHtml(chalan.person.name) + (chalan.person.phone ? ' · ' + GuniUtils.escapeHtml(chalan.person.phone) : '') : ''}</p>
          </div>
          <span class="status-badge ${chalan.status === 'closed' ? 'status-closed' : 'status-open'}">${chalan.status || 'open'}</span>
        </div>
        <div class="row"><span class="label">Date</span><span class="value">${GuniUtils.formatDateTime(chalan.received_datetime || chalan.created_at)}</span></div>
        <div class="row"><span class="label">Signature</span><span class="value">${GuniUtils.escapeHtml(chalan.signature || '-')}</span></div>
        ${chalan.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${GuniUtils.escapeHtml(chalan.notes)}</span></div>` : ''}
        <div class="row"><span class="label">Items</span><span class="value">${chalan.items.length}</span></div>
      </div>

      <div class="page-header">
        <h2>Items (${chalan.items.length})</h2>
      </div>

      ${chalan.items.map(item => `
        <div class="card">
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            ${item.images.length > 0 ? `<img src="${item.images[item.images.length-1].image_blob}" class="design-thumb" onclick="GuniUtils.previewImage('${item.images[item.images.length-1].image_blob}')">` : '<div class="no-image" style="width:80px;height:80px;">No Photo</div>'}
            <div style="flex:1;">
              <h3>${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown Design'}</h3>
              <p style="font-size:13px;color:var(--text-secondary);">
                Received: ${item.quantity_received} sheets
                ${item.lots ? ' · ' + item.lots + ' lot(s)' : ''}
                ${item.lots ? ' · ' + Math.round(item.quantity_received / item.lots) + ' sheets/lot' : ''}
              </p>
            </div>
          </div>

          <div class="row"><span class="label">Produced</span><span class="value">${item.total_produced} / ${item.quantity_received} sheets</span></div>
          <div class="row"><span class="label">Dispatched</span><span class="value">${item.dispatched_qty} sheets</span></div>
          ${item.pricing ? `<div class="row"><span class="label">Price/Sheet</span><span class="value">${GuniUtils.formatCurrency(item.pricing.price_per_sheet)}</span></div>
          <div class="row"><span class="label">${item.lots ? `Total (${item.lots} lots × ${Math.round(item.quantity_received / item.lots)} sheets)` : 'Total'}</span><span class="value" style="font-weight:700;">${GuniUtils.formatCurrency(item.total_pricing)}</span></div>` : ''}

          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn btn-sm btn-primary" onclick="GuniProduction.showForm(${item.id}, ${chalanId})">+ Production</button>
            <button class="btn btn-sm btn-secondary" onclick="GuniChalans.showPricing(${item.id}, ${chalanId})">💰 Price</button>
          </div>
          ${item.production.length > 0 ? `
            <details style="margin-top:8px;">
              <summary style="font-size:13px;color:var(--text-secondary);cursor:pointer;">Production History (${item.production.length})</summary>
              ${item.production.map(p => `
                <div class="row" style="font-size:13px;">
                  <span class="label">${GuniUtils.formatDate(p.production_date || p.created_at)}</span>
                  <span class="value">${p.sheets_completed} sheets</span>
                </div>
              `).join('')}
            </details>
          ` : ''}
        </div>
      `).join('')}

      <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="GuniChalans.closeChalan(${chalanId})">${chalan.status === 'closed' ? 'Reopen' : 'Close Chalan'}</button>
        <button class="btn btn-secondary" onclick="GuniReports.previewReport(${chalanId})">📄 Report</button>
        <button class="btn btn-danger" onclick="GuniChalans.deleteChalan(${chalanId})">🗑️ Delete</button>
      </div>
      <div style="height:20px;"></div>
    `;
    GuniUtils.showLoading(false);
  },

  async showPricing(itemId, chalanId) {
    const existing = (await GuniDB.getByField('pricing', 'chalan_item_id', itemId))[0];
    const price = existing ? existing.price_per_sheet : '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'pricing-modal';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>Set Price</h3>
        <div class="form-group">
          <label>Price per sheet (₹)</label>
          <input class="form-input" type="number" id="price-per-sheet" value="${price}" placeholder="0.00" step="0.01" min="0">
        </div>
        <button class="btn btn-primary btn-block" onclick="GuniChalans.savePricing(${itemId}, ${chalanId})">Save Price</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async savePricing(itemId, chalanId) {
    const price = parseFloat(document.getElementById('price-per-sheet')?.value);
    if (isNaN(price) || price <= 0) { GuniUtils.showToast('Enter a valid price', 'error'); return; }

    const existing = (await GuniDB.getByField('pricing', 'chalan_item_id', itemId))[0];
    if (existing) {
      existing.price_per_sheet = price;
      await GuniDB.put('pricing', existing);
    } else {
      await GuniDB.add('pricing', { chalan_item_id: itemId, price_per_sheet: price });
    }
    document.getElementById('pricing-modal')?.remove();
    GuniUtils.showToast('Price saved');
    this.renderDetail(chalanId);
  },

  async closeChalan(chalanId) {
    const chalan = await GuniDB.get('chalans', chalanId);
    if (!chalan) return;
    chalan.status = chalan.status === 'closed' ? 'open' : 'closed';
    await GuniDB.put('chalans', chalan);
    GuniUtils.showToast(chalan.status === 'closed' ? 'Chalan closed' : 'Chalan reopened');
    this.renderDetail(chalanId);
  },

  async deleteChalan(chalanId) {
    const confirmed = await GuniUtils.confirmDialog('Delete this entire chalan? This cannot be undone.');
    if (!confirmed) return;
    GuniUtils.showLoading(true);
    await GuniDB.deleteChalan(chalanId);
    GuniUtils.showToast('Chalan deleted');
    window.location.hash = 'chalans';
    GuniUtils.showLoading(false);
  }
};
