/* ═══════════════════════════════════════════
   F-CHICKEN — Cart Drawer
   ═══════════════════════════════════════════ */

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('drawerOverlay')?.classList.add('open');
  renderCartDrawer();
}
function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('drawerOverlay')?.classList.remove('open');
}

function renderCartDrawer() {
  const items  = CartState.getItems();
  const body   = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  if (!body) return;

  if (!items.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon"><i data-lucide="shopping-bag" width="48" height="48"></i></div>
        <p>Gio hang cua ban dang trong</p>
        <button onclick="closeCart(); goto('menu')" class="btn-primary"
          style="margin-top:16px; padding:10px 24px; font-size:0.82rem;">
          Xem thuc don
        </button>
      </div>`;
    if (footer) footer.innerHTML = '';
    safeIcons(); return;
  }

  body.innerHTML = items.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.ImageUrl}" alt="${item.ProductName}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.ProductName}</div>
        <div class="cart-item-size">${item.Note || 'Size thuong'}</div>
        <div class="cart-item-row">
          <div class="qty-control">
            <button class="qty-btn" onclick="CartState.changeQty(${item.ProductId}, -1)">
              <i data-lucide="minus" width="11" height="11"></i>
            </button>
            <div class="qty-val">${item.Qty}</div>
            <button class="qty-btn" onclick="CartState.changeQty(${item.ProductId}, 1)">
              <i data-lucide="plus" width="11" height="11"></i>
            </button>
          </div>
          <div class="cart-item-price">${fmtPrice(item.Price * item.Qty)}</div>
        </div>
      </div>
      <button class="remove-btn" onclick="CartState.removeItem(${item.ProductId})">
        <i data-lucide="trash-2" width="14" height="14"></i>
      </button>
    </div>`).join('');

  const sub = CartState.getSubtotal();
  const shipping = sub >= 99000 ? 0 : 15000;
  footer.innerHTML = `
    <div class="summary-row"><span>Tam tinh</span><span>${fmtPrice(sub)}</span></div>
    <div class="summary-row"><span>Phi giao hang</span>
      <span>${shipping === 0 ? '<span style="color:var(--color-success);font-weight:700;">Mien phi</span>' : fmtPrice(shipping)}</span>
    </div>
    <div class="summary-row total"><span>Tong cong</span><span>${fmtPrice(sub + shipping)}</span></div>
    <button class="btn-primary" style="width:100%;justify-content:center;padding:13px;margin-top:4px;"
      onclick="closeCart(); goto('checkout')">
      Thanh toan <i data-lucide="arrow-right" width="14" height="14"></i>
    </button>`;
  safeIcons();
}
