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
            <span class="status-badge ${ch.status === 'closed' ? 'status-closed' : ch.items.some(i => i.total_completed > 0) ? 'status-partial' : 'status-open'}">${ch.status === 'closed' ? 'Closed' : ch.items.some(i => i.total_completed > 0) ? 'In Progress' : 'Open'}</span>
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
      <div class="card">
        <div class="form-group">
          <label>Chalan Number *</label>
          <input class="form-input" id="chalan-number" placeholder="e.g. 12, 13, 14">
        </div>
        <div class="form-group">
          <label>Delivery Person (who gave the sheets) *</label>
          <select class="form-select" id="chalan-person">
            <option value="">Select person...</option>
            ${deliveryPersons.map(p => `<option value="${p.id}">${GuniUtils.escapeHtml(p.name)}${p.phone ? ' (' + GuniUtils.escapeHtml(p.phone) + ')' : ''}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-secondary" style="margin-top:6px;" onclick="GuniPersons.showForm(null, () => GuniChalans.refreshPersonDropdown());">+ Add New Person</button>
        </div>
        <div class="form-group">
          <label>Date & Time Received</label>
          <input class="form-input" type="datetime-local" id="chalan-datetime" value="${GuniUtils.nowInput()}">
        </div>
        <div class="form-group">
          <label>Received By (signature - person from your side) *</label>
          <input class="form-input" id="chalan-signature" placeholder="Your worker's name who received the sheets">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-textarea" id="chalan-notes" placeholder="Any notes about this chalan..."></textarea>
        </div>
      </div>

      <div class="page-header">
        <h2>Items (Designs + Lots)</h2>
        <button class="btn btn-sm btn-secondary" onclick="GuniChalans.addItemRow()">+ Add Item</button>
      </div>
      <div class="card" id="items-container">
        <div class="empty-state" style="padding:20px;">
          <p>No items added yet. Tap "Add Item" to add designs with lots.</p>
        </div>
      </div>

      <button class="btn btn-primary btn-block" onclick="GuniChalans.saveChalan()" style="margin-top:8px;">💾 Save Chalan</button>
    `;
    GuniUtils.showLoading(false);
  },

  _itemCount: 0,
  _lotCounters: {},

  async addItemRow() {
    const designs = await GuniDB.getAll('designs');
    const container = document.getElementById('items-container');
    if (!container) return;

    const empty = container.querySelector('.empty-state');
    if (empty) container.innerHTML = '';

    this._itemCount++;
    const idx = this._itemCount;
    this._lotCounters[idx] = 0;

    const row = document.createElement('div');
    row.className = 'chalan-item-row';
    row.id = `item-row-${idx}`;
    row.style.cssText = 'padding:16px 0;border-bottom:1px solid var(--border);margin-bottom:8px;';
    row.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
        <select class="form-select" id="item-design-${idx}" style="flex:1;">
          <option value="">Select design...</option>
          ${designs.map(d => `<option value="${d.id}">${GuniUtils.escapeHtml(d.name)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-secondary" onclick="GuniChalans.addInlineDesign(${idx})">+ New Design</button>
        <button class="btn btn-sm btn-danger" onclick="GuniChalans.removeItemRow(${idx})">×</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Lots:</div>
      <div id="lots-container-${idx}">
        <div class="empty-state" style="padding:12px;font-size:13px;">
          <p>No lots. Click "+ Add Lot" below.</p>
        </div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="GuniChalans.addLot(${idx})" style="margin-top:6px;">+ Add Lot</button>
    `;
    container.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  removeItemRow(idx) {
    const row = document.getElementById(`item-row-${idx}`);
    if (row) row.remove();
    delete this._lotCounters[idx];
  },

  addLot(itemIdx) {
    const container = document.getElementById(`lots-container-${itemIdx}`);
    if (!container) return;
    this._lotCounters[itemIdx] = (this._lotCounters[itemIdx] || 0) + 1;
    const lotIdx = this._lotCounters[itemIdx];

    const empty = container.querySelector('.empty-state');
    if (empty) container.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'lot-row';
    div.id = `lot-row-${itemIdx}-${lotIdx}`;
    div.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px;background:var(--bg);border-radius:6px;margin-bottom:6px;';
    div.innerHTML = `
      <div style="flex:1;">
        <label style="font-size:11px;color:var(--text-secondary);display:block;">Sheets in this lot</label>
        <input class="form-input" type="number" id="lot-sheets-${itemIdx}-${lotIdx}" placeholder="Sheet count" min="1" style="padding:6px 8px;">
      </div>
      <button class="btn btn-sm btn-danger" onclick="document.getElementById('lot-row-${itemIdx}-${lotIdx}')?.remove()" style="margin-top:14px;">×</button>
    `;
    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  async addInlineDesign(itemIdx) {
    const name = prompt('Enter new design name:');
    if (!name || !name.trim()) return;
    GuniUtils.showLoading(true);
    try {
      const designId = await GuniDB.add('designs', { name: name.trim() });
      const select = document.getElementById(`item-design-${itemIdx}`);
      if (select) {
        const opt = document.createElement('option');
        opt.value = designId;
        opt.textContent = name.trim();
        opt.selected = true;
        select.appendChild(opt);
      }
      GuniUtils.showToast(`Design "${name.trim()}" added`);
    } catch (e) {
      GuniUtils.showToast('Error: ' + e.message, 'error');
    }
    GuniUtils.showLoading(false);
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
    if (currentValue && deliveryPersons.some(p => p.id == currentValue)) {
      select.value = currentValue;
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
    if (!signature) { GuniUtils.showToast('Enter who received the sheets (signature)', 'error'); return; }

    const rows = document.querySelectorAll('.chalan-item-row');
    const items = [];
    let hasError = false;

    rows.forEach(row => {
      if (hasError) return;
      const id = row.id.replace('item-row-', '');
      const designId = parseInt(document.getElementById(`item-design-${id}`)?.value);
      if (!designId) return;

      const lotContainer = document.getElementById(`lots-container-${id}`);
      if (!lotContainer) return;
      const lotInputs = lotContainer.querySelectorAll('.lot-row');
      const lots = [];
      lotInputs.forEach(lr => {
        const input = lr.querySelector('input[type="number"]');
        const sheets = parseInt(input?.value) || 0;
        if (sheets > 0) lots.push({ sheets_count: sheets });
      });

      if (lots.length === 0) {
        GuniUtils.showToast(`Item "${document.getElementById(`item-design-${id}`)?.options[document.getElementById(`item-design-${id}`)?.selectedIndex]?.text || ''}" has no lots`, 'error');
        hasError = true;
        return;
      }
      items.push({ design_id: designId, lots });
    });

    if (hasError) return;
    if (items.length === 0) { GuniUtils.showToast('Add at least one item with lots', 'error'); return; }

    GuniUtils.showLoading(true);
    try {
      const chalanId = await GuniDB.add('chalans', {
        chalan_number: number,
        delivery_person_id: personId,
        received_datetime: datetime ? new Date(datetime).toISOString() : GuniUtils.nowISO(),
        signature: signature,
        notes: notes || '',
        status: 'open'
      });

      for (const item of items) {
        const itemId = await GuniDB.add('chalan_items', { chalan_id: chalanId, design_id: item.design_id });
        for (const lot of item.lots) {
          await GuniDB.add('chalan_lots', { chalan_item_id: itemId, sheets_count: lot.sheets_count, sheets_completed: 0, price_per_sheet: 0 });
        }
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
            <p style="font-size:13px;">${chalan.person ? 'Delivered by: ' + GuniUtils.escapeHtml(chalan.person.name) + (chalan.person.phone ? ' · ' + GuniUtils.escapeHtml(chalan.person.phone) : '') : ''}</p>
          </div>
          <span class="status-badge ${chalan.status === 'closed' ? 'status-closed' : 'status-open'}">${chalan.status || 'open'}</span>
        </div>
        <div class="row"><span class="label">Date Received</span><span class="value">${GuniUtils.formatDateTime(chalan.received_datetime || chalan.created_at)}</span></div>
        <div class="row"><span class="label">Received By</span><span class="value" style="font-weight:600;">${GuniUtils.escapeHtml(chalan.signature || '-')}</span></div>
        ${chalan.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${GuniUtils.escapeHtml(chalan.notes)}</span></div>` : ''}
        <div class="row"><span class="label">Items</span><span class="value">${chalan.items.length}</span></div>
      </div>

      <div class="page-header">
        <h2>Items & Lots</h2>
      </div>

      ${chalan.items.map(item => `
        <div class="card">
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            ${item.images.length > 0 ? `<img src="${item.images[item.images.length-1].image_blob}" class="design-thumb" onclick="GuniUtils.previewImage('${item.images[item.images.length-1].image_blob}')">` : '<div class="no-image" style="width:80px;height:80px;">No Photo</div>'}
            <div style="flex:1;">
              <h3>${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown Design'}</h3>
              <p style="font-size:13px;color:var(--text-secondary);">Total: ${item.total_sheets} sheets across ${item.lots.length} lot(s)</p>
            </div>
          </div>

          <div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:8px;">
            ${item.lots.map((lot, li) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;${li < item.lots.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
                <div>
                  <strong>Lot ${li+1}:</strong> ${lot.sheets_count} sheets
                  ${lot.sheets_completed > 0 ? ` · <span style="color:var(--success);">${lot.sheets_completed} done</span>` : ''}
                  ${lot.price_per_sheet > 0 ? ` · ${GuniUtils.formatCurrency(lot.price_per_sheet)}/sheet` : ''}
                </div>
                <div style="font-size:13px;color:var(--text-secondary);">
                  ${lot.dispatched_qty > 0 ? `📦 ${lot.dispatched_qty}` : 'Pending'}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="window.location.hash='comparison/${chalanId}'">📊 View Comparison</button>
            <button class="btn btn-sm btn-secondary" onclick="GuniChalans.setLotPrice(${item.id}, ${chalanId})">💰 Set Lot Price</button>
          </div>
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

  async setLotPrice(itemId, chalanId) {
    const lots = await GuniDB.getByField('chalan_lots', 'chalan_item_id', itemId);
    if (lots.length === 0) { GuniUtils.showToast('No lots found', 'error'); return; }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'price-modal';
    let html = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>Set Price Per Lot</h3>`;
    lots.forEach((lot, i) => {
      html += `
        <div class="form-group" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <label>Lot ${i+1} (${lot.sheets_count} sheets) — Price per sheet (₹)</label>
          <input class="form-input" type="number" id="lot-price-${lot.id}" value="${lot.price_per_sheet || ''}" placeholder="0.00" step="0.01" min="0" style="padding:8px;">
        </div>`;
    });
    html += `
        <button class="btn btn-primary btn-block" onclick="GuniChalans.saveLotPrices(${JSON.stringify(lots.map(l => l.id))}, ${chalanId})">Save All Prices</button>
      </div>`;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  },

  async saveLotPrices(lotIds, chalanId) {
    for (const lotId of lotIds) {
      const price = parseFloat(document.getElementById(`lot-price-${lotId}`)?.value) || 0;
      const lot = await GuniDB.get('chalan_lots', lotId);
      if (lot) {
        lot.price_per_sheet = price;
        await GuniDB.put('chalan_lots', lot);
      }
    }
    document.getElementById('price-modal')?.remove();
    GuniUtils.showToast('Prices saved');
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
