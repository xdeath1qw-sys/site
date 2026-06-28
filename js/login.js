// ── Login ──
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const alert = document.getElementById('loginAlert');
  const togglePass = document.getElementById('togglePass');
  const passInput = document.getElementById('loginPassword');

  // If already logged in — redirect
  if (Auth && Auth.current()) {
    window.location.href = 'index.html';
    return;
  }

  if (togglePass && passInput) {
    togglePass.addEventListener('click', () => {
      const type = passInput.type === 'password' ? 'text' : 'password';
      passInput.type = type;
      togglePass.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const users = DB.get('pl_users');
    const user = users.find(u => (u.username === username || u.email === username) && u.password === password);

    if (!user) {
      showAlert('Неверный логин или пароль', 'error');
      return;
    }

    // Проверка согласия с лицензией
    const licenseCheck = document.getElementById('licenseCheck');
    if (!licenseCheck || !licenseCheck.checked) {
      showAlert('Необходимо принять Лицензионное соглашение', 'error');
      return;
    }
    const termsCheck = document.getElementById('termsCheck');
    if (!termsCheck || !termsCheck.checked) {
      showAlert('Необходимо принять Пользовательское соглашение', 'error');
      return;
    }

    // Save session (without password)
    const { password: _, ...safeUser } = user;
    Auth.login(safeUser);

    showAlert('Вход выполнен! Переадресация...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  });

  function showAlert(msg, type) {
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
    alert.style.display = 'flex';
  }
});
