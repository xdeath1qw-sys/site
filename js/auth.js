// ── Auth helpers ──
const Auth = {
  current() {
    try {
      // Проверяем localStorage (работает между вкладками)
      const data = localStorage.getItem('pl_current');
      return data ? JSON.parse(data) : null;
    }
    catch { return null; }
  },
  login(user) {
    localStorage.setItem('pl_current', JSON.stringify(user));
    localStorage.removeItem('pl_session_backup');
  },
  logout() {
    localStorage.removeItem('pl_current');
    localStorage.removeItem('pl_session_backup');
  },
  isAdmin() { const u = this.current(); return u && u.role === 'admin'; }
};

// Init nav UI
(function () {
  const user = Auth.current();
  const authBtns = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  const userAvatarNav = document.getElementById('userAvatarNav');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    if (authBtns) authBtns.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';

      // ── Колокольчик — вставляем ПЕРЕД userMenu, не внутри ──
      const bell = document.createElement('div');
      bell.id = 'navBell';
      bell.className = 'nav-bell';
      bell.innerHTML = `<i class="fas fa-bell"></i><span class="nav-bell-badge" id="navBellBadge" style="display:none"></span>`;
      bell.title = 'Уведомления';

      const dropdown = document.createElement('div');
      dropdown.className = 'nav-bell-dropdown';
      dropdown.id = 'navBellDropdown';
      dropdown.innerHTML = `<div class="nav-bell-title"><i class="fas fa-bell"></i> Приглашения</div><div id="navBellList"></div>`;
      bell.appendChild(dropdown);

      // Вставляем колокольчик перед userMenu (снаружи от него)
      userMenu.parentNode.insertBefore(bell, userMenu);

      // Открытие/закрытие — только клик на колокольчик
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.nav-bell-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) {
          dropdown.classList.add('open');
          renderBellInvites(user, dropdown);
        }
      });

      document.addEventListener('click', () => {
        dropdown.classList.remove('open');
      });

      updateBellBadge(user);
      setInterval(() => updateBellBadge(user), 5000);
    }

    if (userAvatarNav) {
      if (user.avatar) {
        userAvatarNav.innerHTML = `<img src="${user.avatar}" alt="avatar" />`;
      } else {
        userAvatarNav.innerHTML = `<span style="font-size:0.85rem;font-weight:700;color:#fff">${user.username.charAt(0).toUpperCase()}</span>`;
      }

      // Click to toggle dropdown
      const dropdown = document.getElementById('userDropdown');
      userAvatarNav.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown) dropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('open');
      });
      if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
      }
    }
  } else {
    if (authBtns) authBtns.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
      window.location.href = 'index.html';
    });
  }

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
})();

// ── Подсчёт и показ бейджа на колокольчике ──
function updateBellBadge(user) {
  const badge = document.getElementById('navBellBadge');
  if (!badge) return;
  const count = getPendingInvitesCount(user);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function getPendingInvitesCount(user) {
  const invites = DB.get('pl_invites').filter(inv =>
    inv.status === 'pending' && (
      inv.targetUserId === user.id ||
      inv.playerNick.toLowerCase() === user.username.toLowerCase()
    )
  ).length;

  // Добавляем непрочитанные уведомления о матчах
  const notifications = (DB.get('pl_notifications') || []).filter(n =>
    n.userId === user.id && !n.read
  ).length;

  return invites + notifications;
}

// ── Рендер приглашений в дропдауне колокольчика ──
function renderBellInvites(user, dropdown) {
  const list = document.getElementById('navBellList');
  if (!list) return;

  const invites = DB.get('pl_invites').filter(inv =>
    inv.status === 'pending' && (
      inv.targetUserId === user.id ||
      inv.playerNick.toLowerCase() === user.username.toLowerCase()
    )
  );

  // Получаем уведомления о матчах
  const matchNotifications = (DB.get('pl_notifications') || []).filter(n =>
    n.userId === user.id && !n.read
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const hasItems = invites.length > 0 || matchNotifications.length > 0;

  if (!hasItems) {
    list.innerHTML = `<div class="nav-bell-empty"><i class="fas fa-inbox"></i> Нет уведомлений</div>`;
    return;
  }

  let html = '';

  // Уведомления о матчах
  if (matchNotifications.length > 0) {
    html += matchNotifications.map(notif => {
      const icon = notif.type === 'match_urgent' ? '🚨' : notif.type === 'password_reset' ? '🔑' : '⚠️';
      const timeAgo = getTimeAgo(new Date(notif.createdAt));
      return `
        <div class="nav-bell-item ${notif.type === 'match_urgent' ? 'nav-bell-urgent' : notif.type === 'password_reset' ? 'nav-bell-password' : ''}">
          <div class="nav-bell-item-info" style="flex:1">
            <div class="nav-bell-item-team">${icon} <strong>${notif.title}</strong></div>
            <div class="nav-bell-item-meta">${notif.message}</div>
            ${notif.tournament ? `<div class="nav-bell-item-meta" style="font-size:0.7rem;opacity:0.8">${notif.tournament}</div>` : ''}
            <div class="nav-bell-item-meta" style="font-size:0.65rem;opacity:0.7">${timeAgo}</div>
          </div>
          <div class="nav-bell-item-btns">
            <button class="nav-bell-dismiss" data-id="${notif.id}" title="Отметить как прочитанное"><i class="fas fa-check"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Приглашения в команду
  if (invites.length > 0) {
    if (matchNotifications.length > 0) {
      html += `<div class="nav-bell-divider">Приглашения в команду</div>`;
    }
    html += invites.map(inv => `
      <div class="nav-bell-item">
        <div class="nav-bell-item-info">
          <div class="nav-bell-item-team"><i class="fas fa-shield-halved"></i> <strong>${inv.teamName}</strong></div>
          <div class="nav-bell-item-meta">от ${inv.captainNick}</div>
        </div>
        <div class="nav-bell-item-btns">
          <button class="nav-bell-accept" data-id="${inv.id}" data-team="${inv.teamName}"><i class="fas fa-check"></i></button>
          <button class="nav-bell-decline" data-id="${inv.id}"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `).join('');
  }

  list.innerHTML = html;

  // Отметить уведомление о матче как прочитанное
  list.querySelectorAll('.nav-bell-dismiss').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notifId = parseInt(btn.dataset.id);
      const notifications = DB.get('pl_notifications') || [];
      const idx = notifications.findIndex(n => n.id === notifId);
      if (idx !== -1) {
        notifications[idx].read = true;
        DB.set('pl_notifications', notifications);
      }
      updateBellBadge(user);
      renderBellInvites(user, dropdown);
    });
  });

  // Принять приглашение
  list.querySelectorAll('.nav-bell-accept').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const invId = parseInt(btn.dataset.id);
      const teamName = btn.dataset.team;

      const all = DB.get('pl_invites');
      const idx = all.findIndex(i => i.id === invId);
      if (idx !== -1) { all[idx].status = 'accepted'; DB.set('pl_invites', all); }

      // Обновляем игрока в базе по нику
      const players = DB.get('pl_players');
      const pi = players.findIndex(p => p.nick.toLowerCase() === user.username.toLowerCase());
      if (pi !== -1) { players[pi].team = teamName; DB.set('pl_players', players); }

      // Сохраняем команду в данных пользователя
      const users = DB.get('pl_users');
      const ui = users.findIndex(u => u.id === user.id);
      if (ui !== -1) {
        users[ui].team = teamName;
        DB.set('pl_users', users);
        const { password: _, ...safe } = users[ui];
        Auth.login(safe);
      }

      showToast(`Вы вступили в команду ${teamName}!`, 'success');
      updateBellBadge(user);
      renderBellInvites(user, dropdown);
    });
  });

  // Отклонить приглашение
  list.querySelectorAll('.nav-bell-decline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const invId = parseInt(btn.dataset.id);
      const all = DB.get('pl_invites');
      const idx = all.findIndex(i => i.id === invId);
      if (idx !== -1) { all[idx].status = 'declined'; DB.set('pl_invites', all); }
      showToast('Приглашение отклонено');
      updateBellBadge(user);
      renderBellInvites(user, dropdown);
    });
  });
}

// Вспомогательная функция для отображения времени
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'только что';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} д назад`;
}

// Toast notification
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Динамический футер — блок "Аккаунт" ──
(function () {
  const user = Auth.current();

  // Ищем блок "Аккаунт" в футере по заголовку h4
  document.querySelectorAll('.footer-links').forEach(block => {
    const h4 = block.querySelector('h4');
    if (!h4 || h4.textContent.trim() !== 'Аккаунт') return;

    const ul = block.querySelector('ul');
    if (!ul) return;

    if (user) {
      // Залогинен — показываем Профиль и Выйти
      ul.innerHTML = `
        <li><a href="profile.html">Профиль</a></li>
        <li><a href="#" id="footerLogoutBtn">Выйти</a></li>`;
      const logoutBtn = ul.querySelector('#footerLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          Auth.logout();
          window.location.href = 'index.html';
        });
      }
    } else {
      // Не залогинен — показываем Войти и Регистрация
      ul.innerHTML = `
        <li><a href="login.html">Войти</a></li>
        <li><a href="register.html">Регистрация</a></li>`;
    }
  });
})();
