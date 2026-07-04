const GuniUtils = {
  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  nowISO() {
    return new Date().toISOString();
  },

  nowInput() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  todayInput() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = msg;
    container.appendChild(t);
    setTimeout(() => { t.classList.add('show'); }, 10);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  },

  confirmDialog(msg) {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-overlay');
      const title = document.getElementById('confirm-title');
      const body = document.getElementById('confirm-body');
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      if (!overlay) { resolve(false); return; }
      title.textContent = 'Confirm';
      body.textContent = msg;
      overlay.classList.add('show');
      yes.onclick = () => { overlay.classList.remove('show'); resolve(true); };
      no.onclick = () => { overlay.classList.remove('show'); resolve(false); };
    });
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e.target.error);
      reader.readAsDataURL(file);
    });
  },

  dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  },

  blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e.target.error);
      reader.readAsDataURL(blob);
    });
  },

  openCamera() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) resolve(file); else reject('No file');
      };
      input.click();
    });
  },

  openGallery() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) resolve(file); else reject('No file');
      };
      input.click();
    });
  },

  async storeImage(designId, file) {
    const dataUrl = await this.readFileAsDataURL(file);
    const blob = this.dataURLToBlob(dataUrl);
    await GuniDB.add('design_images', {
      design_id: designId,
      image_blob: dataUrl,
      created_at: this.nowISO()
    });
    return dataUrl;
  },

  async getDesignImage(designId) {
    const images = await GuniDB.getByField('design_images', 'design_id', designId);
    if (images.length > 0) return images[images.length - 1].image_blob;
    return null;
  },

  showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    if (show) {
      if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
      }
      loader.style.display = 'flex';
    } else {
      if (loader) loader.style.display = 'none';
    }
  },

  formatImageCard(imgSrc) {
    if (!imgSrc) return '<div class="no-image">No Photo</div>';
    return `<img src="${imgSrc}" alt="Design" class="design-thumb" onclick="GuniUtils.previewImage('${imgSrc}')">`;
  },

  previewImage(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-preview-overlay';
    overlay.innerHTML = `<div class="image-preview-container"><img src="${src}" class="image-preview-full"><button class="btn btn-sm" onclick="this.parentElement.parentElement.remove()">Close</button></div>`;
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }
};
