/* ═══════════════════════════════════════════
   F-CHICKEN — API Client
   Tat ca giao tiep voi ASP.NET Core backend
   ═══════════════════════════════════════════ */

const API_BASE = '/api';

// ── HTTP helpers ───────────────────────────────────────────────────────
async function apiCall(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok && res.status === 401) {
    Auth.logout();
    goto('login');
    return null;
  }
  return data;
}

const api = {
  get:    (path)        => apiCall('GET',    path),
  post:   (path, body)  => apiCall('POST',   path, body),
  put:    (path, body)  => apiCall('PUT',    path, body),
  patch:  (path, body)  => apiCall('PATCH',  path, body),
  delete: (path)        => apiCall('DELETE', path),
};

// ── Auth API ───────────────────────────────────────────────────────────
const AuthAPI = {
  login:         (email, password)     => api.post('/auth/login',          { Email: email, Password: password }),
  register:      (data)                => api.post('/auth/register',        data),
  forgotPassword:(email)               => api.post('/auth/forgot-password', { Email: email }),
  resetPassword: (token, pwd)          => api.post('/auth/reset-password',  { Token: token, NewPassword: pwd }),
  me:            ()                    => api.get('/auth/me'),
  updateProfile: (data)                => api.put('/auth/profile',          data),
  changePassword:(curr, next)          => api.put('/auth/change-password',  { CurrentPassword: curr, NewPassword: next }),
};

// ── Products API ───────────────────────────────────────────────────────
const ProductsAPI = {
  getAll:        (params = {})   => api.get('/products?' + new URLSearchParams(params)),
  getById:       (id)            => api.get(`/products/${id}`),
  create:        (data)          => api.post('/products', data),
  update:        (id, data)      => api.put(`/products/${id}`, data),
  delete:        (id)            => api.delete(`/products/${id}`),
  toggleFeatured:(id)            => api.patch(`/products/${id}/toggle-featured`, {}),
};

// ── Categories API ─────────────────────────────────────────────────────
const CategoriesAPI = {
  getAll:  ()         => api.get('/categories'),
  create:  (data)     => api.post('/categories', data),
  update:  (id, data) => api.put(`/categories/${id}`, data),
  delete:  (id)       => api.delete(`/categories/${id}`),
};

// ── Cart API ───────────────────────────────────────────────────────────
const CartAPI = {
  getCart:    ()              => api.get('/cart'),
  addItem:    (productId, qty)=> api.post('/cart', { ProductId: productId, Qty: qty }),
  updateItem: (productId, qty)=> api.put(`/cart/${productId}`, { ProductId: productId, Qty: qty }),
  removeItem: (productId)     => api.delete(`/cart/${productId}`),
  clearCart:  ()              => api.delete('/cart'),
};

// ── Orders API ─────────────────────────────────────────────────────────
const OrdersAPI = {
  getOrders:     (params = {})  => api.get('/orders?' + new URLSearchParams(params)),
  getById:       (id)           => api.get(`/orders/${id}`),
  placeOrder:    (data)         => api.post('/orders', data),
  updateStatus:  (id, status)   => api.patch(`/orders/${id}/status`, { Status: status }),
  cancelOrder:   (id)           => api.delete(`/orders/${id}`),
  getStats:      ()             => api.get('/orders/stats'),
};

// ── Favorites API ──────────────────────────────────────────────────────
const FavoritesAPI = {
  getAll:  ()   => api.get('/favorites'),
  getIds:  ()   => api.get('/favorites/ids'),
  toggle:  (id) => api.post(`/favorites/${id}`, {}),
};

// ── Vouchers API ───────────────────────────────────────────────────────
const VouchersAPI = {
  validate: (code, amount) => api.post('/vouchers/validate', { Code: code, OrderAmount: amount }),
  getAll:   ()             => api.get('/vouchers'),
  create:   (data)         => api.post('/vouchers', data),
  update:   (id, data)     => api.put(`/vouchers/${id}`, data),
  delete:   (id)           => api.delete(`/vouchers/${id}`),
};

// ── Admin Users API ────────────────────────────────────────────────────
const AdminUsersAPI = {
  getAll:       (role = '') => api.get(`/admin/users?role=${role}`),
  toggleActive: (id)        => api.patch(`/admin/users/${id}/toggle-active`, {}),
  setRole:      (id, role)  => api.patch(`/admin/users/${id}/role`, { Role: role }),
};
