/* ═══════════════════════════════════════════
   F-CHICKEN — Checkout Page
   ═══════════════════════════════════════════ */
let _checkoutDiscount = 0;

async function initCheckout() {
  if (!Auth.isLoggedIn()) { goto('login'); return; }
  await CartState.fetchFromServer();
  renderCheckoutItems();

  // Pre-fill address from profile
  attachPhoneValidation('co-phone');
  const user = Auth.getUser();
  if (user) {
    const nameEl  = document.getElementById('co-name');
    const phoneEl = document.getElementById('co-phone');
    if (nameEl)  nameEl.value  = user.FullName || '';
    if (phoneEl) phoneEl.value = user.Phone || '';
  }
}

function renderCheckoutItems() {
  const items = CartState.getItems();
  const el    = document.getElementById('checkoutItems');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<p style="font-size:.82rem;color:var(--color-text-muted);text-align:center;padding:12px 0;">Gio hang trong. <a href="#" onclick="goto(\'menu\')" style="color:var(--color-primary);">Xem thuc don</a></p>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border);">
      <img src="${i.ImageUrl}" style="width:46px;height:46px;border-radius:var(--radius-md);object-fit:cover;flex-shrink:0;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.ProductName}</div>
        <div style="font-size:.72rem;color:var(--color-text-muted);">x${i.Qty}</div>
      </div>
      <div style="font-size:.85rem;font-weight:700;color:var(--color-primary);white-space:nowrap;">${fmtPrice(i.Price * i.Qty)}</div>
    </div>`).join('');

  updateCheckoutTotals();
  safeIcons();
}

function updateCheckoutTotals() {
  const sub      = CartState.getSubtotal();
  const shipping = sub >= 99000 ? 0 : 15000;
  const total    = sub + shipping - _checkoutDiscount;

  document.getElementById('co-sub').textContent      = fmtPrice(sub);
  document.getElementById('co-shipping').textContent = shipping === 0 ? 'Mien phi' : fmtPrice(shipping);
  document.getElementById('co-discount').textContent = _checkoutDiscount > 0 ? '-' + fmtPrice(_checkoutDiscount) : '—';
  document.getElementById('co-total').textContent    = fmtPrice(Math.max(0, total));
}

async function applyVoucher() {
  const code   = document.getElementById('couponIn')?.value?.trim();
  if (!code) return;
  const sub    = CartState.getSubtotal();
  const res    = await VouchersAPI.validate(code, sub);
  if (res?.Valid) {
    _checkoutDiscount = res.Discount;
    toast(`Ap dung thanh cong: ${res.Description || code}`, 'success');
  } else {
    _checkoutDiscount = 0;
    toast(res?.Message || 'Ma khong hop le', 'info');
  }
  updateCheckoutTotals();
}

function selectPay(el) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
}

async function placeOrder() {
  const items = CartState.getItems();
  if (!items.length) { toast('Gio hang trong', 'info'); return; }

  const name    = document.getElementById('co-name')?.value?.trim();
  const phone   = document.getElementById('co-phone')?.value?.trim();
  const address = document.getElementById('co-address')?.value?.trim();
  if (!name || !phone || !address) { toast('Vui long dien day du thong tin giao hang', 'info'); return; }
  if (!validatePhone(phone)) { toast('So dien thoai khong dung dinh dang (10 so, bat dau bang 0)', 'info'); return; }

  const payMethod = document.querySelector('.pay-method.active .pay-method-name')?.textContent || 'Tien mat';
  const voucher   = document.getElementById('couponIn')?.value?.trim() || null;
  const note      = document.getElementById('co-note')?.value?.trim() || null;

  const payload = {
    Phone:         phone,
    Address:       address,
    PaymentMethod: payMethod,
    VoucherCode:   voucher,
    Note:          note,
    Items:         items.map(i => ({ ProductId: i.ProductId, Qty: i.Qty }))
  };

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dang xu ly...'; }

  const res = await OrdersAPI.placeOrder(payload);

  if (btn) { btn.disabled = false; btn.innerHTML = 'Xac nhan dat hang <i data-lucide="check" width="16" height="16"></i>'; safeIcons(); }

  if (res?.Success) {
    await CartState.clearAll();
    toast('Dat hang thanh cong!', 'success');
    const newOrderId = res.Data.Id;
    // Chuyen sang trang don hang truoc, sau do mo modal don vua dat
    await new Promise(resolve => {
      goto('tracking');
      // Doi list render xong roi moi mo modal
      setTimeout(async () => {
        await openOrderDetail(newOrderId);
        resolve();
      }, 400);
    });
  } else {
    toast(res?.Message || 'Co loi xay ra, vui long thu lai', 'error');
  }
}

/* ═══════════════════════════════════════════
   F-CHICKEN — Orders Page (thay the Tracking)
   ═══════════════════════════════════════════ */
let _ordersFilter = '';

async function initTracking(params = {}) {
  if (!Auth.isLoggedIn()) { goto('login'); return; }

  if (params.orderId) {
    await loadOrdersList();
    await openOrderDetail(params.orderId);
  } else {
    await loadOrdersList();
  }
  // Bat dau poll real-time
  startUserOrdersPolling();
}

async function loadOrdersList() {
  const el = document.getElementById('ordersList');
  if (!el) return;
  showLoading('ordersList', 'Dang tai don hang...');

  const params = { pageSize: 50 };
  if (_ordersFilter) params.status = _ordersFilter;

  const res = await OrdersAPI.getOrders(params);
  if (!res?.Success) { showEmpty('ordersList', 'Khong tai duoc don hang', 'package'); return; }

  const items = res.Data.Items;
  if (!items.length) {
    el.innerHTML = `
      <div class="orders-empty">
        <i data-lucide="package" width="52" height="52" style="margin:0 auto 16px;display:block;opacity:.25;"></i>
        <p style="font-size:.9rem;font-weight:700;margin-bottom:8px;">Chua co don hang nao</p>
        <p style="font-size:.82rem;margin-bottom:20px;">Hay dat mon ngon dau tien cua ban!</p>
        <button class="btn-primary" onclick="goto('menu')" style="padding:10px 28px;">
          Xem thuc don <i data-lucide="arrow-right" width="14" height="14"></i>
        </button>
      </div>`;
    safeIcons(); return;
  }

  el.innerHTML = items.map(o => `
    <div class="order-card" onclick="openOrderDetail(${o.Id})">
      <div>
        <div class="order-card-code">${o.Code}</div>
        <div class="order-card-meta" style="display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap;">
          ${statusChip(o.Status)}
          <span><i data-lucide="calendar" width="12" height="12" style="vertical-align:middle;margin-right:3px;"></i>${fmtDate(o.CreatedAt)}</span>
          <span><i data-lucide="utensils" width="12" height="12" style="vertical-align:middle;margin-right:3px;"></i>${o.ItemCount} mon</span>
        </div>
      </div>
      <div class="order-card-actions">
        <div class="order-card-price">${fmtPrice(o.Total)}</div>
        <button class="action-btn" style="white-space:nowrap;"
          onclick="event.stopPropagation(); openOrderDetail(${o.Id})">
          <i data-lucide="eye" width="13" height="13"></i> Chi tiet
        </button>
      </div>
    </div>`).join('');
  safeIcons();
}

function filterOrders(el, status) {
  _ordersFilter = status;
  document.querySelectorAll('#ordersFilterBar .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadOrdersList();
}

// ── Order Detail Modal ─────────────────────────────────────────────────
async function openOrderDetail(orderId) {
  const overlay = document.getElementById('orderModalOverlay');
  const modal   = document.getElementById('orderDetailModal');
  const content = document.getElementById('orderModalContent');
  if (!modal) return;

  content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-muted);">
    <div style="width:28px;height:28px;border:3px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px;"></div>
    Dang tai...
  </div>`;
  _openModalOrderId = orderId;
  overlay.classList.add('open');
  modal.classList.add('open');

  const res = await OrdersAPI.getById(orderId);
  if (!res?.Success) {
    content.innerHTML = '<p style="text-align:center;padding:40px;color:var(--color-text-muted);">Khong tai duoc don hang.</p>';
    return;
  }

  const o = res.Data;

  // Update header
  document.getElementById('orderModalCode').textContent = o.Code;
  document.getElementById('orderModalStatus').innerHTML = statusChip(o.Status);

  content.innerHTML = `
    <!-- Tracking timeline -->
    <div style="margin-bottom:24px;">
      <div style="font-size:.72rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;">
        Hanh trinh don hang
      </div>
      <div class="timeline">
        ${renderTimeline(o.TrackingHistory || [], o.Status)}
      </div>
    </div>

    <!-- Map placeholder nếu đang giao -->
    ${o.Status === 'Delivering' ? `
    <div class="map-box" style="margin-bottom:24px;">
      <div class="map-inner"></div>
      <div class="map-grid-lines"></div>
      <div class="map-center">
        <div class="map-pin"><i data-lucide="bike" width="26" height="26"></i></div>
        <div class="map-label">Shipper dang tren duong den ban...</div>
      </div>
    </div>` : ''}

    <!-- Order items -->
    <div style="border-top:1px solid var(--color-border);padding-top:20px;">
      <div style="font-size:.72rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">
        San pham da dat
      </div>
      ${o.Items.map(i => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--color-border);">
          <img src="${i.ImageUrl}" style="width:52px;height:52px;border-radius:var(--radius-md);object-fit:cover;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:.85rem;font-weight:700;">${i.ProductName}</div>
            <div style="font-size:.75rem;color:var(--color-text-muted);">
              ${fmtPrice(i.Price)} × ${i.Qty}
            </div>
          </div>
          <div style="font-weight:800;color:var(--color-primary);white-space:nowrap;">
            ${fmtPrice(i.Price * i.Qty)}
          </div>
        </div>`).join('')}
    </div>

    <!-- Summary -->
    <div style="padding-top:16px;">
      <div class="summary-row"><span>Tam tinh</span><span>${fmtPrice(o.Subtotal)}</span></div>
      <div class="summary-row"><span>Phi giao hang</span><span>${o.ShippingFee === 0 ? '<span style="color:var(--color-success);font-weight:700;">Mien phi</span>' : fmtPrice(o.ShippingFee)}</span></div>
      ${o.Discount > 0 ? `<div class="summary-row"><span>Giam gia ${o.VoucherCode ? `<span style="font-size:.7rem;background:var(--color-primary-glow);color:var(--color-primary);padding:1px 7px;border-radius:99px;font-weight:700;">${o.VoucherCode}</span>` : ''}</span><span style="color:var(--color-success);font-weight:700;">-${fmtPrice(o.Discount)}</span></div>` : ''}
      <div class="summary-row total"><span>Tong cong</span><span>${fmtPrice(o.Total)}</span></div>
    </div>

    <!-- Info -->
    <div style="margin-top:16px;padding:14px 16px;background:var(--color-surface-soft);border-radius:var(--radius-md);font-size:.8rem;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><span style="color:var(--color-text-muted);font-weight:600;">Dia chi:</span><br><span style="font-weight:600;">${o.Address}</span></div>
        <div><span style="color:var(--color-text-muted);font-weight:600;">Thanh toan:</span><br><span style="font-weight:600;">${o.PaymentMethod}</span></div>
        <div><span style="color:var(--color-text-muted);font-weight:600;">SDT:</span><br><span style="font-weight:600;">${o.Phone}</span></div>
        <div><span style="color:var(--color-text-muted);font-weight:600;">Ngay dat:</span><br><span style="font-weight:600;">${fmtDateTime(o.CreatedAt)}</span></div>
      </div>
      ${o.Note ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border);"><span style="color:var(--color-text-muted);font-weight:600;">Ghi chu:</span> ${o.Note}</div>` : ''}
    </div>

    <!-- Cancel button if pending -->
    ${o.Status === 'Pending' ? `
    <button class="btn-outline" style="width:100%;justify-content:center;margin-top:16px;color:var(--color-primary);border-color:var(--color-primary);"
      onclick="cancelOrderFromModal(${o.Id})">
      <i data-lucide="x-circle" width="15" height="15"></i> Huy don hang
    </button>` : ''}
  `;
  safeIcons();
}

function closeOrderModal() {
  _openModalOrderId = null;
  document.getElementById('orderModalOverlay')?.classList.remove('open');
  document.getElementById('orderDetailModal')?.classList.remove('open');
}

async function cancelOrderFromModal(orderId) {
  confirmAction('Huy don hang nay?', async () => {
    const res = await OrdersAPI.cancelOrder(orderId);
    if (res?.Success) {
      toast('Da huy don hang', 'success');
      closeOrderModal();
      loadOrdersList();
    } else {
      toast(res?.Message || 'Khong the huy don hang nay', 'info');
    }
  });
}

function renderTimeline(events, currentStatus) {
  const steps = [
    { key: 'Pending',    label: 'Da dat hang',    icon: 'check' },
    { key: 'Confirmed',  label: 'Da xac nhan',     icon: 'check-circle' },
    { key: 'Preparing',  label: 'Dang che bien',   icon: 'utensils' },
    { key: 'Delivering', label: 'Dang giao hang',  icon: 'bike' },
    { key: 'Delivered',  label: 'Giao thanh cong', icon: 'map-pin' },
  ];

  // Cancelled: rieng
  if (currentStatus === 'Cancelled') {
    const cancelEvent = events.find(e => e.Status === 'Cancelled');
    const firstEvent  = events[0];
    return `
      <div class="tl-step done">
        <div class="tl-dot"><i data-lucide="check" width="14" height="14"></i></div>
        <div class="tl-content">
          <div class="tl-title">Da dat hang</div>
          ${firstEvent ? `<div class="tl-time">${fmtDateTime(firstEvent.Time)}</div>` : ''}
        </div>
      </div>
      <div class="tl-step active">
        <div class="tl-dot" style="border-color:var(--color-primary);background:rgba(181,18,27,.1);color:var(--color-primary);">
          <i data-lucide="x-circle" width="14" height="14"></i>
        </div>
        <div class="tl-content">
          <div class="tl-title">Don hang da bi huy</div>
          ${cancelEvent ? `<div class="tl-time">${fmtDateTime(cancelEvent.Time)}</div>` : ''}
        </div>
      </div>`;
  }

  // Thu tu cac buoc — dung de xac dinh done/active/pending
  const stepOrder = steps.map(s => s.key);
  const currentIdx = stepOrder.indexOf(currentStatus);

  return steps.map((s, i) => {
    // Buoc nao truoc current → done
    // Buoc hien tai → active  
    // Buoc sau → pending
    const done    = i < currentIdx;
    const active  = i === currentIdx;
    const pending = i > currentIdx;
    const cls     = done ? 'done' : active ? 'active' : 'pending';

    // Tim event tuong ung trong history (co the khong co neu admin skip buoc)
    const event = events.find(e => e.Status === s.key);

    return `
      <div class="tl-step ${cls}">
        <div class="tl-dot"><i data-lucide="${s.icon}" width="14" height="14"></i></div>
        <div class="tl-content">
          <div class="tl-title" ${pending ? 'style="color:var(--color-text-muted);"' : ''}>${s.label}</div>
          ${event ? `<div class="tl-desc">${event.Message}</div><div class="tl-time">${fmtDateTime(event.Time)}</div>`
                  : done ? `<div class="tl-desc" style="color:var(--color-text-muted);">Da hoan thanh</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   F-CHICKEN — Profile Page
   ═══════════════════════════════════════════ */
let _profileTab = 'orders';

async function initProfile() {
  if (!Auth.isLoggedIn()) { goto('login'); return; }
  const user = Auth.getUser();

  document.getElementById('profileName')?.textContent  && (document.getElementById('profileName').textContent  = user.FullName);
  document.getElementById('profileEmail')?.textContent && (document.getElementById('profileEmail').textContent = user.Email);

  // Load fresh data
  const me = await AuthAPI.me();
  if (me?.Success) {
    const u = me.Data;
    if (document.getElementById('pf-name'))  document.getElementById('pf-name').value  = u.FullName;
    if (document.getElementById('pf-phone')) document.getElementById('pf-phone').value = u.Phone || '';
    if (document.getElementById('pf-addr'))  document.getElementById('pf-addr').value  = u.Address || '';
  }

  switchProfileTab('orders');
  attachPhoneValidation('pf-phone');
}

async function switchProfileTab(tab) {
  _profileTab = tab;
  document.querySelectorAll('.profile-item').forEach(i => i.classList.remove('active'));
  document.getElementById('ptab-' + tab)?.classList.add('active');
  document.querySelectorAll('.profile-content').forEach(c => c.style.display = 'none');
  const content = document.getElementById('pcontent-' + tab);
  if (content) content.style.display = 'block';

  if (tab === 'orders')    await loadProfileOrders();
  if (tab === 'favorites') await initFavoritesInProfile();
  if (tab === 'vouchers')  renderVouchersInfo();
}

async function loadProfileOrders() {
  showLoading('profileOrdersList');
  const res = await OrdersAPI.getOrders({ pageSize: 20 });
  if (!res?.Success) { showEmpty('profileOrdersList', 'Khong tai duoc'); return; }

  const items = res.Data.Items;
  if (!items.length) { showEmpty('profileOrdersList', 'Chua co don hang nao', 'package'); return; }

  document.getElementById('profileOrdersList').innerHTML = `
    <table>
      <thead>
        <tr><th>Ma don</th><th>Ngay dat</th><th>San pham</th><th>Tong tien</th><th>Trang thai</th><th></th></tr>
      </thead>
      <tbody>
        ${items.map(o => `
          <tr>
            <td style="color:var(--color-primary);font-weight:700;">${o.Code}</td>
            <td style="color:var(--color-text-muted);">${fmtDate(o.CreatedAt)}</td>
            <td>${o.ItemCount} mon</td>
            <td style="font-weight:700;color:var(--color-primary);">${fmtPrice(o.Total)}</td>
            <td>${statusChip(o.Status)}</td>
            <td><button class="action-btn" onclick="openOrderDetail(${o.Id})">Chi tiet</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function initFavoritesInProfile() {
  showLoading('profileFavList');
  await loadFavoriteIds();
  const res = await FavoritesAPI.getAll();
  if (!res?.Success || !res.Data.length) {
    showEmpty('profileFavList', 'Chua co mon yeu thich', 'heart'); return;
  }
  document.getElementById('profileFavList').innerHTML = `
    <div class="product-grid" style="grid-template-columns:repeat(3,1fr);">
      ${res.Data.map(p => productCardHTML({ ...p, CategoryName: '' })).join('')}
    </div>`;
  safeIcons();
}

function renderVouchersInfo() {
  document.getElementById('profileVoucherList').innerHTML = `
    <div style="display:grid;gap:12px;">
      <div style="background:var(--color-primary-glow);border:1px dashed var(--color-primary);border-radius:var(--radius-lg);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:.72rem;font-weight:700;color:var(--color-primary);text-transform:uppercase;letter-spacing:.06em;">Mung ban moi</div>
          <div style="font-size:1rem;font-weight:900;">WELCOME30</div>
          <div style="font-size:.78rem;color:var(--color-text-secondary);">Giam 30.000d cho don dau tien</div>
        </div>
        <button class="btn-primary" style="font-size:.78rem;padding:8px 16px;"
          onclick="goto('menu'); toast('Ap dung ma WELCOME30 o trang thanh toan', 'info')">Dung ngay</button>
      </div>
    </div>`;
}

async function saveProfile() {
  const name  = document.getElementById('pf-name')?.value?.trim();
  const phone = document.getElementById('pf-phone')?.value?.trim();
  const addr  = document.getElementById('pf-addr')?.value?.trim();
  if (!name) { toast('Vui long nhap ho ten', 'info'); return; }
  if (phone && !validatePhone(phone)) { toast('So dien thoai khong dung dinh dang (10 so, bat dau bang 0)', 'info'); return; }

  const res = await AuthAPI.updateProfile({ FullName: name, Phone: phone, Address: addr });
  if (res?.Success) {
    const u = Auth.getUser();
    if (u) { u.FullName = name; Auth.login(Auth.getToken(), u); }
    toast('Cap nhat thanh cong', 'success');
  } else {
    toast(res?.Message || 'Loi cap nhat', 'error');
  }
}

async function changePassword() {
  const curr = document.getElementById('pw-current')?.value;
  const next  = document.getElementById('pw-new')?.value;
  const conf  = document.getElementById('pw-confirm')?.value;

  if (!curr || !next) { toast('Vui long nhap day du', 'info'); return; }
  if (next !== conf)  { toast('Mat khau xac nhan khong khop', 'info'); return; }
  if (next.length < 6){ toast('Mat khau toi thieu 6 ky tu', 'info'); return; }

  const res = await AuthAPI.changePassword(curr, next);
  if (res?.Success) {
    toast('Doi mat khau thanh cong', 'success');
    ['pw-current','pw-new','pw-confirm'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
  } else {
    toast(res?.Message || 'Loi doi mat khau', 'error');
  }
}

/* ═══════════════════════════════════════════
   REAL-TIME: User orders page polling
   ═══════════════════════════════════════════ */
let _userOrdersPollTimer = null;

function startUserOrdersPolling() {
  stopUserOrdersPolling();
  _userOrdersPollTimer = setInterval(async () => {
    // Refresh list quietly (no loading spinner)
    await refreshOrdersListSilent();
    // If modal dang mo → refresh luon noi dung modal
    const modal = document.getElementById('orderDetailModal');
    if (modal?.classList.contains('open') && _openModalOrderId) {
      await refreshOrderModalSilent(_openModalOrderId);
    }
  }, 5000);
}

function stopUserOrdersPolling() {
  if (_userOrdersPollTimer) { clearInterval(_userOrdersPollTimer); _userOrdersPollTimer = null; }
}

// Refresh danh sach don hang khong show loading
async function refreshOrdersListSilent() {
  const params = { pageSize: 50 };
  if (_ordersFilter) params.status = _ordersFilter;
  const res = await OrdersAPI.getOrders(params);
  if (!res?.Success) return;

  const items = res.Data.Items;
  const list  = document.getElementById('ordersList');
  if (!list || !items) return;

  // Chi update neu co thay doi (so sanh JSON don gian)
  const newHash = items.map(o => `${o.Id}:${o.Status}`).join(',');
  if (list.dataset.hash === newHash) return; // khong co gi thay doi
  list.dataset.hash = newHash;

  // Re-render list
  if (!items.length) return;
  list.innerHTML = items.map(o => `
    <div class="order-card" onclick="openOrderDetail(${o.Id})">
      <div>
        <div class="order-card-code">${o.Code}</div>
        <div class="order-card-meta" style="display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap;">
          ${statusChip(o.Status)}
          <span><i data-lucide="calendar" width="12" height="12" style="vertical-align:middle;margin-right:3px;"></i>${fmtDate(o.CreatedAt)}</span>
          <span><i data-lucide="utensils" width="12" height="12" style="vertical-align:middle;margin-right:3px;"></i>${o.ItemCount} mon</span>
        </div>
      </div>
      <div class="order-card-actions">
        <div class="order-card-price">${fmtPrice(o.Total)}</div>
        <button class="action-btn" style="white-space:nowrap;"
          onclick="event.stopPropagation(); openOrderDetail(${o.Id})">
          <i data-lucide="eye" width="13" height="13"></i> Chi tiet
        </button>
      </div>
    </div>`).join('');
  safeIcons();
}

// Track modal dang mo
let _openModalOrderId = null;

// Refresh noi dung modal khong dong/mo lai
async function refreshOrderModalSilent(orderId) {
  const res = await OrdersAPI.getById(orderId);
  if (!res?.Success) return;
  const o = res.Data;
  // Chi update status header + timeline
  const statusEl = document.getElementById('orderModalStatus');
  if (statusEl) statusEl.innerHTML = statusChip(o.Status);
  // Re-render timeline
  const tlContainer = document.querySelector('#orderModalContent .timeline');
  if (tlContainer) {
    tlContainer.innerHTML = renderTimeline(o.TrackingHistory || [], o.Status);
    safeIcons();
  }
}
