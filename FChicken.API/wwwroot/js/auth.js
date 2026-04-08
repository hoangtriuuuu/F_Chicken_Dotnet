/* ═══════════════════════════════════════════
   F-CHICKEN — Auth State
   ═══════════════════════════════════════════ */
const Auth = {
  _user: null,
  _token: null,

  init() {
    this._token = localStorage.getItem('fc_token');
    const u = localStorage.getItem('fc_user');
    if (u) try { this._user = JSON.parse(u); } catch { }
    this._updateUI();
  },

  login(token, user) {
    this._token = token;
    this._user = user;
    localStorage.setItem('fc_token', token);
    localStorage.setItem('fc_user', JSON.stringify(user));
    this._updateUI();
  },

  logout() {
    this._token = null;
    this._user = null;
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    this._updateUI();
    CartState.clear();
  },

  getToken() { return this._token; },
  getUser() { return this._user; },
  isLoggedIn() { return !!this._token; },
  isAdmin() {
    return this._user?.Role?.toLowerCase() === 'admin'
      || this._user?.role?.toLowerCase() === 'admin';
  },
  isUser() { return this._user?.Role?.toLowerCase() === 'user' || this._user?.role?.toLowerCase() === 'user'; },

  _updateUI() {
    const user = this._user;
    const loggedIn = !!user;

    const btnLogin = document.getElementById('btnLogin');
    const btnProfile = document.getElementById('btnProfile');
    const btnAdmin = document.getElementById('nav-admin');
    const mBtnAdmin = document.getElementById('mnav-admin');

    if (btnLogin) btnLogin.style.display = loggedIn ? 'none' : 'flex';
    if (btnProfile) btnProfile.style.display = loggedIn ? 'flex' : 'none';

    const showAdmin = loggedIn && this.isAdmin();
    if (btnAdmin) btnAdmin.style.display = showAdmin ? 'flex' : 'none';
    if (mBtnAdmin) mBtnAdmin.style.display = showAdmin ? 'block' : 'none';

    const userNameEl = document.getElementById('headerUserName');
    if (userNameEl && user) userNameEl.textContent = user.FullName?.split(' ').pop() ?? '';
  }
};
