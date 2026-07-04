const GuniDesigns = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'Designs';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const designs = await GuniDB.getAll('designs');
    const images = await GuniDB.getAll('design_images');
    const imgByDesign = {};
    images.forEach(img => { imgByDesign[img.design_id] = img.image_blob; });

    designs.sort((a, b) => a.name?.localeCompare(b.name));

    c.innerHTML = `
      <div class="page-header">
        <h2>All Designs</h2>
        <button class="btn btn-sm btn-primary" onclick="GuniDesigns.showForm()">+ Add</button>
      </div>
      <div class="card">
        ${designs.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎨</div><h3>No Designs Added</h3><p>Add designs with photos</p></div>' :
        designs.map(d => `
          <div class="list-item">
            ${imgByDesign[d.id] ? `<img src="${imgByDesign[d.id]}" class="thumb" onclick="GuniUtils.previewImage('${imgByDesign[d.id]}')">` : '<div class="thumb no-image" style="width:48px;height:48px;">No Pic</div>'}
            <div class="info">
              <div class="title">${GuniUtils.escapeHtml(d.name) || 'Unnamed Design'}</div>
              <div class="desc">Added ${GuniUtils.formatDate(d.created_at)}</div>
            </div>
            <div class="actions">
              <button class="btn btn-sm btn-secondary" onclick="GuniDesigns.showForm(${d.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="GuniDesigns.deleteDesign(${d.id})">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  async showForm(id = null) {
    let design = { name: '' };
    if (id) design = await GuniDB.get('designs', id) || design;
    const existingImg = id ? await GuniUtils.getDesignImage(id) : null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'design-modal';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>${id ? 'Edit Design' : 'Add Design'}</h3>
        <div class="form-group">
          <label>Design Name *</label>
          <input class="form-input" id="design-name" value="${GuniUtils.escapeHtml(design.name)}" placeholder="e.g. Floral A, Diamond B">
        </div>
        <div class="form-group">
          <label>Photo</label>
          <div id="design-photo-preview" style="margin-bottom:8px;">
            ${existingImg ? `<img src="${existingImg}" style="max-width:100%;max-height:150px;border-radius:8px;">` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm btn-secondary" onclick="GuniDesigns.takePhoto()">📷 Camera</button>
            <button class="btn btn-sm btn-secondary" onclick="GuniDesigns.choosePhoto()">🖼️ Gallery</button>
            ${existingImg ? `<button class="btn btn-sm btn-danger" onclick="GuniDesigns.removePhoto()">Remove</button>` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="GuniDesigns.save(${id || ''})" style="margin-top:8px;">${id ? 'Update' : 'Add'} Design</button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('design-name')?.focus(), 200);
  },

  _pendingPhoto: null,

  async takePhoto() {
    try {
      const file = await GuniUtils.openCamera();
      this._pendingPhoto = file;
      const url = URL.createObjectURL(file);
      const preview = document.getElementById('design-photo-preview');
      if (preview) preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:150px;border-radius:8px;">`;
    } catch (e) { /* user cancelled */ }
  },

  async choosePhoto() {
    try {
      const file = await GuniUtils.openGallery();
      this._pendingPhoto = file;
      const url = URL.createObjectURL(file);
      const preview = document.getElementById('design-photo-preview');
      if (preview) preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:150px;border-radius:8px;">`;
    } catch (e) { /* user cancelled */ }
  },

  removePhoto() {
    this._pendingPhoto = null;
    const preview = document.getElementById('design-photo-preview');
    if (preview) preview.innerHTML = '';
  },

  async save(id) {
    const name = document.getElementById('design-name')?.value.trim();
    if (!name) { GuniUtils.showToast('Design name is required', 'error'); return; }

    if (id) {
      await GuniDB.put('designs', { id, name });
      if (this._pendingPhoto) {
        const existing = await GuniDB.getByField('design_images', 'design_id', id);
        for (const img of existing) await GuniDB.delete('design_images', img.id);
        await GuniUtils.storeImage(id, this._pendingPhoto);
      }
      GuniUtils.showToast('Design updated');
    } else {
      const designId = await GuniDB.add('designs', { name });
      if (this._pendingPhoto) {
        await GuniUtils.storeImage(designId, this._pendingPhoto);
      }
      GuniUtils.showToast('Design added');
    }
    this._pendingPhoto = null;
    document.getElementById('design-modal')?.remove();
    this.render();
  },

  async deleteDesign(id) {
    const confirmed = await GuniUtils.confirmDialog('Delete this design and its photos?');
    if (!confirmed) return;
    await GuniDB.deleteDesign(id);
    GuniUtils.showToast('Design deleted');
    this.render();
  }
};
