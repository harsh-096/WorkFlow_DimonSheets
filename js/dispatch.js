const GuniDispatch = {
  async renderList() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Dispatch';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const dispatches = await GuniDB.getDispatchesWithDetails();

    c.innerHTML = `
      <div class="page-header">
        <div><h2>Dispatch</h2><div class="subtitle">${dispatches.length} total</div></div>
        <button class="btn btn-sm btn-primary" onclick="window.location.hash='dispatch-new'">+ New</button>
      </div>
      <div class="card">
        ${dispatches.length === 0 ? '<div class="empty-state"><div class="empty-icon">📦</div><h3>No Dispatches Yet</h3></div>' :
        dispatches.map(d => `
          <div class="list-item" onclick="window.location.hash='dispatch/detail/${d.id}'">
            <div style="width:40px;height:40px;border-radius:8px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📦</div>
            <div class="info">
              <div class="title">Chalan #${d.chalan ? GuniUtils.escapeHtml(d.chalan.chalan_number) : 'Unknown'}</div>
              <div class="desc">${d.person ? GuniUtils.escapeHtml(d.person.name) : 'Unknown'} · ${d.totalSheets} sheets · ${GuniUtils.formatDate(d.created_at)}${d.sent_to ? ' → ' + GuniUtils.escapeHtml(d.sent_to) : ''}</div>
            </div>
            <span style="font-weight:700;color:var(--primary);font-size:14px;">${d.totalAmount > 0 ? GuniUtils.formatCurrency(d.totalAmount) : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async renderNew(preselectChalanId = null) {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'New Dispatch';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    const chalans = await GuniDB.getChalansWithItems();
    const activeChalans = chalans.filter(ch =>
      ch.items.some(i => i.lots.some(l => Number(l.sheets_completed) > Number(l.dispatched_qty || 0)))
    );
    const persons = await GuniDB.getAll('persons');
    const deliveryPersons = persons.filter(p => p.type === 'delivery' || p.type === 'worker');

    c.innerHTML = `
      <div class="card">
        <div class="form-group">
          <label>Select Chalan *</label>
          <select class="form-select" id="dispatch-chalan" onchange="GuniDispatch.onChalanChange()">
            <option value="">Choose chalan...</option>
            ${activeChalans.map(ch => `<option value="${ch.id}" ${preselectChalanId == ch.id ? 'selected' : ''}>Chalan #${GuniUtils.escapeHtml(ch.chalan_number)} (${ch.person ? GuniUtils.escapeHtml(ch.person.name) : ''})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Delivery Person (who picks up) *</label>
          <select class="form-select" id="dispatch-person">
            <option value="">Select person...</option>
            ${deliveryPersons.map(p => `<option value="${p.id}">${GuniUtils.escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Sent To (retailer/company name)</label>
          <input class="form-input" id="dispatch-sent-to" placeholder="Where is this going?">
        </div>
        <div class="form-group">
          <label>Received By (signature at destination)</label>
          <input class="form-input" id="dispatch-received-by" placeholder="Who received at destination?">
        </div>
      </div>

      <div class="card" id="dispatch-items-container">
        <div class="empty-state" style="padding:20px;"><p>Select a chalan to see available lots</p></div>
      </div>

      <button class="btn btn-primary btn-block" onclick="GuniDispatch.saveDispatch()" style="margin-top:8px;">✅ Save Dispatch</button>
    `;
    GuniUtils.showLoading(false);
    if (preselectChalanId) {
      setTimeout(() => this.onChalanChange(), 100);
    }
  },

  async onChalanChange() {
    const chalanId = parseInt(document.getElementById('dispatch-chalan')?.value);
    const container = document.getElementById('dispatch-items-container');
    if (!chalanId) {
      container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>Select a chalan to see available lots</p></div>';
      return;
    }
    const chalan = await GuniDB.getChalanDetail(chalanId);
    if (!chalan) return;

    let html = `<h3 style="margin-bottom:10px;">Available Lots from Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</h3>`;
    let hasItems = false;

    chalan.items.forEach(item => {
      item.lots.forEach((lot, li) => {
        const available = Number(lot.sheets_completed) - Number(lot.dispatched_qty || 0);
        if (available <= 0) return;
        hasItems = true;
        html += `
          <div class="dispatch-lot-row" style="padding:12px;background:var(--bg);border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
              <strong style="flex:1;">${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'} — Lot ${li+1}</strong>
              <span style="font-size:13px;color:var(--text-secondary);">Available: ${available} / ${lot.sheets_count} sheets</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <div style="flex:1;">
                <label style="font-size:12px;color:var(--text-secondary);">Sheets to dispatch</label>
                <input class="form-input" type="number" id="dispatch-qty-${lot.id}" min="0" max="${available}" value="${Math.min(available, lot.sheets_completed)}" style="padding:8px;">
              </div>
              <div style="flex:1;">
                <label style="font-size:12px;color:var(--text-secondary);">Total Amount (₹)</label>
                <input class="form-input" type="number" id="dispatch-amount-${lot.id}" min="0" step="0.01" value="${lot.price_per_sheet ? lot.sheets_completed * lot.price_per_sheet : 0}" style="padding:8px;">
              </div>
            </div>
            <input type="hidden" id="dispatch-lot-id-${lot.id}" value="${lot.id}">
          </div>`;
      });
    });

    container.innerHTML = html + (!hasItems ? '<div class="empty-state" style="padding:20px;"><p>No lots available for dispatch</p></div>' : '');
  },

  async saveDispatch() {
    const chalanId = parseInt(document.getElementById('dispatch-chalan')?.value);
    const personId = parseInt(document.getElementById('dispatch-person')?.value);
    const sentTo = document.getElementById('dispatch-sent-to')?.value.trim();
    const receivedBy = document.getElementById('dispatch-received-by')?.value.trim();

    if (!chalanId) { GuniUtils.showToast('Select a chalan', 'error'); return; }
    if (!personId) { GuniUtils.showToast('Select a delivery person', 'error'); return; }

    const lotRows = document.querySelectorAll('.dispatch-lot-row');
    const items = [];
    lotRows.forEach(row => {
      const qtyInput = row.querySelector('input[type="number"]');
      const hiddenInput = row.querySelector('input[type="hidden"]');
      if (!qtyInput || !hiddenInput) return;
      const lotId = parseInt(hiddenInput.value);
      const qty = parseInt(qtyInput.value) || 0;
      const amtInput = document.getElementById(`dispatch-amount-${lotId}`);
      const amount = parseFloat(amtInput?.value) || 0;
      if (qty > 0) {
        items.push({ chalan_lot_id: lotId, sheets_dispatched: qty, total_amount: amount });
      }
    });

    if (items.length === 0) { GuniUtils.showToast('No items to dispatch', 'error'); return; }

    GuniUtils.showLoading(true);
    try {
      const dispatchId = await GuniDB.add('dispatches', {
        chalan_id: chalanId,
        delivery_person_id: personId,
        sent_to: sentTo || '',
        received_by: receivedBy || '',
        dispatched_datetime: GuniUtils.nowISO()
      });
      for (const item of items) {
        await GuniDB.add('dispatch_items', { dispatch_id: dispatchId, ...item });
      }
      GuniUtils.showToast('Dispatch saved!');
      GuniApp.autoBackupIfEnabled();
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
    const allLots = await GuniDB.getAll('chalan_lots');
    const allItems = await GuniDB.getAll('chalan_items');
    const designs = await GuniDB.getAll('designs');

    const lotMap = {}; allLots.forEach(l => lotMap[l.id] = l);
    const itemMap = {}; allItems.forEach(i => itemMap[i.id] = i);
    const designMap = {}; designs.forEach(d => designMap[d.id] = d);

    const totalAmount = dispatchItems.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalSheets = dispatchItems.reduce((s, i) => s + Number(i.sheets_dispatched || 0), 0);

    c.innerHTML = `
      <div class="card">
        <h3>Dispatch Details</h3>
        <div class="row"><span class="label">Chalan</span><span class="value">#${chalan ? GuniUtils.escapeHtml(chalan.chalan_number) : 'N/A'}</span></div>
        <div class="row"><span class="label">Picked Up By</span><span class="value">${person ? GuniUtils.escapeHtml(person.name) : 'Unknown'}</span></div>
        ${dispatch.sent_to ? `<div class="row"><span class="label">Sent To</span><span class="value" style="font-weight:600;">${GuniUtils.escapeHtml(dispatch.sent_to)}</span></div>` : ''}
        ${dispatch.received_by ? `<div class="row"><span class="label">Received By</span><span class="value" style="font-weight:600;">${GuniUtils.escapeHtml(dispatch.received_by)}</span></div>` : ''}
        <div class="row"><span class="label">Date</span><span class="value">${GuniUtils.formatDateTime(dispatch.dispatched_datetime || dispatch.created_at)}</span></div>
      </div>

      <div class="card">
        <h3>Items Dispatched (${totalSheets} sheets)</h3>
        ${dispatchItems.map(di => {
          const lot = lotMap[di.chalan_lot_id];
          const item = lot ? itemMap[lot.chalan_item_id] : null;
          const design = item ? designMap[item.design_id] : null;
          return `
          <div class="row">
            <span class="label">${design ? GuniUtils.escapeHtml(design.name) : 'Unknown'}${lot ? ` (Lot ${(allLots.filter(l => l.chalan_item_id === lot.chalan_item_id).indexOf(lot) + 1) || ''})` : ''}</span>
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
