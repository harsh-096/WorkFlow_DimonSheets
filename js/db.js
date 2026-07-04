const GuniDB = {
  db: null,
  DB_NAME: 'guni_app',
  DB_VERSION: 1,

  STORES: {
    persons: null,
    designs: null,
    design_images: null,
    chalans: null,
    chalan_items: null,
    production: null,
    pricing: null,
    dispatches: null,
    dispatch_items: null
  },

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        ['persons', 'designs', 'design_images', 'chalans', 'chalan_items',
         'production', 'pricing', 'dispatches', 'dispatch_items'].forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
      req.onsuccess = e => { this.db = e.target.result; resolve(this.db); };
      req.onerror = e => reject(e.target.error);
    });
  },

  _store(name) {
    const tx = this.db.transaction(name, 'readwrite');
    return { tx, store: tx.objectStore(name) };
  },

  _storeRO(name) {
    const tx = this.db.transaction(name, 'readonly');
    return { tx, store: tx.objectStore(name) };
  },

  async add(storeName, data) {
    data.created_at = data.created_at || new Date().toISOString();
    const { tx, store } = this._store(storeName);
    return new Promise((resolve, reject) => {
      const req = store.add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, data) {
    data.updated_at = new Date().toISOString();
    const { tx, store } = this._store(storeName);
    return new Promise((resolve, reject) => {
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, id) {
    const { tx, store } = this._storeRO(storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName) {
    const { tx, store } = this._storeRO(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, id) {
    const { tx, store } = this._store(storeName);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(storeName, indexName, value) {
    const { tx, store } = this._storeRO(storeName);
    if (!store.indexNames.contains(indexName)) {
      const all = await this.getAll(storeName);
      return all.filter(item => item[indexName] === value);
    }
    return new Promise((resolve, reject) => {
      const req = store.index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getByField(storeName, field, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item[field] == value);
  },

  async getChalansWithItems() {
    const chalans = await this.getAll('chalans');
    const items = await this.getAll('chalan_items');
    const designs = await this.getAll('designs');
    const persons = await this.getAll('persons');
    const prod = await this.getAll('production');
    const prices = await this.getAll('pricing');
    const dispatchItems = await this.getAll('dispatch_items');

    const designMap = {};
    designs.forEach(d => designMap[d.id] = d);
    const personMap = {};
    persons.forEach(p => personMap[p.id] = p);

    const prodByItem = {};
    prod.forEach(p => {
      if (!prodByItem[p.chalan_item_id]) prodByItem[p.chalan_item_id] = [];
      prodByItem[p.chalan_item_id].push(p);
    });

    const pricingByItem = {};
    prices.forEach(p => pricingByItem[p.chalan_item_id] = p);

    const dispatchedQtyByItem = {};
    dispatchItems.forEach(d => {
      if (!dispatchedQtyByItem[d.chalan_item_id]) dispatchedQtyByItem[d.chalan_item_id] = 0;
      dispatchedQtyByItem[d.chalan_item_id] += Number(d.sheets_dispatched) || 0;
    });

    chalans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return chalans.map(ch => ({
      ...ch,
      person: personMap[ch.delivery_person_id] || null,
      items: items
        .filter(i => i.chalan_id === ch.id)
        .map(i => ({
          ...i,
          design: designMap[i.design_id] || null,
          production: prodByItem[i.id] || [],
          total_produced: (prodByItem[i.id] || []).reduce((s, p) => s + Number(p.sheets_completed), 0),
          pricing: pricingByItem[i.id] || null,
          dispatched_qty: dispatchedQtyByItem[i.id] || 0
        }))
    }));
  },

  async getChalanDetail(chalanId) {
    const chalan = await this.get('chalans', chalanId);
    if (!chalan) return null;
    const allItems = await this.getByField('chalan_items', 'chalan_id', chalanId);
    const designs = await this.getAll('designs');
    const persons = await this.getAll('persons');
    const prod = await this.getAll('production');
    const prices = await this.getAll('pricing');
    const dispatchItems = await this.getAll('dispatch_items');
    const designImages = await this.getAll('design_images');

    const designMap = {};
    designs.forEach(d => designMap[d.id] = d);
    const personMap = {};
    persons.forEach(p => personMap[p.id] = p);
    const imagesByDesign = {};
    designImages.forEach(img => {
      if (!imagesByDesign[img.design_id]) imagesByDesign[img.design_id] = [];
      imagesByDesign[img.design_id].push(img);
    });

    const prodByItem = {};
    prod.forEach(p => {
      if (!prodByItem[p.chalan_item_id]) prodByItem[p.chalan_item_id] = [];
      prodByItem[p.chalan_item_id].push(p);
    });

    const pricingByItem = {};
    prices.forEach(p => pricingByItem[p.chalan_item_id] = p);

    const dispatchedQtyByItem = {};
    dispatchItems.forEach(d => {
      if (!dispatchedQtyByItem[d.chalan_item_id]) dispatchedQtyByItem[d.chalan_item_id] = 0;
      dispatchedQtyByItem[d.chalan_item_id] += Number(d.sheets_dispatched) || 0;
    });

    return {
      ...chalan,
      person: personMap[chalan.delivery_person_id] || null,
      items: allItems.map(i => ({
        ...i,
        design: designMap[i.design_id] || null,
        images: imagesByDesign[i.design_id] || [],
        production: prodByItem[i.id] || [],
        total_produced: (prodByItem[i.id] || []).reduce((s, p) => s + Number(p.sheets_completed), 0),
        pricing: pricingByItem[i.id] || null,
        total_pricing: pricingByItem[i.id]
          ? (Number(i.lots) || 0) * (Number(i.quantity_received) / Math.max(Number(i.lots), 1)) * Number(pricingByItem[i.id].price_per_sheet)
          : 0,
        dispatched_qty: dispatchedQtyByItem[i.id] || 0
      }))
    };
  },

  async deleteChalan(id) {
    const items = await this.getByField('chalan_items', 'chalan_id', id);
    for (const item of items) {
      const prods = await this.getByField('production', 'chalan_item_id', item.id);
      for (const p of prods) await this.delete('production', p.id);
      const prices = await this.getByField('pricing', 'chalan_item_id', item.id);
      for (const p of prices) await this.delete('pricing', p.id);
      await this.delete('chalan_items', item.id);
    }
    await this.delete('chalans', id);
  },

  async deleteDesign(id) {
    const images = await this.getByField('design_images', 'design_id', id);
    for (const img of images) await this.delete('design_images', img.id);
    await this.delete('designs', id);
  },

  async getDashboardStats() {
    const chalans = await this.getAll('chalans');
    const items = await this.getAll('chalan_items');
    const prod = await this.getAll('production');
    const dispatchItems = await this.getAll('dispatch_items');
    const persons = await this.getAll('persons');

    const totalSheetsReceived = items.reduce((s, i) => s + Number(i.quantity_received || 0), 0);
    const totalSheetsProduced = prod.reduce((s, p) => s + Number(p.sheets_completed || 0), 0);
    const totalSheetsDispatched = dispatchItems.reduce((s, d) => s + Number(d.sheets_dispatched || 0), 0);
    const openChalans = chalans.filter(c => c.status !== 'closed').length;
    const totalPersons = persons.length;

    return {
      totalChalans: chalans.length,
      openChalans,
      totalSheetsReceived,
      totalSheetsProduced,
      totalSheetsDispatched,
      totalPersons
    };
  },

  async exportAll() {
    const data = {};
    for (const store of Object.keys(this.STORES)) {
      data[store] = await this.getAll(store);
    }
    return data;
  },

  async importAll(data) {
    for (const store of Object.keys(this.STORES)) {
      if (data[store] && Array.isArray(data[store])) {
        for (const item of data[store]) {
          const existing = await this.get(store, item.id);
          if (existing) {
            await this.put(store, item);
          } else {
            const { tx, store: s } = this._store(store);
            await new Promise((resolve, reject) => {
              const req = s.add(item);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          }
        }
      }
    }
  }
};
