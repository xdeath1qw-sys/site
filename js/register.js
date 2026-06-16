// ── Register ──
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const alertEl = document.getElementById('regAlert');
  const togglePass = document.getElementById('togglePass');
  const passInput = document.getElementById('regPassword');

  if (togglePass && passInput) {
    togglePass.addEventListener('click', () => {
      const type = passInput.type === 'password' ? 'text' : 'password';
      passInput.type = type;
      togglePass.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button');
    const origBtnText = submitBtn ? submitBtn.innerHTML : '';

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;

    if (!username || username.length < 2) {
      showAlert('Введите никнейм (минимум 2 символа)', 'error'); return;
    }
    if (password !== password2) {
      showAlert('Пароли не совпадают', 'error'); return;
    }
    if (password.length < 6) {
      showAlert('Пароль должен содержать минимум 6 символов', 'error'); return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...'; }

    // Если БД ещё грузится — ждём максимум 5 секунд
    if (!window._dbReady) {
      showAlert('Подключение к базе данных...', 'success');
      await new Promise(resolve => {
        const t = setTimeout(resolve, 5000);
        const check = setInterval(() => {
          if (window._dbReady) { clearInterval(check); clearTimeout(t); resolve(); }
        }, 100);
      });
    }

    const users = DB.get('pl_users');
    if (users.find(u => (u.username || '').toLowerCase() === username.toLowerCase())) {
      showAlert('Такой никнейм уже занят', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
      return;
    }
    if (users.find(u => u.email === email)) {
      showAlert('Этот email уже зарегистрирован', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
      return;
    }

    const newUser = {
      id: Date.now(),
      username,
      email,
      password,
      role: 'user',
      joinedAt: new Date().toISOString()
    };

    // Сохраняем пользователя напрямую в Supabase
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: 'user'
        })
      });
      const inserted = await res.json();
      if (inserted && inserted[0]) {
        newUser.id = inserted[0].id;
        console.log('[REG] ✅ Пользователь сохранён, id=', newUser.id);
      } else {
        // Возможно ошибка уникальности — проверим
        const errText = JSON.stringify(inserted);
        if (errText.includes('unique') || errText.includes('duplicate') || errText.includes('23505')) {
          showAlert('Такой никнейм или email уже существует', 'error');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
          return;
        }
      }
    } catch(e) {
      console.warn('[REG] ⚠️ Ошибка сохранения пользователя:', e.message);
    }

    users.push(newUser);
    lsSet('pl_users', users);

    // Уведомление в Discord о новом пользователе
    if (window.notifyNewUser) notifyNewUser(newUser);

    // Создаём игрока напрямую в Supabase
    try {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          nick: username,
          name: '',
          team: '',
          role: '',
          country: '',
          rating: 0,
          photo: null,
          user_id: newUser.id,
          kd: 0, hs: 0, wins: 0, matches: 0, adr: 0
        })
      });
      const pInserted = await pRes.json();
      if (pInserted && pInserted[0]) {
        console.log('[REG] ✅ Игрок создан, id=', pInserted[0].id);
        const players = DB.get('pl_players');
        players.push({
          id: pInserted[0].id,
          nick: username,
          name: '',
          team: '',
          role: '',
          country: '',
          rating: 0,
          photo: '',
          userId: newUser.id,
          stats: { kd: 0, hs: 0, wins: 0, matches: 0, adr: 0 }
        });
        lsSet('pl_players', players);
      }
    } catch(e) {
      console.warn('[REG] ⚠️ Ошибка создания игрока:', e.message);
    }

    // Auto login
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
