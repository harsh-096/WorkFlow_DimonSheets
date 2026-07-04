const GuniDB = {
  db: null,
  DB_NAME: 'guni_app',
  DB_VERSION: 2,

  STORES: {
    persons: null,
    designs: null,
    design_images: null,
    chalans: null,
    chalan_items: null,
    chalan_lots: null,
    dispatches: null,
    dispatch_items: null
  },

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        const old = e.oldVersion;
        if (old < 1) {
          db.createObjectStore('persons', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('designs', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('design_images', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('chalans', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('chalan_items', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('dispatches', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('dispatch_items', { keyPath: 'id', autoIncrement: true });
        }
        if (old < 2) {
          if (!db.objectStoreNames.contains('chalan_lots')) {
            db.createObjectStore('chalan_lots', { keyPath: 'id', autoIncrement: true });
          }
          ['pricing', 'production'].forEach(name => {
            if (db.objectStoreNames.contains(name)) {
              db.deleteObjectStore(name);
            }
          });
        }
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

  async getByField(storeName, field, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item[field] == value);
  },

  async getChalansWithItems() {
    const chalans = await this.getAll('chalans');
    const items = await this.getAll('chalan_items');
    const lots = await this.getAll('chalan_lots');
    const designs = await this.getAll('designs');
    const persons = await this.getAll('persons');
    const dispatchItems = await this.getAll('dispatch_items');

    const designMap = {}; designs.forEach(d => designMap[d.id] = d);
    const personMap = {}; persons.forEach(p => personMap[p.id] = p);

    const lotsByItem = {};
    lots.forEach(l => {
      if (!lotsByItem[l.chalan_item_id]) lotsByItem[l.chalan_item_id] = [];
      lotsByItem[l.chalan_item_id].push(l);
    });

    const dispatchedByLot = {};
    dispatchItems.forEach(d => {
      if (!dispatchedByLot[d.chalan_lot_id]) dispatchedByLot[d.chalan_lot_id] = 0;
      dispatchedByLot[d.chalan_lot_id] += Number(d.sheets_dispatched) || 0;
    });

    chalans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return chalans.map(ch => ({
      ...ch,
      person: personMap[ch.delivery_person_id] || null,
      items: items.filter(i => i.chalan_id === ch.id).map(i => ({
        ...i,
        design: designMap[i.design_id] || null,
        lots: (lotsByItem[i.id] || []).map(l => ({
          ...l,
          dispatched_qty: dispatchedByLot[l.id] || 0
        })),
        total_sheets: (lotsByItem[i.id] || []).reduce((s, l) => s + Number(l.sheets_count), 0),
        total_completed: (lotsByItem[i.id] || []).reduce((s, l) => s + Number(l.sheets_completed), 0),
        total_dispatched: (lotsByItem[i.id] || []).reduce((s, l) => s + (dispatchedByLot[l.id] || 0), 0),
        total_pricing: (lotsByItem[i.id] || []).reduce((s, l) =>
          s + (Number(l.price_per_sheet) ? Number(l.sheets_count) * Number(l.price_per_sheet) : 0), 0)
      }))
    }));
  },

  async getChalanDetail(chalanId) {
    const chalan = await this.get('chalans', chalanId);
    if (!chalan) return null;
    const allItems = await this.getByField('chalan_items', 'chalan_id', chalanId);
    const allLots = await this.getAll('chalan_lots');
    const designs = await this.getAll('designs');
    const persons = await this.getAll('persons');
    const designImages = await this.getAll('design_images');
    const dispatchItems = await this.getAll('dispatch_items');

    const designMap = {}; designs.forEach(d => designMap[d.id] = d);
    const personMap = {}; persons.forEach(p => personMap[p.id] = p);
    const imagesByDesign = {};
    designImages.forEach(img => {
      if (!imagesByDesign[img.design_id]) imagesByDesign[img.design_id] = [];
      imagesByDesign[img.design_id].push(img);
    });

    const lotsByItem = {};
    allLots.forEach(l => {
      if (!lotsByItem[l.chalan_item_id]) lotsByItem[l.chalan_item_id] = [];
      lotsByItem[l.chalan_item_id].push(l);
    });

    const dispatchedByLot = {};
    dispatchItems.forEach(d => {
      if (!dispatchedByLot[d.chalan_lot_id]) dispatchedByLot[d.chalan_lot_id] = 0;
      dispatchedByLot[d.chalan_lot_id] += Number(d.sheets_dispatched) || 0;
    });

    return {
      ...chalan,
      person: personMap[chalan.delivery_person_id] || null,
      items: allItems.map(i => ({
        ...i,
        design: designMap[i.design_id] || null,
        images: imagesByDesign[i.design_id] || [],
        lots: (lotsByItem[i.id] || []).map(l => ({
          ...l,
          dispatched_qty: dispatchedByLot[l.id] || 0
        })),
        total_sheets: (lotsByItem[i.id] || []).reduce((s, l) => s + Number(l.sheets_count), 0),
        total_completed: (lotsByItem[i.id] || []).reduce((s, l) => s + Number(l.sheets_completed), 0),
        total_dispatched: (lotsByItem[i.id] || []).reduce((s, l) => s + (dispatchedByLot[l.id] || 0), 0),
        total_pricing: (lotsByItem[i.id] || []).reduce((s, l) =>
          s + (Number(l.price_per_sheet) ? Number(l.sheets_count) * Number(l.price_per_sheet) : 0), 0)
      }))
    };
  },

  async deleteChalan(id) {
    const items = await this.getByField('chalan_items', 'chalan_id', id);
    for (const item of items) {
      const lots = await this.getByField('chalan_lots', 'chalan_item_id', item.id);
      for (const l of lots) await this.delete('chalan_lots', l.id);
      await this.delete('chalan_items', item.id);
    }
    const disps = await this.getByField('dispatches', 'chalan_id', id);
    for (const d of disps) {
      const ditem = await this.getByField('dispatch_items', 'dispatch_id', d.id);
      for (const di of ditem) await this.delete('dispatch_items', di.id);
      await this.delete('dispatches', d.id);
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
    const lots = await this.getAll('chalan_lots');
    const dispatchItems = await this.getAll('dispatch_items');
    const persons = await this.getAll('persons');

    const totalSheetsReceived = lots.reduce((s, l) => s + Number(l.sheets_count || 0), 0);
    const totalSheetsCompleted = lots.reduce((s, l) => s + Number(l.sheets_completed || 0), 0);
    const totalSheetsDispatched = dispatchItems.reduce((s, d) => s + Number(d.sheets_dispatched || 0), 0);
    const openChalans = chalans.filter(c => c.status !== 'closed').length;

    return {
      totalChalans: chalans.length,
      openChalans,
      totalSheetsReceived,
      totalSheetsCompleted,
      totalSheetsDispatched,
      totalPersons: persons.length
    };
  },

  async getDispatchesWithDetails() {
    const dispatches = await this.getAll('dispatches');
    const chalans = await this.getAll('chalans');
    const persons = await this.getAll('persons');
    const dispatchItems = await this.getAll('dispatch_items');
    const lots = await this.getAll('chalan_lots');
    const items = await this.getAll('chalan_items');
    const designs = await this.getAll('designs');

    const chalanMap = {}; chalans.forEach(ch => chalanMap[ch.id] = ch);
    const personMap = {}; persons.forEach(p => personMap[p.id] = p);
    const designMap = {}; designs.forEach(d => designMap[d.id] = d);
    const lotMap = {}; lots.forEach(l => lotMap[l.id] = l);
    const itemMap = {}; items.forEach(i => itemMap[i.id] = i);

    dispatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return dispatches.map(d => ({
      ...d,
      chalan: chalanMap[d.chalan_id] || null,
      person: personMap[d.delivery_person_id] || null,
      items: dispatchItems.filter(di => di.dispatch_id === d.id).map(di => {
        const lot = lotMap[di.chalan_lot_id];
        const item = lot ? itemMap[lot.chalan_item_id] : null;
        return {
          ...di,
          lot,
          design: item ? designMap[item.design_id] : null
        };
      }),
      totalSheets: dispatchItems.filter(di => di.dispatch_id === d.id)
        .reduce((s, di) => s + Number(di.sheets_dispatched), 0),
      totalAmount: dispatchItems.filter(di => di.dispatch_id === d.id)
        .reduce((s, di) => s + Number(di.total_amount || 0), 0)
    }));
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
