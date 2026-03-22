/* ═══════════════════════════════════════════
   F-CHICKEN — Router, Toast, Helpers
   ═══════════════════════════════════════════ */

// ── Router ─────────────────────────────────────────────────────────────
const ADMIN_PAGES = ['admin'];

function goto(pageId, params = {}) {
  const isAdmin = ADMIN_PAGES.includes(pageId);

  // Auth guard
  if (pageId === 'profile' && !Auth.isLoggedIn()) { goto('login'); return; }
  if (isAdmin && !Auth.isAdmin()) { toast('Ban khong co quyen truy cap', 'error'); return; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  // Sync desktop nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + pageId);
  if (navBtn) navBtn.classList.add('active');

  // Sync mobile nav
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const mnavBtn = document.getElementById('mnav-' + pageId);
  if (mnavBtn) mnavBtn.classList.add('active');

  // Close mobile menu when navigating
  closeMobileMenu();

  // Stop admin polling khi roi khoi admin page
  if (pageId !== 'admin' && typeof stopAdminPolling === 'function') stopAdminPolling();
  // Stop user orders polling khi roi khoi tracking page
  if (pageId !== 'tracking' && typeof stopUserOrdersPolling === 'function') stopUserOrdersPolling();

  const header = document.getElementById('mainHeader');
  const footer = document.getElementById('mainFooter');
  const main   = document.querySelector('main');
  if (header) header.style.display = isAdmin ? 'none' : 'block';
  if (footer) footer.style.display = isAdmin ? 'none' : 'block';
  if (main)   main.style.paddingTop = isAdmin ? '0' : '64px';

  // Per-page init
  const inits = {
    home:       initHome,
    menu:       initMenu,
    favorites:  initFavorites,
    checkout:   initCheckout,
    tracking:   initTracking,
    profile:    initProfile,
    admin:      initAdmin,
  };
  if (inits[pageId]) inits[pageId](params);

  window.scrollTo(0, 0);
  safeIcons();
}

// ── Toast ──────────────────────────────────────────────────────────────
let _toastTimer;
window._toastTimer = null;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  if (!el || !msgEl) return;
  msgEl.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.className = '', 3000);
}

// ── Lucide icons ───────────────────────────────────────────────────────
function safeIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Format helpers ─────────────────────────────────────────────────────
function fmtPrice(n) {
  return Number(n).toLocaleString('vi-VN') + 'd';
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('vi-VN');
}
function fmtDateTime(d) {
  const dt = new Date(d);
  return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
         ' ' + dt.toLocaleDateString('vi-VN');
}

// ── Loading spinner ────────────────────────────────────────────────────
function showLoading(containerId, msg = 'Dang tai...') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div style="text-align:center;padding:60px 20px;color:var(--color-text-muted);">
      <div style="width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 14px;"></div>
      <p style="font-size:0.82rem;font-weight:600;">${msg}</p>
    </div>`;
}

// ── Empty state ────────────────────────────────────────────────────────
function showEmpty(containerId, msg = 'Chua co du lieu', icon = 'inbox') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div style="text-align:center;padding:60px 20px;color:var(--color-text-muted);">
      <i data-lucide="${icon}" width="48" height="48" style="margin:0 auto 14px;opacity:.3;display:block;"></i>
      <p style="font-size:0.85rem;font-weight:600;">${msg}</p>
    </div>`;
  safeIcons();
}

// ── Confirm modal ──────────────────────────────────────────────────────
function confirmAction(msg, onConfirm) {
  const overlay = document.getElementById('confirmOverlay');
  const msgEl   = document.getElementById('confirmMsg');
  const btnOk   = document.getElementById('confirmOk');
  if (!overlay) return onConfirm(); // fallback if no modal
  msgEl.textContent = msg;
  overlay.classList.add('open');
  btnOk.onclick = () => { overlay.classList.remove('open'); onConfirm(); };
}

// Status badge helper
const STATUS_CHIP = {
  Pending:    ['s-pending',    'Cho xu ly'],
  Confirmed:  ['s-preparing',  'Da xac nhan'],
  Preparing:  ['s-preparing',  'Dang che bien'],
  Delivering: ['s-delivering', 'Dang giao hang'],
  Delivered:  ['s-done',       'Da giao'],
  Cancelled:  ['s-cancelled',  'Da huy'],
};
function statusChip(status) {
  const [cls, label] = STATUS_CHIP[status] || ['s-pending', status];
  return `<span class="status-chip ${cls}">${label}</span>`;
}

// ── Mobile menu ────────────────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  const isOpen = menu.classList.toggle('open');
  // Switch icon menu ↔ x
  btn.innerHTML = isOpen
    ? '<i data-lucide="x" width="18" height="18"></i>'
    : '<i data-lucide="menu" width="18" height="18"></i>';
  safeIcons();
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  menu.classList.remove('open');
  btn.innerHTML = '<i data-lucide="menu" width="18" height="18"></i>';
  safeIcons();
}

// Close mobile menu khi click ra ngoài (dung closest de tranh svg bubble)
document.addEventListener('click', (e) => {
  const btn  = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  // Neu click vao chinh button hoac ben trong no -> bo qua (toggleMobileMenu xu ly)
  if (btn.contains(e.target)) return;
  // Neu menu dang mo va click ngoai header -> dong lai
  if (menu.classList.contains('open') && !menu.contains(e.target)) {
    closeMobileMenu();
  }
});

// ── Validators ─────────────────────────────────────────────────────────
function validatePhone(phone) {
  // Phai du 10 chu so va bat dau bang so 0
  return /^0\d{9}$/.test(phone?.trim());
}

// Inline phone input validation (real-time feedback)
function attachPhoneValidation(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  // Remove old listener
  el.oninput = () => {
    const val = el.value.trim();
    if (!val) { el.classList.remove('error'); removeErrMsg(el); return; }
    if (!validatePhone(val)) {
      el.classList.add('error');
      showErrMsg(el, 'Phai du 10 so va bat dau bang so 0');
    } else {
      el.classList.remove('error');
      removeErrMsg(el);
    }
  };
}
function showErrMsg(input, msg) {
  removeErrMsg(input);
  const span = document.createElement('div');
  span.className = 'input-error-msg';
  span.textContent = msg;
  input.parentNode.appendChild(span);
}
function removeErrMsg(input) {
  input.parentNode.querySelector('.input-error-msg')?.remove();
}
