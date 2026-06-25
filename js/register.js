// ── Register ──
document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('registerForm');
  const alertEl = document.getElementById('regAlert');

  // ── Глазики показать/скрыть пароль ──
  function setupToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', () => {
      const isPass = inp.type === 'password';
      inp.type = isPass ? 'text' : 'password';
      btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  }
  setupToggle('togglePass',  'regPassword');
  setupToggle('togglePass2', 'regPassword2');

  let isRegistering = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isRegistering) return;
    isRegistering = true;

    const submitBtn   = form.querySelector('[type="submit"]') || form.querySelector('button');
    const origBtnText = submitBtn ? submitBtn.innerHTML : '';

    const username = document.getElementById('regUsername').value.trim();
    const email    = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const password2= document.getElementById('regPassword2').value;

    if (!username || username.length < 2) {
      showAlert('Введите никнейм (минимум 2 символа)', 'error'); isRegistering = false; return;
    }
    if (password !== password2) {
      showAlert('Пароли не совпадают', 'error'); isRegistering = false; return;
    }
    if (password.length < 6) {
      showAlert('Пароль должен содержать минимум 6 символов', 'error'); isRegistering = false; return;
    }

    // Проверка согласия с лицензией
    const licenseCheck = document.getElementById('licenseCheck');
    if (!licenseCheck || !licenseCheck.checked) {
      showAlert('Необходимо принять Лицензионное соглашение', 'error'); isRegistering = false; return;
    }
    const termsCheck = document.getElementById('termsCheck');
    if (!termsCheck || !termsCheck.checked) {
      showAlert('Необходимо принять Пользовательское соглашение', 'error'); isRegistering = false; return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...'; }

    // Проверяем уникальность — сначала кэш, потом API
    let users = DB.get('pl_users');
    if (!users.length) {
      try {
        const res = await fetch('/api/data?col=users');
        const data = await res.json();
        users = Array.isArray(data) ? data : [];
      } catch(e) { users = []; }
    }

    if (users.find(u => (u.username || '').toLowerCase() === username.toLowerCase())) {
      showAlert('Такой никнейм уже занят', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
      isRegistering = false; return;
    }
    if (users.find(u => u.email === email)) {
      showAlert('Этот email уже зарегистрирован', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
      isRegistering = false; return;
    }

    // Сохраняем пользователя в MongoDB
    let newUser = { username, email, password, role: 'user', joinedAt: new Date().toISOString() };
    try {
      const res = await fetch('/api/data?col=users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: 'user' })
      });
      const saved = await res.json();
      if (saved && saved.id) {
        newUser.id = saved.id;
        console.log('[REG] ✅ Пользователь создан, id=', newUser.id);
      }
    } catch(e) {
      console.warn('[REG] ⚠️ Ошибка создания пользователя:', e.message);
    }

    // Обновляем localStorage
    const allUsers = DB.get('pl_users');
    allUsers.push(newUser);
    lsSet('pl_users', allUsers);

    // Уведомление в Discord
    if (window.notifyNewUser) notifyNewUser(newUser);

    // Создаём игрока в MongoDB
    try {
      const res = await fetch('/api/data?col=players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nick: username, name: '', team: '', role: '',
          country: '', rating: 0, photo: null,
          user_id: newUser.id, kd: 0, hs: 0, wins: 0, matches: 0, adr: 0
        })
      });
      const pSaved = await res.json();
      if (pSaved && pSaved.id) {
        console.log('[REG] ✅ Игрок создан, id=', pSaved.id);
        const allPlayers = DB.get('pl_players');
        allPlayers.push({
          id: pSaved.id, nick: username, name: '', team: '', role: '',
          country: '', rating: 0, photo: '', userId: newUser.id,
          stats: { kd: 0, hs: 0, wins: 0, matches: 0, adr: 0 }
        });
        lsSet('pl_players', allPlayers);
      }
    } catch(e) {
      console.warn('[REG] ⚠️ Ошибка создания игрока:', e.message);
    }

    // Авто-логин
    const { password: _, ...safeUser } = newUser;
    Auth.login(safeUser);

    showAlert('Аккаунт создан! Переадресация...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1200);
  });

  function showAlert(msg, type) {
    alertEl.className = `alert alert-${type}`;
    alertEl.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
    alertEl.style.display = 'flex';
  }
});
