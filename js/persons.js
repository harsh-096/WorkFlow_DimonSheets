const GuniPersons = {
  async render() {
    const c = document.getElementById('page-content');
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) headerTitle.textContent = 'People';
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    c.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    const persons = await GuniDB.getAll('persons');
    persons.sort((a, b) => a.name?.localeCompare(b.name));

    c.innerHTML = `
      <div class="page-header">
        <h2>All People</h2>
        <button class="btn btn-sm btn-primary" onclick="GuniPersons.showForm()">+ Add</button>
      </div>
      <div class="card">
        ${persons.length === 0 ? '<div class="empty-state"><div class="empty-icon">👤</div><h3>No People Added</h3><p>Add delivery persons & workers</p></div>' :
        persons.map(p => `
          <div class="list-item">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">👤</div>
            <div class="info">
              <div class="title">${GuniUtils.escapeHtml(p.name)}</div>
              <div class="desc">${p.phone ? GuniUtils.escapeHtml(p.phone) : ''}${p.phone && p.type ? ' · ' : ''}${p.type ? '<span class="chip">' + GuniUtils.escapeHtml(p.type) + '</span>' : ''}</div>
            </div>
            <div class="actions">
              <button class="btn btn-sm btn-secondary" onclick="GuniPersons.showForm(${p.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="GuniPersons.deletePerson(${p.id})">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    GuniUtils.showLoading(false);
  },

  _onSaveCallback: null,

  async showForm(id = null, callback = null) {
    this._onSaveCallback = callback;
    let person = { name: '', phone: '', address: '', type: 'delivery' };
    if (id) person = await GuniDB.get('persons', id) || person;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'person-modal';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove();GuniPersons._onSaveCallback=null;">×</button>
        <h3>${id ? 'Edit Person' : 'Add Person'}</h3>
        <div class="form-group">
          <label>Name *</label>
          <input class="form-input" id="person-name" value="${GuniUtils.escapeHtml(person.name)}" placeholder="Full name">
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input class="form-input" id="person-phone" value="${GuniUtils.escapeHtml(person.phone || '')}" placeholder="Phone number" type="tel">
        </div>
        <div class="form-group">
          <label>Address</label>
          <textarea class="form-textarea" id="person-address" placeholder="Address">${GuniUtils.escapeHtml(person.address || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select class="form-select" id="person-type">
            <option value="delivery" ${person.type === 'delivery' ? 'selected' : ''}>Delivery Person</option>
            <option value="worker" ${person.type === 'worker' ? 'selected' : ''}>Worker</option>
            <option value="retailer" ${person.type === 'retailer' ? 'selected' : ''}>Retailer</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="GuniPersons.save(${id || ''})">${id ? 'Update' : 'Add'} Person</button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('person-name')?.focus(), 200);
  },

  async save(id) {
    const name = document.getElementById('person-name')?.value.trim();
    if (!name) { GuniUtils.showToast('Name is required', 'error'); return; }
    const data = {
      name,
      phone: document.getElementById('person-phone')?.value.trim() || '',
      address: document.getElementById('person-address')?.value.trim() || '',
      type: document.getElementById('person-type')?.value || 'delivery'
    };
    if (id) { data.id = id; await GuniDB.put('persons', data); }
    else { await GuniDB.add('persons', data); }
    document.getElementById('person-modal')?.remove();
    GuniUtils.showToast(id ? 'Person updated' : 'Person added');
    if (this._onSaveCallback) { const cb = this._onSaveCallback; this._onSaveCallback = null; cb(); }
    else { this.render(); }
  },

  async deletePerson(id) {
    const confirmed = await GuniUtils.confirmDialog('Delete this person?');
    if (!confirmed) return;
    await GuniDB.delete('persons', id);
    GuniUtils.showToast('Person deleted');
    this.render();
  }
};
