/* ═══════════════════════════════════════════
   F-CHICKEN — Cart State
   Guest: localStorage | User: server-synced
   ═══════════════════════════════════════════ */
const CartState = {
  _items: [],

  async init() {
    if (Auth.isLoggedIn()) {
      await this.fetchFromServer();
    } else {
      const saved = localStorage.getItem('fc_cart');
      this._items = saved ? JSON.parse(saved) : [];
    }
    this._updateBadge();
  },

  async fetchFromServer() {
    if (!Auth.isLoggedIn()) return;
    const res = await CartAPI.getCart();
    if (res?.Success) {
      this._items = res.Data.Items || [];
      this._updateBadge();
    }
  },

  async addItem(productId, productData, qty = 1) {
    if (Auth.isLoggedIn()) {
      const res = await CartAPI.addItem(productId, qty);
      if (res?.Success) {
        await this.fetchFromServer();
        toast(`Da them "${productData.Name}" vao gio hang`, 'success');
      }
    } else {
      // Guest: localStorage
      const ex = this._items.find(i => i.ProductId === productId);
      if (ex) { ex.Qty += qty; }
      else {
        this._items.push({
          ProductId: productId, ProductName: productData.Name,
          ImageUrl: productData.ImageUrl, Price: productData.Price, Qty: qty
        });
      }
      this._save();
      toast(`Da them "${productData.Name}" vao gio hang`, 'success');
    }
    this._updateBadge();
    renderCartDrawer();
  },

  async changeQty(productId, delta) {
    const item = this._items.find(i => i.ProductId === productId);
    if (!item) return;
    const newQty = item.Qty + delta;

    if (Auth.isLoggedIn()) {
      if (newQty <= 0) await CartAPI.removeItem(productId);
      else             await CartAPI.updateItem(productId, newQty);
      await this.fetchFromServer();
    } else {
      if (newQty <= 0) this._items = this._items.filter(i => i.ProductId !== productId);
      else             item.Qty = newQty;
      this._save();
    }
    this._updateBadge();
    renderCartDrawer();
  },

  async removeItem(productId) {
    if (Auth.isLoggedIn()) {
      await CartAPI.removeItem(productId);
      await this.fetchFromServer();
    } else {
      this._items = this._items.filter(i => i.ProductId !== productId);
      this._save();
    }
    this._updateBadge();
    renderCartDrawer();
  },

  async clearAll() {
    if (Auth.isLoggedIn()) await CartAPI.clearCart();
    this._items = [];
    this._save();
    this._updateBadge();
  },

  clear() {
    this._items = [];
    this._save();
    this._updateBadge();
  },

  getItems()    { return this._items; },
  getCount()    { return this._items.reduce((s, i) => s + i.Qty, 0); },
  getSubtotal() { return this._items.reduce((s, i) => s + i.Price * i.Qty, 0); },

  _save() { localStorage.setItem('fc_cart', JSON.stringify(this._items)); },
  _updateBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = this.getCount();
  }
};
