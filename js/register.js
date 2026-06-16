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
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;

    if (password !== password2) {
      showAlert('Пароли не совпадают', 'error');
      return;
    }
    if (password.length < 6) {
      showAlert('Пароль должен содержать минимум 6 символов', 'error');
      return;
    }

    const users = DB.get('pl_users');
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showAlert('Такой никнейм уже занят', 'error');
      return;
    }
    if (users.find(u => u.email === email)) {
      showAlert('Этот email уже зарегистрирован', 'error');
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
      if (inserted[0]) {
        newUser.id = inserted[0].id; // реальный Supabase ID
        console.log('[REG] ✅ Пользователь сохранён, id=', newUser.id);
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
      if (pInserted[0]) {
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
