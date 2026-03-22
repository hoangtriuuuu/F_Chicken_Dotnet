/* ═══════════════════════════════════════════
   F-CHICKEN — Auth State
   ═══════════════════════════════════════════ */
const Auth = {
  _user:  null,
  _token: null,

  init() {
    this._token = localStorage.getItem('fc_token');
    const u = localStorage.getItem('fc_user');
    if (u) try { this._user = JSON.parse(u); } catch {}
    this._updateUI();
  },

  login(token, user) {
    this._token = token;
    this._user  = user;
    localStorage.setItem('fc_token', token);
    localStorage.setItem('fc_user', JSON.stringify(user));
    this._updateUI();
  },

  logout() {
    this._token = null;
    this._user  = null;
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    this._updateUI();
    CartState.clear();
  },

  getToken()    { return this._token; },
  getUser()     { return this._user; },
  isLoggedIn()  { return !!this._token; },
  isAdmin()     { return this._user?.Role === 'Admin'; },
  isUser()      { return this._user?.Role === 'User'; },

  _updateUI() {
    const user = this._user;
    const loggedIn = !!user;

    // Header buttons
    const btnLogin   = document.getElementById('btnLogin');
    const btnProfile = document.getElementById('btnProfile');
    const btnAdmin   = document.getElementById('navAdmin');

    if (btnLogin)   btnLogin.style.display   = loggedIn ? 'none' : 'flex';
    if (btnProfile) btnProfile.style.display = loggedIn ? 'flex' : 'none';

    // Show admin nav only for admins
    if (btnAdmin) btnAdmin.style.display = (loggedIn && this.isAdmin()) ? 'flex' : 'none';

    // Sync mobile admin button
    const mBtnAdmin = document.getElementById('mnav-admin');
    if (mBtnAdmin) mBtnAdmin.style.display = (loggedIn && this.isAdmin()) ? 'block' : 'none';

    // User avatar / name in header
    const userNameEl = document.getElementById('headerUserName');
    if (userNameEl && user) userNameEl.textContent = user.FullName.split(' ').pop();
  }
};
