const GuniReports = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Reports';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const chalans = await GuniDB.getChalansWithItems();

    c.innerHTML = `
      <div class="page-header">
        <h2>Chalan Reports</h2>
      </div>
      <div class="card">
        ${chalans.length === 0 ? '<div class="empty-state"><p>No chalans to report</p></div>' :
        chalans.map(ch => `
          <div class="list-item" onclick="GuniReports.previewReport(${ch.id})">
            <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📄</div>
            <div class="info">
              <div class="title">Chalan #${GuniUtils.escapeHtml(ch.chalan_number)}</div>
              <div class="desc">${ch.person ? GuniUtils.escapeHtml(ch.person.name) : 'Unknown'} · ${ch.items.length} items</div>
            </div>
            <button class="btn btn-sm btn-secondary">View</button>
          </div>
        `).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async previewReport(chalanId) {
    const chalan = await GuniDB.getChalanDetail(chalanId);
    if (!chalan) { GuniUtils.showToast('Chalan not found', 'error'); return; }

    const reportHtml = this.buildReportHTML(chalan);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'report-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-height:90dvh;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>Report - Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</h3>
        <div id="report-content" style="margin:12px 0;">${reportHtml}</div>
        <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--surface);padding-top:12px;border-top:1px solid var(--border);">
          <button class="btn btn-primary" style="flex:1;" onclick="GuniReports.generatePNG(${chalanId})">📷 Share as PNG</button>
          <button class="btn btn-secondary" style="flex:1;" onclick="GuniReports.generatePDF(${chalanId})">📄 Download PDF</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  buildReportHTML(chalan) {
    const totalSheets = chalan.items.reduce((s, i) => s + Number(i.quantity_received || 0), 0);
    const totalProduced = chalan.items.reduce((s, i) => s + Number(i.total_produced || 0), 0);
    const totalDispatched = chalan.items.reduce((s, i) => s + Number(i.dispatched_qty || 0), 0);
    const totalAmount = chalan.items.reduce((s, i) => s + Number(i.total_pricing || 0), 0);
    const itemsWithPricing = chalan.items.filter(i => i.pricing);

    return `
      <div class="report-card" id="report-card">
        <div class="report-header">
          <h2>Chalan Report</h2>
          <p>Chalan #${GuniUtils.escapeHtml(chalan.chalan_number)}</p>
          <p style="font-size:12px;">${chalan.person ? 'Delivery: ' + GuniUtils.escapeHtml(chalan.person.name) : ''} · ${GuniUtils.formatDate(chalan.created_at)}</p>
          ${chalan.signature ? `<p style="font-size:12px;">Signature: ${GuniUtils.escapeHtml(chalan.signature)}</p>` : ''}
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th>Design</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:center;">Lots</th>
              <th style="text-align:center;">Produced</th>
              <th style="text-align:center;">Dispatched</th>
              <th style="text-align:right;">Price/Sheet</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${chalan.items.map(item => `
              <tr>
                <td>${item.design ? GuniUtils.escapeHtml(item.design.name) : 'Unknown'}</td>
                <td style="text-align:center;">${item.quantity_received}</td>
                <td style="text-align:center;">${item.lots || '-'}</td>
                <td style="text-align:center;">${item.total_produced}</td>
                <td style="text-align:center;">${item.dispatched_qty}</td>
                <td style="text-align:right;">${item.pricing ? GuniUtils.formatCurrency(item.pricing.price_per_sheet) : '-'}</td>
                <td style="text-align:right;font-weight:600;">${item.pricing ? GuniUtils.formatCurrency(item.total_pricing) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);text-align:center;">
          <div><div style="font-size:18px;font-weight:700;color:var(--primary);">${totalSheets}</div><div style="font-size:11px;color:var(--text-secondary);">Total Sheets</div></div>
          <div><div style="font-size:18px;font-weight:700;color:var(--success);">${totalProduced}</div><div style="font-size:11px;color:var(--text-secondary);">Produced</div></div>
          <div><div style="font-size:18px;font-weight:700;color:var(--warning);">${totalDispatched}</div><div style="font-size:11px;color:var(--text-secondary);">Dispatched</div></div>
        </div>

        ${itemsWithPricing.length > 0 ? `
          <div class="report-total">
            Total Amount: ${GuniUtils.formatCurrency(totalAmount)}
          </div>
        ` : ''}
      </div>
    `;
  },

  async generatePNG(chalanId) {
    GuniUtils.showLoading(true);
    try {
      const chalan = await GuniDB.getChalanDetail(chalanId);
      if (!chalan) throw new Error('Chalan not found');

      const reportHtml = this.buildReportHTML(chalan);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:400px;background:white;padding:20px;font-family:sans-serif;z-index:-1;';
      wrapper.innerHTML = reportHtml;
      document.body.appendChild(wrapper);

      if (typeof html2canvas === 'undefined') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }

      const el = wrapper.querySelector('.report-card');
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      document.body.removeChild(wrapper);

      canvas.toBlob(async blob => {
        const shareData = {
          files: [new File([blob], `chalan-${chalan.chalan_number}.png`, { type: 'image/png' })]
        };
        if (navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            GuniUtils.showToast('Report shared!');
          } catch { this.downloadBlob(blob, `chalan-${chalan.chalan_number}.png`); }
        } else {
          this.downloadBlob(blob, `chalan-${chalan.chalan_number}.png`);
          GuniUtils.showToast('Report downloaded!');
        }
        GuniUtils.showLoading(false);
      });
    } catch (e) {
      GuniUtils.showToast('Error generating PNG: ' + e.message, 'error');
      GuniUtils.showLoading(false);
    }
  },

  async generatePDF(chalanId) {
    GuniUtils.showLoading(true);
    try {
      const chalan = await GuniDB.getChalanDetail(chalanId);
      if (!chalan) throw new Error('Chalan not found');

      if (typeof jspdf === 'undefined') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      if (typeof html2canvas === 'undefined') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }

      const reportHtml = this.buildReportHTML(chalan);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:400px;background:white;padding:20px;font-family:sans-serif;z-index:-1;';
      wrapper.innerHTML = reportHtml;
      document.body.appendChild(wrapper);

      const el = wrapper.querySelector('.report-card');
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      const file = new File([pdfBlob], `chalan-${chalan.chalan_number}.pdf`, { type: 'application/pdf' });
      const shareData = { files: [file] };
      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          GuniUtils.showToast('PDF shared!');
        } catch { this.downloadBlob(pdfBlob, `chalan-${chalan.chalan_number}.pdf`); }
      } else {
        this.downloadBlob(pdfBlob, `chalan-${chalan.chalan_number}.pdf`);
        GuniUtils.showToast('PDF downloaded!');
      }
    } catch (e) {
      GuniUtils.showToast('Error generating PDF: ' + e.message, 'error');
    }
    GuniUtils.showLoading(false);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
};
