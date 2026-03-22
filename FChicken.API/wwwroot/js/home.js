/* ═══════════════════════════════════════════
   F-CHICKEN — Home, Menu, Favorites Pages
   ═══════════════════════════════════════════ */

let _categories  = [];
let _favoriteIds = new Set();

// ── Shared: load categories ────────────────────────────────────────────
async function loadCategories() {
  const res = await CategoriesAPI.getAll();
  if (res?.Success) _categories = res.Data;
  return _categories;
}

// ── Shared: load favorite IDs ──────────────────────────────────────────
async function loadFavoriteIds() {
  if (!Auth.isLoggedIn()) { _favoriteIds = new Set(); return; }
  const res = await FavoritesAPI.getIds();
  if (res?.Success) _favoriteIds = new Set(res.Data);
}

// ── Product Card HTML ──────────────────────────────────────────────────
function productCardHTML(p) {
  const isFav = _favoriteIds.has(p.Id);
  return `
  <div class="product-card" onclick="openProductModal(${p.Id})">
    <div class="product-img">
      <img src="${p.ImageUrl}" alt="${p.Name}" loading="lazy">
      ${p.IsHot ? '<span class="product-label">Ban chay</span>' : ''}
      <button class="fav-btn ${isFav ? 'active' : ''}"
        onclick="event.stopPropagation(); toggleFavorite(${p.Id}, this)"
        title="${isFav ? 'Bo yeu thich' : 'Yeu thich'}">
        <i data-lucide="heart" width="14" height="14"></i>
      </button>
    </div>
    <div class="product-body">
      <div class="product-cat-tag">${p.CategoryName}</div>
      <div class="product-name">${p.Name}</div>
      <div class="product-desc">${p.Description}</div>
      <div class="product-footer">
        <div>
          <div class="product-price">${fmtPrice(p.Price)}</div>
          ${p.OriginalPrice ? `<div class="product-old-price">${fmtPrice(p.OriginalPrice)}</div>` : ''}
        </div>
        <button class="add-btn" onclick="event.stopPropagation(); quickAddToCart(${p.Id}, '${p.Name}')">
          <i data-lucide="plus" width="14" height="14"></i>
        </button>
      </div>
    </div>
  </div>`;
}

async function quickAddToCart(productId, name) {
  // Get product data from cache or API
  let p = _productCache.find(x => x.Id === productId);
  if (!p) {
    const res = await ProductsAPI.getById(productId);
    if (res?.Success) p = res.Data;
  }
  if (p) await CartState.addItem(productId, p, 1);
}

const _productCache = [];

// ── HOME ───────────────────────────────────────────────────────────────
async function initHome() {
  await Promise.all([loadCategories(), loadFavoriteIds()]);
  await renderHomeProducts('all');
  renderHomeTabs();
  safeIcons();
}

function renderHomeTabs() {
  const container = document.getElementById('homeTabs');
  if (!container) return;
  const tabs = [{ Name: 'Tat ca', Id: 'all' }, ..._categories];
  container.innerHTML = tabs.map(c => `
    <button class="tab-btn ${c.Id === 'all' ? 'active' : ''}"
      onclick="selectHomeTab(this, '${c.Id}')">
      ${c.Name}
    </button>`).join('');
}

async function selectHomeTab(el, catId) {
  document.querySelectorAll('#homeTabs .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  await renderHomeProducts(catId);
}

async function renderHomeProducts(catId) {
  const grid = document.getElementById('homeGrid');
  if (!grid) return;
  showLoading('homeGrid');

  const params = { pageSize: 8 };
  if (catId !== 'all') params.categoryId = catId;

  const res = await ProductsAPI.getAll(params);
  if (!res?.Success) { showEmpty('homeGrid', 'Khong tai duoc san pham'); return; }

  const items = res.Data.Items;
  items.forEach(p => { if (!_productCache.find(x => x.Id === p.Id)) _productCache.push(p); });

  grid.innerHTML = items.length
    ? items.map(productCardHTML).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--color-text-muted);">Chua co san pham trong danh muc nay</div>';
  safeIcons();
}

// ── MENU ───────────────────────────────────────────────────────────────
let _menuActiveCat = 'all';
let _menuSearch    = '';

async function initMenu() {
  await Promise.all([loadCategories(), loadFavoriteIds()]);
  renderMenuTabs();
  await renderMenuProducts();
}

function renderMenuTabs() {
  const container = document.getElementById('menuTabs');
  if (!container) return;
  const tabs = [{ Name: 'Tat ca', Id: 'all' }, ..._categories];
  container.innerHTML = tabs.map(c => `
    <button class="tab-btn ${c.Id === _menuActiveCat ? 'active' : ''}"
      onclick="selectMenuTab(this, '${c.Id}')">
      ${c.Name}
    </button>`).join('');
}

async function selectMenuTab(el, catId) {
  _menuActiveCat = catId;
  document.querySelectorAll('#menuTabs .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  await renderMenuProducts();
}

async function renderMenuProducts() {
  showLoading('menuGrid');
  const params = { pageSize: 50 };
  if (_menuActiveCat !== 'all') params.categoryId = _menuActiveCat;
  if (_menuSearch) params.search = _menuSearch;

  const res = await ProductsAPI.getAll(params);
  if (!res?.Success) { showEmpty('menuGrid', 'Khong tai duoc san pham'); return; }

  const items = res.Data.Items;
  items.forEach(p => { if (!_productCache.find(x => x.Id === p.Id)) _productCache.push(p); });

  const grid = document.getElementById('menuGrid');
  grid.innerHTML = items.length ? items.map(productCardHTML).join('') : '';
  if (!items.length) showEmpty('menuGrid', 'Khong co san pham phu hop', 'search');
  safeIcons();
}

function searchMenu() {
  _menuSearch = document.getElementById('menuSearchInput')?.value || '';
  renderMenuProducts();
}

// ── FAVORITES ──────────────────────────────────────────────────────────
async function initFavorites() {
  if (!Auth.isLoggedIn()) {
    showEmpty('favGrid', 'Vui long dang nhap de xem mon yeu thich', 'heart');
    document.getElementById('favLoginPrompt')?.style.removeProperty('display');
    return;
  }
  document.getElementById('favLoginPrompt')?.style.setProperty('display', 'none');
  showLoading('favGrid');
  await loadFavoriteIds();
  const res = await FavoritesAPI.getAll();
  if (!res?.Success) { showEmpty('favGrid', 'Khong tai duoc'); return; }

  const grid = document.getElementById('favGrid');
  grid.innerHTML = res.Data.length
    ? res.Data.map(p => productCardHTML({ ...p, CategoryName: p.CategoryName || '' })).join('')
    : '';
  if (!res.Data.length) showEmpty('favGrid', 'Ban chua them mon nao vao yeu thich', 'heart');
  safeIcons();
}

// ── Toggle Favorite ────────────────────────────────────────────────────
async function toggleFavorite(productId, btn) {
  if (!Auth.isLoggedIn()) { toast('Vui long dang nhap de luu yeu thich', 'info'); goto('login'); return; }
  const res = await FavoritesAPI.toggle(productId);
  if (!res?.Success) return;
  if (res.Data.IsFavorite) {
    _favoriteIds.add(productId);
    btn.classList.add('active');
    toast('Da them vao yeu thich', 'success');
  } else {
    _favoriteIds.delete(productId);
    btn.classList.remove('active');
    toast('Da bo khoi yeu thich', 'info');
  }
}

// ── Product Detail Modal ───────────────────────────────────────────────
async function openProductModal(productId) {
  let p = _productCache.find(x => x.Id === productId);
  if (!p) {
    const res = await ProductsAPI.getById(productId);
    if (!res?.Success) return;
    p = res.Data;
    _productCache.push(p);
  }

  const isFav = _favoriteIds.has(p.Id);
  document.getElementById('modalContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;">
      <div>
        <img src="${p.ImageUrl}" alt="${p.Name}"
          style="width:100%;height:280px;object-fit:cover;border-radius:var(--radius-lg);">
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="font-size:0.72rem;font-weight:700;color:var(--color-primary);text-transform:uppercase;letter-spacing:.08em;">${p.CategoryName}</div>
        <h2 style="font-size:1.3rem;font-weight:900;color:var(--color-text);">${p.Name}</h2>
        <p style="font-size:0.88rem;color:var(--color-text-secondary);line-height:1.7;">${p.Description}</p>
        <div style="display:flex;align-items:center;gap:6px;">
          <i data-lucide="star" width="14" height="14" style="color:var(--color-accent);"></i>
          <span style="font-size:0.82rem;font-weight:700;">${p.Rating}</span>
          <span style="font-size:0.78rem;color:var(--color-text-muted);">· ${p.SoldCount.toLocaleString('vi-VN')} da ban</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:10px;">
          <span style="font-size:1.5rem;font-weight:900;color:var(--color-primary);">${fmtPrice(p.Price)}</span>
          ${p.OriginalPrice ? `<span style="font-size:0.9rem;color:var(--color-text-muted);text-decoration:line-through;">${fmtPrice(p.OriginalPrice)}</span>` : ''}
        </div>
        <div style="display:flex;gap:10px;margin-top:auto;">
          <button class="btn-primary" style="flex:1;justify-content:center;"
            onclick="quickAddToCart(${p.Id}, '${p.Name}'); closeModal()">
            <i data-lucide="shopping-bag" width="15" height="15"></i>
            Them vao gio
          </button>
          <button class="icon-btn fav-btn ${isFav ? 'active' : ''}"
            onclick="toggleFavorite(${p.Id}, this)">
            <i data-lucide="heart" width="18" height="18"></i>
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
  safeIcons();
}
function closeModal() {
  document.getElementById('productModal')?.classList.remove('open');
  document.getElementById('modalOverlay')?.classList.remove('open');
}
