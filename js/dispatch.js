const GuniDispatch = {
  async renderList() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Dispatches';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const dispatches = await GuniDB.getAll('dispatches');
    const chalans = await GuniDB.getAll('chalans');
    const persons = await GuniDB.getAll('persons');
    const dispatchItems = await GuniDB.getAll('dispatch_items');

    const chalanMap = {};
    chalans.forEach(ch => chalanMap[ch.id] = ch);
    const personMap = {};
    persons.forEach(p => personMap[p.id] = p);

    const itemsByDispatch = {};
    dispatchItems.forEach(di => {
      if (!itemsByDispatch[di.dispatch_id]) itemsByDispatch[di.dispatch_id] = [];
      itemsByDispatch[di.dispatch_id].push(di);
    });

    dispatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    c.innerHTML = `
      <div class="page-header">
        <div><h2>Dispatches</h2><div class="subtitle">${dispatches.length} total</div></div>
        <button class="btn btn-sm btn-primary" onclick="window.location.hash='dispatch-new'">+ New</button>
      </div>
      <div class="card">
        ${dispatches.length === 0 ? '<div class="empty-state"><div class="empty-icon">📦</div><h3>No Dispatches Yet</h3></div>' :
        dispatches.map(d => {
          const ch = chalanMap[d.chalan_id];
          const person = personMap[d.delivery_person_id];
          const items = itemsByDispatch[d.id] || [];
          const totalSheets = items.reduce((s, i) => s + Number(i.sheets_dispatched), 0);
          const totalAmount = items.reduce((s, i) => s + Number(i.total_amount || 0), 0);
          return `
          <div class="list-item" onclick="window.location.hash='dispatch/detail/${d.id}'">
            <div style="width:40px;height:40px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📦</div>
            <div class="info">
              <div class="title">Chalan #${ch ? GuniUtils.escapeHtml(ch.chalan_number) : 'Unknown'}</div>
              <div class="desc">${person ? GuniUtils.escapeHtml(person.name) : 'Unknown'} · ${totalSheets} sheets · ${GuniUtils.formatDate(d.created_at)}</div>
            </div>
            <span style="font-weight:700;color:var(--primary);font-size:14px;">${GuniUtils.formatCurrency(totalAmount)}</span>
          </div>`;
        }).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async renderNew() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'New Dispatch';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    const chalans = await GuniDB.getChalansWithItems();
    const activeChalans = chalans.filter(ch =>
      ch.items.some(i => i.total_produced > (i.dispatched_qty || 0))
    );
    const persons = await GuniDB.getAll('persons');
    const deliveryPersons = persons.filter(p => p.type === 'delivery' || p.type === 'worker');

    c.innerHTML = `
      <div class="card">
        <div class="form-group">
          <label>Select Chalan *</label>
          <select class="form-select" id="dispatch-chalan" onchange="GuniDispatch.onChalanChange()">
            <option value="">Choose chalan...</option>
            ${activeChalans.map(ch => `<option value="${ch.id}">Chalan #${GuniUtils.escapeHtml(ch.chalan_number)} (${ch.person ? GuniUtils.escapeHtml(ch.person.name) : ''})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Delivery Person *</label>
          <select class="form-select" id="dispatch-person">
            <option value="">Select person...</option>
            ${deliveryPersons.map(p => `<option value="${p.id}">${GuniUtils.escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="card" id="dispatch-items-container">
        <div class="empty-state" style="padding:20px;"><p>Select a chalan to see items</p></div>
      </div>

      <button class="btn btn-primary btn-block" onclick="GuniDispatch.saveDispatch()" style="margin-top:8px;">✅ Save Dispatch</button>
    `;
    GuniUtils.showLoading(false);
  },

  async onChalanChange() {
    const chalanId = parseInt(document.getElementById('dispatch-chalan')?.value);
    const container = document.getElementById('dispatch-items-container');
    if (!chalanId) {
      container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>Select a chalan to see items</p></div>';
      return;
    }
    const chalan = await GuniDB.getChalanDetail(chalanId);
    if (!chalan) return;

    container.innerHTML = `<h3 style="margin-bottom:8px;">Items from Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</h3>`;
    chalan.items.forEach(item => {
      const available = item.total_produced - (item.dispatched_qty || 0);
      if (available <= 0) return;
      const div = document.createElement('div');
      div.className = 'dispatch-item-row';
      div.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border);';
      div.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
          <strong style="flex:1;">${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'}</strong>
          <span style="font-size:13px;color:var(--text-secondary);">Available: ${available}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);">Sheets to dispatch</label>
            <input class="form-input" type="number" id="dispatch-qty-${item.id}" min="0" max="${available}" value="${available}" style="padding:8px;" data-available="${available}">
          </div>
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-secondary);">Total Amount (₹)</label>
            <input class="form-input" type="number" id="dispatch-amount-${item.id}" min="0" step="0.01" value="0" style="padding:8px;">
          </div>
        </div>
        <input type="hidden" id="dispatch-item-id-${item.id}" value="${item.id}">
      `;
      container.appendChild(div);
    });
  },

  async saveDispatch() {
    const chalanId = parseInt(document.getElementById('dispatch-chalan')?.value);
    const personId = parseInt(document.getElementById('dispatch-person')?.value);
    if (!chalanId) { GuniUtils.showToast('Select a chalan', 'error'); return; }
    if (!personId) { GuniUtils.showToast('Select a delivery person', 'error'); return; }

    const itemRows = document.querySelectorAll('.dispatch-item-row');
    const items = [];
    itemRows.forEach(row => {
      const qtyInput = row.querySelector('input[type="number"]');
      const hiddenInput = row.querySelector('input[type="hidden"]');
      if (!qtyInput || !hiddenInput) return;
      const chalanItemId = parseInt(hiddenInput.value);
      const qty = parseInt(qtyInput.value) || 0;
      const amtInput = document.getElementById(`dispatch-amount-${chalanItemId}`);
      const amount = parseFloat(amtInput?.value) || 0;
      if (qty > 0) {
        items.push({ chalan_item_id: chalanItemId, sheets_dispatched: qty, total_amount: amount });
      }
    });

    if (items.length === 0) { GuniUtils.showToast('No items to dispatch', 'error'); return; }

    GuniUtils.showLoading(true);
    try {
      const dispatchId = await GuniDB.add('dispatches', {
        chalan_id: chalanId,
        delivery_person_id: personId,
        dispatched_datetime: GuniUtils.nowISO()
      });
      for (const item of items) {
        await GuniDB.add('dispatch_items', { dispatch_id: dispatchId, ...item });
      }
      GuniUtils.showToast('Dispatch saved!');
      window.location.hash = 'dispatches';
    } catch (e) {
      GuniUtils.showToast('Error: ' + e.message, 'error');
    }
    GuniUtils.showLoading(false);
  },

  async renderDetail(dispatchId) {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Dispatch Detail';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const dispatch = await GuniDB.get('dispatches', dispatchId);
    if (!dispatch) {
      c.innerHTML = '<div class="empty-state"><h3>Dispatch not found</h3></div>';
      GuniUtils.showLoading(false);
      return;
    }

    const chalan = await GuniDB.getChalanDetail(dispatch.chalan_id);
    const person = await GuniDB.get('persons', dispatch.delivery_person_id);
    const dispatchItems = await GuniDB.getByField('dispatch_items', 'dispatch_id', dispatchId);
    const allItems = await GuniDB.getAll('chalan_items');
    const designs = await GuniDB.getAll('designs');
    const designMap = {};
    designs.forEach(d => designMap[d.id] = d);

    const totalAmount = dispatchItems.reduce((s, i) => s + Number(i.total_amount || 0), 0);

    c.innerHTML = `
      <div class="card">
        <h3>Dispatch Details</h3>
        <div class="row"><span class="label">Chalan</span><span class="value">#${chalan ? GuniUtils.escapeHtml(chalan.chalan_number) : 'N/A'}</span></div>
        <div class="row"><span class="label">Delivery Person</span><span class="value">${person ? GuniUtils.escapeHtml(person.name) : 'Unknown'}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${GuniUtils.formatDateTime(dispatch.dispatched_datetime || dispatch.created_at)}</span></div>
      </div>

      <div class="card">
        <h3>Items Dispatched</h3>
        ${dispatchItems.map(di => {
          const item = allItems.find(i => i.id === di.chalan_item_id);
          const design = item ? designMap[item.design_id] : null;
          return `
          <div class="row">
            <span class="label">${design ? GuniUtils.escapeHtml(design.name) : 'Unknown'}</span>
            <span class="value">${di.sheets_dispatched} sheets · ${GuniUtils.formatCurrency(di.total_amount)}</span>
          </div>`;
        }).join('')}
        <div class="row" style="border-top:2px solid var(--text);margin-top:8px;padding-top:12px;">
          <span class="label" style="font-weight:700;">Grand Total</span>
          <span class="value" style="font-size:18px;font-weight:700;color:var(--primary);">${GuniUtils.formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="GuniReports.previewReport(${dispatch.chalan_id})">📄 View Report</button>
        <button class="btn btn-danger" onclick="GuniDispatch.deleteDispatch(${dispatchId})">🗑️ Delete</button>
      </div>
      <div style="height:20px;"></div>
    `;
    GuniUtils.showLoading(false);
  },

  async deleteDispatch(id) {
    const confirmed = await GuniUtils.confirmDialog('Delete this dispatch record?');
    if (!confirmed) return;
    const items = await GuniDB.getByField('dispatch_items', 'dispatch_id', id);
    for (const item of items) await GuniDB.delete('dispatch_items', item.id);
    await GuniDB.delete('dispatches', id);
    GuniUtils.showToast('Dispatch deleted');
    window.location.hash = 'dispatches';
  }
};
