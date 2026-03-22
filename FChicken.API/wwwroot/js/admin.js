/* ═══════════════════════════════════════════
   F-CHICKEN — Admin Dashboard
   ═══════════════════════════════════════════ */
let _adminTab = 'dashboard';

async function initAdmin() {
  if (!Auth.isAdmin()) { toast('Khong co quyen', 'error'); goto('home'); return; }
  switchAdmin(document.getElementById('sidebar-dashboard'), 'dashboard');
}

function switchAdmin(el, section) {
  _adminTab = section;
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('[id^="admin-"]').forEach(s => s.style.display = 'none');
  const target = document.getElementById('admin-' + section);
  if (target) target.style.display = 'block';

  const loaders = {
    dashboard:  loadAdminDashboard,
    orders:     loadAdminOrders,
    products:   loadAdminProducts,
    categories: loadAdminCategories,
    vouchers:   loadAdminVouchers,
    users:      loadAdminUsers,
  };
  if (loaders[section]) loaders[section]();
  safeIcons();
}

// ── DASHBOARD ──────────────────────────────────────────────────────────
async function loadAdminDashboard() {
  const [statsRes, ordersRes] = await Promise.all([
    OrdersAPI.getStats(),
    OrdersAPI.getOrders({ pageSize: 6 })
  ]);

  if (statsRes?.Success) {
    const s = statsRes.Data;
    document.getElementById('kpi-revenue').textContent  = fmtPrice(s.TodayRevenue);
    document.getElementById('kpi-orders').textContent   = s.TodayOrders;
    document.getElementById('kpi-delivery').textContent = s.Delivering;
    document.getElementById('kpi-total').textContent    = s.TotalOrders;
  }

  if (ordersRes?.Success) {
    document.getElementById('dashOrdersTable').innerHTML = ordersRes.Data.Items.map(o => `
      <tr>
        <td style="color:var(--color-primary);font-weight:700;">${o.Code}</td>
        <td>${o.ItemCount} mon</td>
        <td style="font-weight:700;">${fmtPrice(o.Total)}</td>
        <td>${statusChip(o.Status)}</td>
        <td><button class="action-btn" onclick="openOrderDetail(${o.Id}); switchAdmin(document.getElementById('sidebar-orders'),'orders')">Chi tiet</button></td>
      </tr>`).join('');
  }
}

// ── ORDERS ─────────────────────────────────────────────────────────────
let _adminOrderFilter = '';

async function loadAdminOrders() {
  showLoading('adminOrdersTable');
  const params = { pageSize: 50 };
  if (_adminOrderFilter) params.status = _adminOrderFilter;

  const res = await OrdersAPI.getOrders(params);
  if (!res?.Success) { document.getElementById('adminOrdersTable').innerHTML = '<tr><td colspan="7">Loi tai du lieu</td></tr>'; return; }

  document.getElementById('adminOrdersTable').innerHTML = res.Data.Items.map(o => `
    <tr>
      <td style="color:var(--color-primary);font-weight:700;">${o.Code}</td>
      <td style="color:var(--color-text-muted);font-size:.78rem;">${fmtDateTime(o.CreatedAt)}</td>
      <td>${o.ItemCount} mon</td>
      <td style="font-weight:700;">${fmtPrice(o.Total)}</td>
      <td>${statusChip(o.Status)}</td>
      <td>
        <select class="form-input" style="padding:4px 8px;font-size:.72rem;width:130px;"
          onchange="updateOrderStatus(${o.Id}, this.value)">
          <option value="">-- Doi trang thai --</option>
          <option value="Confirmed"  ${o.Status==='Confirmed'  ?'selected':''}>Xac nhan</option>
          <option value="Preparing"  ${o.Status==='Preparing'  ?'selected':''}>Dang lam</option>
          <option value="Delivering" ${o.Status==='Delivering' ?'selected':''}>Dang giao</option>
          <option value="Delivered"  ${o.Status==='Delivered'  ?'selected':''}>Da giao</option>
          <option value="Cancelled"  ${o.Status==='Cancelled'  ?'selected':''}>Huy don</option>
        </select>
      </td>
    </tr>`).join('');
  safeIcons();
}

async function updateOrderStatus(orderId, status) {
  if (!status) return;
  const res = await OrdersAPI.updateStatus(orderId, status);
  if (res?.Success) { toast('Cap nhat trang thai thanh cong', 'success'); loadAdminOrders(); loadAdminDashboard(); updatePendingBadge(); }
  else toast(res?.Message || 'Loi cap nhat', 'error');
}

// ── PRODUCTS ───────────────────────────────────────────────────────────
async function loadAdminProducts() {
  showLoading('adminProductsTable');
  const res = await ProductsAPI.getAll({ pageSize: 50 });
  if (!res?.Success) return;

  document.getElementById('adminProductsTable').innerHTML = res.Data.Items.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${p.ImageUrl}" style="width:40px;height:40px;border-radius:var(--radius-md);object-fit:cover;">
          <div>
            <div style="font-weight:700;font-size:.85rem;">${p.Name}</div>
            <div style="font-size:.72rem;color:var(--color-text-muted);">${p.CategoryName}</div>
          </div>
        </div>
      </td>
      <td style="font-weight:700;color:var(--color-primary);">${fmtPrice(p.Price)}</td>
      <td>${p.SoldCount}</td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.78rem;font-weight:600;">
          <input type="checkbox" ${p.IsFeatured ? 'checked' : ''}
            onchange="toggleFeaturedAdmin(${p.Id}, this)"
            style="accent-color:var(--color-primary);">
          Noi bat
        </label>
      </td>
      <td>${p.IsAvailable
        ? '<span class="status-chip s-done">Con hang</span>'
        : '<span class="status-chip s-cancelled">An</span>'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="action-btn" onclick="openProductForm(${p.Id})">Sua</button>
          <button class="action-btn" onclick="deleteProduct(${p.Id})"
            style="color:var(--color-primary);">An</button>
        </div>
      </td>
    </tr>`).join('');
  safeIcons();
}

async function toggleFeaturedAdmin(id, cb) {
  const res = await ProductsAPI.toggleFeatured(id);
  if (!res?.Success) { cb.checked = !cb.checked; toast('Loi cap nhat', 'error'); return; }
  toast(res.Message, 'success');
}

async function deleteProduct(id) {
  confirmAction('An mon an nay khoi menu?', async () => {
    const res = await ProductsAPI.delete(id);
    if (res?.Success) { toast('Da an mon an', 'success'); loadAdminProducts(); }
    else toast(res?.Message || 'Loi', 'error');
  });
}

let _editProductId = null;
async function openProductForm(productId = null) {
  _editProductId = productId;
  const modal = document.getElementById('productFormModal');
  const title = document.getElementById('productFormTitle');

  if (productId) {
    const res = await ProductsAPI.getById(productId);
    if (!res?.Success) return;
    const p = res.Data;
    title.textContent = 'Chinh sua mon an';
    document.getElementById('pf-p-name').value  = p.Name;
    document.getElementById('pf-p-desc').value  = p.Description;
    document.getElementById('pf-p-price').value = p.Price;
    document.getElementById('pf-p-img').value   = p.ImageUrl;
    document.getElementById('pf-p-cat').value   = p.CategoryId;
    document.getElementById('pf-p-hot').checked = p.IsHot;
    document.getElementById('pf-p-feat').checked= p.IsFeatured;
  } else {
    title.textContent = 'Them mon moi';
    document.getElementById('productForm').reset();
  }

  // Populate category select
  const catSel = document.getElementById('pf-p-cat');
  catSel.innerHTML = _categories.map(c =>
    `<option value="${c.Id}">${c.Name}</option>`).join('');

  modal.classList.add('open');
  document.getElementById('formModalOverlay').classList.add('open');
}

async function saveProduct() {
  const data = {
    Name:         document.getElementById('pf-p-name').value.trim(),
    Description:  document.getElementById('pf-p-desc').value.trim(),
    Price:        parseFloat(document.getElementById('pf-p-price').value),
    ImageUrl:     document.getElementById('pf-p-img').value.trim(),
    CategoryId:   parseInt(document.getElementById('pf-p-cat').value),
    IsHot:        document.getElementById('pf-p-hot').checked,
    IsFeatured:   document.getElementById('pf-p-feat').checked,
    IsAvailable:  true,
  };
  if (!data.Name || !data.Price) { toast('Vui long nhap ten va gia', 'info'); return; }

  const res = _editProductId
    ? await ProductsAPI.update(_editProductId, data)
    : await ProductsAPI.create(data);

  if (res?.Success) {
    toast(_editProductId ? 'Cap nhat thanh cong' : 'Them mon thanh cong', 'success');
    closeFormModal();
    loadAdminProducts();
  } else toast(res?.Message || 'Loi luu', 'error');
}

// ── CATEGORIES ─────────────────────────────────────────────────────────
async function loadAdminCategories() {
  showLoading('adminCatTable');
  const res = await CategoriesAPI.getAll();
  if (!res?.Success) return;

  document.getElementById('adminCatTable').innerHTML = res.Data.map(c => `
    <tr>
      <td style="font-weight:600;">${c.Name}</td>
      <td><code style="font-size:.75rem;background:var(--color-surface-soft);padding:2px 8px;border-radius:4px;">${c.Slug || '-'}</code></td>
      <td>${c.ProductCount}</td>
      <td>${c.IsActive ? '<span class="status-chip s-done">Hoat dong</span>' : '<span class="status-chip s-cancelled">An</span>'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="action-btn" onclick="openCatForm(${c.Id},'${c.Name}','${c.Slug||''}')">Sua</button>
          <button class="action-btn" onclick="deleteCat(${c.Id})" style="color:var(--color-primary);">An</button>
        </div>
      </td>
    </tr>`).join('');
}

let _editCatId = null;
function openCatForm(id = null, name = '', slug = '') {
  _editCatId = id;
  document.getElementById('catFormTitle').textContent = id ? 'Sua danh muc' : 'Them danh muc';
  document.getElementById('pf-cat-name').value = name;
  document.getElementById('pf-cat-slug').value = slug;
  document.getElementById('catFormModal').classList.add('open');
  document.getElementById('formModalOverlay').classList.add('open');
}

async function saveCat() {
  const name = document.getElementById('pf-cat-name').value.trim();
  const slug = document.getElementById('pf-cat-slug').value.trim() || name.toLowerCase().replace(/\s+/g,'-');
  if (!name) { toast('Nhap ten danh muc', 'info'); return; }
  const data = { Name: name, Slug: slug, IsActive: true, SortOrder: 99 };
  const res  = _editCatId
    ? await CategoriesAPI.update(_editCatId, data)
    : await CategoriesAPI.create(data);
  if (res?.Success) {
    toast('Luu danh muc thanh cong', 'success');
    closeFormModal(); loadAdminCategories(); loadCategories();
  } else toast(res?.Message || 'Loi', 'error');
}

async function deleteCat(id) {
  confirmAction('An danh muc nay?', async () => {
    const res = await CategoriesAPI.delete(id);
    if (res?.Success) { toast('Da an danh muc', 'success'); loadAdminCategories(); }
    else toast(res?.Message || 'Loi', 'error');
  });
}

// ── VOUCHERS ───────────────────────────────────────────────────────────
async function loadAdminVouchers() {
  showLoading('adminVouchersTable');
  const res = await VouchersAPI.getAll();
  if (!res?.Success) return;

  document.getElementById('adminVouchersTable').innerHTML = res.Data.map(v => `
    <tr>
      <td style="font-weight:700;color:var(--color-primary);">${v.Code}</td>
      <td>${v.Description}</td>
      <td>${v.Type === 'Percentage' ? `${v.Value}%` : v.Type === 'FreeShipping' ? 'Free ship' : fmtPrice(v.Value)}</td>
      <td style="color:var(--color-text-muted);">${v.ExpiresAt ? fmtDate(v.ExpiresAt) : 'Khong gioi han'}</td>
      <td>${v.UsedCount} / ${v.UsageLimit}</td>
      <td>${v.IsActive ? '<span class="status-chip s-done">Hoat dong</span>' : '<span class="status-chip s-cancelled">Vo hieu</span>'}</td>
      <td>
        <button class="action-btn" onclick="deleteVoucher(${v.Id})" style="color:var(--color-primary);">Vo hieu hoa</button>
      </td>
    </tr>`).join('');
}

async function deleteVoucher(id) {
  confirmAction('Vo hieu hoa voucher nay?', async () => {
    const res = await VouchersAPI.delete(id);
    if (res?.Success) { toast('Da vo hieu hoa', 'success'); loadAdminVouchers(); }
  });
}

async function saveVoucher() {
  const data = {
    Code:        document.getElementById('pf-v-code').value.trim().toUpperCase(),
    Description: document.getElementById('pf-v-desc').value.trim(),
    Type:        document.getElementById('pf-v-type').value,
    Value:       parseFloat(document.getElementById('pf-v-val').value),
    MinOrder:    parseFloat(document.getElementById('pf-v-min').value) || 0,
    MaxDiscount: parseFloat(document.getElementById('pf-v-max').value) || null,
    UsageLimit:  parseInt(document.getElementById('pf-v-limit').value) || 100,
    ExpiresAt:   document.getElementById('pf-v-exp').value || null,
    IsActive:    true,
  };
  if (!data.Code || !data.Value) { toast('Nhap day du thong tin', 'info'); return; }
  const res = await VouchersAPI.create(data);
  if (res?.Success) { toast('Tao voucher thanh cong', 'success'); closeFormModal(); loadAdminVouchers(); }
  else toast(res?.Message || 'Loi', 'error');
}

// ── USERS ──────────────────────────────────────────────────────────────
async function loadAdminUsers() {
  showLoading('adminUsersTable');
  const res = await AdminUsersAPI.getAll();
  if (!res?.Success) return;

  document.getElementById('adminUsersTable').innerHTML = res.Data.map(u => `
    <tr>
      <td>
        <div style="font-weight:600;">${u.FullName}</div>
        <div style="font-size:.72rem;color:var(--color-text-muted);">${u.Email}</div>
      </td>
      <td style="color:var(--color-text-muted);">${u.Phone || '-'}</td>
      <td>
        <span class="status-chip ${u.Role==='Admin'?'s-delivering':'s-preparing'}">${u.Role}</span>
      </td>
      <td>${u.OrderCount}</td>
      <td style="font-weight:700;color:var(--color-primary);">${fmtPrice(u.TotalSpent)}</td>
      <td>${u.IsActive
        ? '<span class="status-chip s-done">Hoat dong</span>'
        : '<span class="status-chip s-cancelled">Da khoa</span>'}</td>
      <td>
        <button class="action-btn" onclick="toggleUser(${u.Id})">
          ${u.IsActive ? 'Khoa' : 'Mo khoa'}
        </button>
      </td>
    </tr>`).join('');
}

async function toggleUser(id) {
  const res = await AdminUsersAPI.toggleActive(id);
  if (res?.Success) { toast(res.Message, 'success'); loadAdminUsers(); }
  else toast(res?.Message || 'Loi', 'error');
}

// ── Modal helpers ──────────────────────────────────────────────────────
function closeFormModal() {
  document.querySelectorAll('.form-modal').forEach(m => m.classList.remove('open'));
  document.getElementById('formModalOverlay')?.classList.remove('open');
}

// ── Admin Sidebar Toggle (mobile) ──────────────────────────────────────
function toggleAdminSidebar() {
  document.getElementById('adminSidebar')?.classList.toggle('open');
  document.getElementById('adminSidebarOverlay')?.classList.toggle('open');
}
function closeAdminSidebar() {
  document.getElementById('adminSidebar')?.classList.remove('open');
  document.getElementById('adminSidebarOverlay')?.classList.remove('open');
}

// ── Real-time polling ──────────────────────────────────────────────────
// Poll moi 5 giay khi dang o trang Admin
let _adminPollTimer = null;
const POLL_INTERVAL = 5000; // ms

// Track so don hien tai de phat hien don moi
let _lastOrderCount = -1;
let _lastPendingCount = -1;

function startAdminPolling() {
  stopAdminPolling();
  _adminPollTimer = setInterval(async () => {
    // 1. Check don moi qua stats (nhe nhan, khong re-render)
    await checkForNewOrders();
    // 2. Refresh section dang hien thi
    const refreshers = {
      dashboard: loadAdminDashboard,
      orders:    loadAdminOrders,
      products:  loadAdminProducts,
      users:     loadAdminUsers,
    };
    if (refreshers[_adminTab]) await refreshers[_adminTab]();
  }, POLL_INTERVAL);
}

async function checkForNewOrders() {
  const res = await OrdersAPI.getStats();
  if (!res?.Success) return;
  const { TotalOrders, PendingOrders } = res.Data;

  // Lan dau - chi luu, khong thong bao
  if (_lastOrderCount === -1) {
    _lastOrderCount   = TotalOrders;
    _lastPendingCount = PendingOrders;
    return;
  }

  // Co don moi
  if (TotalOrders > _lastOrderCount) {
    const newCount = TotalOrders - _lastOrderCount;
    showAdminNotification(
      `Co ${newCount} don hang moi!`,
      'new-order'
    );
    _lastOrderCount = TotalOrders;
  }

  // Co don cho xu ly moi (nhung khong phai don moi - vi du user dat truoc, admin offline)
  if (PendingOrders > _lastPendingCount && TotalOrders === _lastOrderCount) {
    showAdminNotification('Co don hang dang cho xu ly!', 'pending');
    _lastPendingCount = PendingOrders;
  }
  _lastPendingCount = PendingOrders;

  // Cap nhat badge
  await updatePendingBadge();
}

function showAdminNotification(msg, type) {
  // Dung toast special voi class admin-notify
  const el    = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  if (!el || !msgEl) return;
  msgEl.textContent = msg;
  el.className = 'show admin-notify';
  clearTimeout(window._adminToastTimer);
  // Phat am thanh nhe
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
  window._adminToastTimer = setTimeout(() => { el.className = ''; }, 5000);
}

function stopAdminPolling() {
  if (_adminPollTimer) { clearInterval(_adminPollTimer); _adminPollTimer = null; }
}

// Bat dau poll khi vao admin, dung lai khi roi khoi
const _origInitAdmin = typeof initAdmin === 'function' ? initAdmin : null;
async function initAdmin() {
  if (!Auth.isAdmin()) { toast('Khong co quyen', 'error'); goto('home'); return; }
  switchAdmin(document.getElementById('sidebar-dashboard'), 'dashboard');
  startAdminPolling();
  safeIcons();
}

// Realtime badge: cap nhat so don cho xu ly tren sidebar
async function updatePendingBadge() {
  const res = await OrdersAPI.getStats();
  if (!res?.Success) return;
  const pending = res.Data.PendingOrders;
  const el = document.getElementById('sidebar-orders');
  if (!el) return;
  // Xoa badge cu
  el.querySelector('.pending-badge')?.remove();
  if (pending > 0) {
    const badge = document.createElement('span');
    badge.className = 'pending-badge';
    badge.textContent = pending;
    badge.style.cssText = `
      margin-left:auto; background:var(--color-primary); color:#fff;
      font-size:.65rem; font-weight:800; padding:2px 7px;
      border-radius:var(--radius-pill); min-width:18px; text-align:center;`;
    el.appendChild(badge);
  }
}
