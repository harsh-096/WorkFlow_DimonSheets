const GuniComparison = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Comparison';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalans = await GuniDB.getChalansWithItems();
    const openChalans = chalans.filter(ch =>
      ch.items.some(i => i.lots.some(l => Number(l.sheets_completed) < Number(l.sheets_count)))
    );

    c.innerHTML = `
      <div class="page-header">
        <h2>Comparison</h2>
        <span style="font-size:13px;color:var(--text-secondary);">Received vs Completed</span>
      </div>
      ${openChalans.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>All Caught Up!</h3>
            <p>No pending lots to complete</p>
          </div>
        </div>
      ` : openChalans.map(ch => `
        <div class="card" style="padding:0;overflow:hidden;">
          <div style="background:var(--primary);color:white;padding:12px 16px;">
            <strong>Chalan #${GuniUtils.escapeHtml(ch.chalan_number)}</strong>
            <span style="font-size:13px;margin-left:8px;">${ch.person ? GuniUtils.escapeHtml(ch.person.name) : ''}</span>
          </div>
          ${ch.items.filter(item => item.lots.some(l => Number(l.sheets_completed) < Number(l.sheets_count))).map(item => `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
              <h3 style="font-size:14px;margin-bottom:8px;">${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'}</h3>
              ${item.lots.map((lot, li) => `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px;background:var(--bg);border-radius:8px;margin-bottom:6px;">
                  <div style="border-right:1px solid var(--border);padding-right:10px;">
                    <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-bottom:4px;">📥 RECEIVED</div>
                    <div style="font-size:15px;font-weight:600;">Lot ${li+1}: ${lot.sheets_count} sheets</div>
                    <div style="font-size:12px;color:var(--text-secondary);">From: ${ch.person ? GuniUtils.escapeHtml(ch.person.name) : 'Unknown'}</div>
                  </div>
                  <div>
                    <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-bottom:4px;">⚙️ COMPLETED</div>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <input class="form-input" type="number" id="cmp-completed-${lot.id}" value="${lot.sheets_completed || 0}" min="0" max="${lot.sheets_count}" style="padding:6px 8px;width:70px;">
                      <span style="font-size:13px;">/ ${lot.sheets_count}</span>
                      <button class="btn btn-sm btn-primary" onclick="GuniComparison.updateCompleted(${lot.id}, ${ch.id})">✓</button>
                    </div>
                    ${lot.price_per_sheet > 0 ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">💰 ${GuniUtils.formatCurrency(lot.price_per_sheet)}/sheet · Total: ${GuniUtils.formatCurrency(lot.sheets_count * lot.price_per_sheet)}</div>` :
                      `<button class="btn btn-sm btn-secondary" style="margin-top:4px;font-size:11px;" onclick="GuniChalans.setLotPrice(${item.id}, ${ch.id})">💰 Set Price</button>`}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
    GuniUtils.showLoading(false);
  },

  async renderForChalan(chalanId) {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Comparison';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.add('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalan = await GuniDB.getChalanDetail(chalanId);
    if (!chalan) {
      c.innerHTML = '<div class="empty-state"><h3>Chalan not found</h3></div>';
      GuniUtils.showLoading(false);
      return;
    }

    const allCompleted = chalan.items.every(item => item.lots.every(l => Number(l.sheets_completed) >= Number(l.sheets_count)));

    c.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="background:var(--primary);color:white;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</strong>
            <span style="font-size:13px;margin-left:8px;">${chalan.person ? GuniUtils.escapeHtml(chalan.person.name) : ''}</span>
          </div>
          ${allCompleted ? '<span style="font-size:13px;background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:10px;">✅ All Done</span>' : ''}
        </div>
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;gap:8px;font-size:13px;background:var(--bg);">
          <span>📥 Received: ${GuniUtils.escapeHtml(chalan.signature || '-')}</span>
          <span>📅 ${GuniUtils.formatDate(chalan.created_at)}</span>
        </div>
      </div>

      ${chalan.items.map(item => `
        <div class="card">
          <div style="display:flex;gap:12px;margin-bottom:10px;">
            ${item.images.length > 0 ? `<img src="${item.images[item.images.length-1].image_blob}" class="design-thumb" onclick="GuniUtils.previewImage('${item.images[item.images.length-1].image_blob}')">` : '<div class="no-image" style="width:60px;height:60px;">No Photo</div>'}
            <div style="flex:1;">
              <h3>${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'}</h3>
            </div>
          </div>
          ${item.lots.map((lot, li) => {
            const done = Number(lot.sheets_completed) >= Number(lot.sheets_count);
            return `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px;background:var(--bg);border-radius:8px;margin-bottom:6px;${done ? 'opacity:0.7;' : ''}">
              <div style="border-right:1px solid var(--border);padding-right:10px;">
                <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-bottom:4px;">📥 RECEIVED</div>
                <div style="font-size:14px;font-weight:600;">Lot ${li+1}</div>
                <div style="font-size:15px;">${lot.sheets_count} sheets</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-secondary);font-weight:600;margin-bottom:4px;">⚙️ COMPLETED</div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                  <input class="form-input" type="number" id="cmp-completed-${lot.id}" value="${lot.sheets_completed || 0}" min="0" max="${lot.sheets_count}" style="padding:6px 8px;width:65px;">
                  <span style="font-size:13px;">/ ${lot.sheets_count}</span>
                  <button class="btn btn-sm ${done ? 'btn-success' : 'btn-primary'}" onclick="GuniComparison.updateCompleted(${lot.id}, ${chalanId})">${done ? '✓' : 'Save'}</button>
                </div>
                ${lot.price_per_sheet > 0 ? `
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
                    💰 ${GuniUtils.formatCurrency(lot.price_per_sheet)}/sheet<br>
                    <strong>Lot total: ${GuniUtils.formatCurrency(lot.sheets_count * lot.price_per_sheet)}</strong>
                    ${lot.sheets_completed > 0 ? ` · Completed value: ${GuniUtils.formatCurrency(lot.sheets_completed * lot.price_per_sheet)}` : ''}
                  </div>
                ` : `
                  <button class="btn btn-sm btn-secondary" style="margin-top:6px;font-size:11px;" onclick="GuniChalans.setLotPrice(${item.id}, ${chalanId})">💰 Set Price</button>
                `}
              </div>
            </div>`;
          }).join('')}
        </div>
      `).join('')}

      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="window.location.hash='chalan/detail/${chalanId}'">← Back to Chalan</button>
        <button class="btn btn-secondary" onclick="GuniReports.previewReport(${chalanId})">📄 Report</button>
      </div>
      <div style="height:20px;"></div>
    `;
    GuniUtils.showLoading(false);
  },

  async updateCompleted(lotId, chalanId) {
    const input = document.getElementById(`cmp-completed-${lotId}`);
    if (!input) return;
    const val = parseInt(input.value);
    if (isNaN(val) || val < 0) { GuniUtils.showToast('Enter a valid number', 'error'); return; }

    const lot = await GuniDB.get('chalan_lots', lotId);
    if (!lot) return;
    lot.sheets_completed = Math.min(val, lot.sheets_count);
    await GuniDB.put('chalan_lots', lot);
    GuniUtils.showToast('Updated!');

    if (window.location.hash.startsWith('#comparison/')) {
      this.renderForChalan(chalanId);
    } else {
      this.render();
    }
  }
};
