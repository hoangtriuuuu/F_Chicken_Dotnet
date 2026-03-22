/* ═══════════════════════════════════════════
   F-CHICKEN — Auth Pages
   ═══════════════════════════════════════════ */

// Attach phone validation when switching to register tab
function switchAuth(el, type) {
  if (type === 'register') setTimeout(() => attachPhoneValidation('regPhone'), 50);
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('loginForm')?.style.setProperty   ('display', type === 'login'    ? 'block' : 'none');
  document.getElementById('registerForm')?.style.setProperty('display', type === 'register' ? 'block' : 'none');
  document.getElementById('forgotForm')?.style.setProperty  ('display', type === 'forgot'   ? 'block' : 'none');
}

function showForgot() {
  document.querySelectorAll('#page-login .auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('loginForm')?.style.setProperty   ('display', 'none');
  document.getElementById('registerForm')?.style.setProperty('display', 'none');
  document.getElementById('forgotForm')?.style.setProperty  ('display', 'block');
}

async function doLogin() {
  const email = document.getElementById('loginEmail')?.value?.trim();
  const pwd   = document.getElementById('loginPwd')?.value;
  if (!email || !pwd) { toast('Vui long nhap email va mat khau', 'info'); return; }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dang dang nhap...'; }

  const res = await AuthAPI.login(email, pwd);

  if (btn) { btn.disabled = false; btn.textContent = 'Dang nhap'; }

  if (res?.Success) {
    Auth.login(res.Data.Token, {
      Id: res.Data.UserId, FullName: res.Data.FullName,
      Email: res.Data.Email, Role: res.Data.Role
    });
    await CartState.init();
    toast(`Chao mung tro lai, ${res.Data.FullName.split(' ').pop()}!`, 'success');
    goto('home');
  } else {
    toast(res?.Message || 'Dang nhap that bai', 'error');
  }
}

async function doRegister() {
  const name  = document.getElementById('regName')?.value?.trim();
  const phone = document.getElementById('regPhone')?.value?.trim();
  const email = document.getElementById('regEmail')?.value?.trim();
  const pwd   = document.getElementById('regPwd')?.value;

  if (!name || !email || !pwd) { toast('Vui long nhap day du thong tin', 'info'); return; }
  if (phone && !validatePhone(phone)) { toast('So dien thoai khong dung dinh dang (10 so, bat dau bang 0)', 'info'); return; }
  if (pwd.length < 6)          { toast('Mat khau toi thieu 6 ky tu', 'info'); return; }

  const btn = document.getElementById('registerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dang xu ly...'; }

  const res = await AuthAPI.register({ FullName: name, Phone: phone, Email: email, Password: pwd });

  if (btn) { btn.disabled = false; btn.textContent = 'Tao tai khoan'; }

  if (res?.Success) {
    Auth.login(res.Data.Token, {
      Id: res.Data.UserId, FullName: res.Data.FullName,
      Email: res.Data.Email, Role: res.Data.Role
    });
    await CartState.init();
    toast('Dang ky thanh cong! Chao mung ban den F-Chicken!', 'success');
    goto('home');
  } else {
    toast(res?.Message || 'Dang ky that bai', 'error');
  }
}

async function doForgotPassword() {
  const email = document.getElementById('forgotEmail')?.value?.trim();
  if (!email) { toast('Vui long nhap email', 'info'); return; }

  const res = await AuthAPI.forgotPassword(email);
  if (res?.Success) {
    toast('Kiem tra email cua ban!', 'success');
    // Demo: show token
    if (res.Data?.token) {
      document.getElementById('resetTokenDemo').textContent = res.Data.token;
      document.getElementById('resetTokenBox')?.style.removeProperty('display');
    }
  }
}

async function doResetPassword() {
  const token = document.getElementById('resetToken')?.value?.trim();
  const pwd   = document.getElementById('resetPwd')?.value;
  if (!token || !pwd) { toast('Vui long nhap day du', 'info'); return; }

  const res = await AuthAPI.resetPassword(token, pwd);
  if (res?.Success) {
    toast('Doi mat khau thanh cong! Vui long dang nhap lai.', 'success');
    switchAuth(document.querySelector('.auth-tab'), 'login');
  } else {
    toast(res?.Message || 'Token khong hop le', 'error');
  }
}

function doLogout() {
  Auth.logout();
  toast('Da dang xuat', 'info');
  goto('home');
}
