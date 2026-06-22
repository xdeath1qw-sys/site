// ── Admin Panel ──
document.addEventListener('DOMContentLoaded', () => {
  // Access control
  const user = Auth.current();
  if (!user || user.role !== 'admin') {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);flex-direction:column;gap:20px;padding:20px;text-align:center">
        <i class="fas fa-lock" style="font-size:4rem;color:var(--danger)"></i>
        <h2 style="color:var(--text)">Доступ запрещён</h2>
        <p style="color:var(--text-muted)">Эта страница только для администраторов</p>
        <a href="login.html" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Войти</a>
      </div>`;
    return;
  }

  // Sidebar navigation
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
    });
  });

  // ── Переменные состояния (объявляем до любых рендеров) ──
  let _usersSearchQuery = '';

  whenDbReady(() => {
    updateDashboard();
    renderTeamsTable();
    renderNewsTable();
    renderUsersTable();
    renderMatchesTable();
    renderTournamentsTable();
  });

  // Перерендерим когда Supabase вернул свежие данные
  window.addEventListener('db-updated', () => {
    updateDashboard();
    renderTeamsTable();
    renderNewsTable();
    renderUsersTable();
    renderMatchesTable();
    renderTournamentsTable();
  });

  document.getElementById('deleteAllUsersBtn').addEventListener('click', async () => {
    if (!confirm('Удалить ВСЕХ игроков (кроме администраторов)?\n\nЭто действие нельзя отменить!')) return;

    const btn = document.getElementById('deleteAllUsersBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';

    const users = DB.get('pl_users');
    const toDelete = users.filter(u => u.role !== 'admin');

    // Удаляем из MongoDB через API
    for (const u of toDelete) {
      if (!u.id) continue;
      try {
        await apiFetch('players', { method: 'DELETE', id: u.id });
      } catch(e) { console.warn('[ADMIN] ⚠️ Ошибка удаления игрока:', e.message); }
      try {
        await apiFetch('users', { method: 'DELETE', id: u.id });
      } catch(e) { console.warn('[ADMIN] ⚠️ Ошибка удаления пользователя:', e.message); }
    }

    // Оставляем только админов в localStorage
    const admins = users.filter(u => u.role === 'admin');
    lsSet('pl_users', admins);
    lsSet('pl_players', []);

    // Сбрасываем КД у команд (удаляем все команды тоже — они без игроков)
    // Снимаем teamDeletedAt у всех оставшихся
    const cleanAdmins = admins.map(u => ({ ...u, teamDeletedAt: null, teamId: null, team: '' }));
    lsSet('pl_users', cleanAdmins);

    renderUsersTable();
    updateDashboard();

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-trash-alt"></i> Удалить всех';
    showToast('Все игроки удалены', 'error');
  });

  // ──────────────────────────────────
  // TEAMS
  // ──────────────────────────────────
  let teamLogoData = '';
  let editingTeamId = null;

  document.getElementById('addTeamBtn').addEventListener('click', () => {
    editingTeamId = null;
    document.getElementById('teamFormTitle').textContent = 'Добавить команду';
    clearTeamForm();
    toggleForm('teamForm', true);
  });
  document.getElementById('cancelTeamBtn').addEventListener('click', () => toggleForm('teamForm', false));

  setupFileUpload('teamLogoArea', 'teamLogo', 'teamLogoPreview', 'teamLogoImg', 'removeTeamLogo', (data) => { teamLogoData = data; });

  document.getElementById('saveTeamBtn').addEventListener('click', async () => {
    const name        = document.getElementById('teamName').value.trim();
    const tier        = parseInt(document.getElementById('teamTier').value);
    const country     = document.getElementById('teamCountry').value.trim();
    const rating      = parseInt(document.getElementById('teamRating').value) || 0;
    const description = document.getElementById('teamDescription').value.trim();
    const matches     = parseInt(document.getElementById('teamMatches').value) || 0;
    const wins        = parseInt(document.getElementById('teamWins').value) || 0;
    const losses      = parseInt(document.getElementById('teamLosses').value) || 0;

    if (!name) { showToast('Введите название команды', 'error'); return; }

    const btn = document.getElementById('saveTeamBtn');
    btn.disabled = true;

    if (editingTeamId !== null) {
      const changes = { name, tier, country, rating, description, matches, wins, losses };
      if (teamLogoData) changes.logo = teamLogoData;
      await DB.update('pl_teams', editingTeamId, changes);
      showToast('Команда обновлена');
    } else {
      const newTeam = { name, tier, country, rating, description, logo: teamLogoData, matches, wins, losses, createdAt: new Date().toISOString() };
      await DB.insert('pl_teams', newTeam);
      showToast('Команда добавлена');
    }

    btn.disabled = false;
    toggleForm('teamForm', false);
    renderTeamsTable();
    updateDashboard();
  });

  function clearTeamForm() {
    ['teamName','teamCountry','teamRating','teamDescription','teamMatches','teamWins','teamLosses'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('teamTier').value = '1';
    document.getElementById('teamEditId').value = '';
    teamLogoData = '';
    document.getElementById('teamLogoPreview').style.display = 'none';
  }

  function renderTeamsTable() {
    const tbody = document.getElementById('teamsTableBody');
    const teams = DB.get('pl_teams');
    if (!teams.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:30px">Нет команд</td></tr>`; return; }
    tbody.innerHTML = teams.map(t => `
      <tr>
        <td>${t.logo ? `<img src="${t.logo}" class="admin-table-logo" alt="" />` : `<div class="admin-table-logo-placeholder">${t.name.substring(0,2).toUpperCase()}</div>`}</td>
        <td><strong>${t.name}</strong></td>
        <td><span class="tier-badge tier-${t.tier}">Tier ${t.tier}</span></td>
        <td>${t.country || '—'}</td>
        <td>${t.rating || 0}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="manageTeamRoster('${t.id}', '${t.name.replace(/'/g, "\\'")}')"><i class="fas fa-users"></i></button>
            <button class="btn btn-sm btn-outline" onclick="editTeam('${t.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteTeam('${t.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.editTeam = (id) => {
    const teams = DB.get('pl_teams');
    const t = teams.find(x => String(x.id) === String(id));
    if (!t) return;
    editingTeamId = id;
    document.getElementById('teamFormTitle').textContent = 'Редактировать команду';
    document.getElementById('teamName').value        = t.name;
    document.getElementById('teamTier').value        = t.tier;
    document.getElementById('teamCountry').value     = t.country || '';
    document.getElementById('teamRating').value      = t.rating || '';
    document.getElementById('teamDescription').value = t.description || '';
    document.getElementById('teamMatches').value     = t.matches || '';
    document.getElementById('teamWins').value        = t.wins || '';
    document.getElementById('teamLosses').value      = t.losses || '';
    teamLogoData = t.logo || '';
    if (t.logo) {
      document.getElementById('teamLogoImg').src = t.logo;
      document.getElementById('teamLogoPreview').style.display = 'flex';
    } else {
      document.getElementById('teamLogoPreview').style.display = 'none';
    }
    toggleForm('teamForm', true);
    document.getElementById('teamForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteTeam = async (id) => {
    if (!confirm('Удалить команду?')) return;
    await DB.remove('pl_teams', id);
    renderTeamsTable();
    updateDashboard();
    showToast('Команда удалена', 'error');
  };

  // ──────────────────────────────────
  // NEWS
  // ──────────────────────────────────
  let newsImageData = '';
  let editingNewsId = null;

  document.getElementById('addNewsBtn').addEventListener('click', () => {
    editingNewsId = null;
    document.getElementById('newsFormTitle').textContent = 'Добавить новость';
    clearNewsForm();
    toggleForm('newsForm', true);
  });
  document.getElementById('cancelNewsBtn').addEventListener('click', () => toggleForm('newsForm', false));

  setupFileUpload('newsImageArea', 'newsImage', 'newsImagePreview', 'newsImageImg', 'removeNewsImage', (data) => { newsImageData = data; });

  document.getElementById('saveNewsBtn').addEventListener('click', async () => {
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    if (!title || !content) { showToast('Заполните заголовок и текст', 'error'); return; }

    const btn = document.getElementById('saveNewsBtn');
    btn.disabled = true;

    if (editingNewsId !== null) {
      const newsList = DB.get('pl_news');
      const existing = newsList.find(n => n.id === editingNewsId);
      const changes = {
        title,
        excerpt: document.getElementById('newsExcerpt').value.trim(),
        content,
        image: newsImageData || (existing ? existing.image : ''),
        category: document.getElementById('newsCategory').value
      };
      await DB.update('pl_news', editingNewsId, changes);
      showToast('Новость обновлена');
    } else {
      const news = {
        title,
        excerpt: document.getElementById('newsExcerpt').value.trim(),
        content,
        image: newsImageData,
        category: document.getElementById('newsCategory').value,
        createdAt: new Date().toISOString()
      };
      await DB.insert('pl_news', news);
      showToast('Новость опубликована');
    }

    btn.disabled = false;
    toggleForm('newsForm', false);
    renderNewsTable();
    updateDashboard();
  });

  function clearNewsForm() {
    ['newsTitle','newsExcerpt','newsContent'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('newsCategory').value = 'general';
    newsImageData = '';
    document.getElementById('newsImagePreview').style.display = 'none';
  }

  function renderNewsTable() {
    const tbody = document.getElementById('newsTableBody');
    const catLabels = { general: 'Общее', tournament: 'Турниры', teams: 'Команды', players: 'Игроки' };
    const newsList = DB.get('pl_news').slice().reverse();
    if (!newsList.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:30px">Нет новостей</td></tr>`; return; }
    tbody.innerHTML = newsList.map(n => {
      const d = new Date(n.createdAt || n.date).toLocaleDateString('ru-RU');
      return `
      <tr>
        <td>${n.image ? `<img src="${n.image}" class="admin-table-logo" alt="" style="border-radius:6px;width:50px;height:36px;object-fit:cover" />` : '<i class="fas fa-image" style="color:var(--text-dim)"></i>'}</td>
        <td style="max-width:250px"><strong>${n.title}</strong></td>
        <td><span class="news-cat cat-${n.category}" style="position:static;display:inline-block;font-size:0.72rem">${catLabels[n.category]}</span></td>
        <td>${d}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="editNews('${n.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteNews('${n.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  window.editNews = (id) => {
    const newsList = DB.get('pl_news');
    const n = newsList.find(x => String(x.id) === String(id));
    if (!n) return;
    editingNewsId = id;
    document.getElementById('newsFormTitle').textContent = 'Редактировать новость';
    document.getElementById('newsTitle').value = n.title;
    document.getElementById('newsExcerpt').value = n.excerpt || '';
    document.getElementById('newsContent').value = n.content || '';
    document.getElementById('newsCategory').value = n.category || 'general';
    newsImageData = n.image || '';
    if (n.image) {
      document.getElementById('newsImageImg').src = n.image;
      document.getElementById('newsImagePreview').style.display = 'flex';
    } else {
      document.getElementById('newsImagePreview').style.display = 'none';
    }
    // Switch to news panel
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="news"]').classList.add('active');
    document.getElementById('panel-news').classList.add('active');
    toggleForm('newsForm', true);
    document.getElementById('newsForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteNews = async (id) => {
    if (!confirm('Удалить новость?')) return;
    await DB.remove('pl_news', id);
    renderNewsTable();
    updateDashboard();
    showToast('Новость удалена', 'error');
  };

  // ──────────────────────────────────
  // USERS
  // ──────────────────────────────────

  // Поиск
  const usersSearchInput = document.getElementById('usersSearch');
  if (usersSearchInput) {
    usersSearchInput.addEventListener('input', () => {
      _usersSearchQuery = usersSearchInput.value.trim().toLowerCase();
      renderUsersTable();
    });
  }

  function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    let players = DB.get('pl_players');
    const users = DB.get('pl_users');

    // Фильтрация по поиску
    if (_usersSearchQuery) {
      players = players.filter(p => {
        const user = users.find(u => String(u.id) === String(p.userId) || (u.username || '').toLowerCase() === (p.nick || '').toLowerCase());
        return (p.nick || '').toLowerCase().includes(_usersSearchQuery) ||
               (p.team || '').toLowerCase().includes(_usersSearchQuery) ||
               (user?.email || '').toLowerCase().includes(_usersSearchQuery);
      });
    }

    if (!players.length) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:30px">${_usersSearchQuery ? 'Ничего не найдено' : 'Нет игроков'}</td></tr>`; return; }
    tbody.innerHTML = players.map((p, i) => {
      const user = users.find(u => String(u.id) === String(p.userId) || (u.username || '').toLowerCase() === (p.nick || '').toLowerCase());
      const isIgl = user?.role === 'igl';
      const isAdmin = user?.role === 'admin';
      const kd = p.stats?.kd ?? p.kd ?? null;
      const kdColor = kd !== null ? (parseFloat(kd) >= 1 ? 'var(--success)' : 'var(--danger)') : 'var(--text-dim)';
      const photo = p.photo || user?.avatar || '';
      const email = user?.email || '—';
      const joinedAt = user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '—';
      const teamName = p.team || '—';
      const uid = user?.id ?? null;
      return `
      <tr>
        <td>${i + 1}</td>
        <td>
          ${photo ? `<img src="${photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px" />` : `<i class="fas fa-user-circle" style="color:var(--text-dim);margin-right:8px;font-size:1.1rem;vertical-align:middle"></i>`}
          <strong>${p.nick}</strong>
          ${isIgl ? `<span style="font-size:0.72rem;color:var(--warning);margin-left:6px;font-weight:600">👑 IGL</span>` : ''}
        </td>
        <td style="font-size:0.82rem">${email}</td>
        <td>${teamName !== '—' ? `<span style="color:var(--primary);font-weight:600">${teamName}</span>` : '<span style="color:var(--text-dim)">—</span>'}</td>
        <td style="white-space:nowrap">
          <span style="font-weight:700;color:${kdColor}">${kd !== null ? parseFloat(kd).toFixed(2) : '—'}</span>
        </td>
        <td>${joinedAt}</td>
        <td>
          <div class="action-btns">
            ${!isAdmin && uid ? `
              <button class="btn btn-sm btn-outline" onclick="openStatsEditor('${uid}')" title="Редактировать K/D" style="color:var(--accent);border-color:var(--accent)"><i class="fas fa-chart-bar"></i></button>
              ${isIgl
                ? `<button class="btn btn-sm btn-outline" onclick="setUserRole('${uid}', 'user')" title="Снять IGL" style="color:var(--warning);border-color:var(--warning)"><i class="fas fa-crown"></i></button>`
                : `<button class="btn btn-sm btn-outline" onclick="setUserRole('${uid}', 'igl')" title="Назначить IGL"><i class="fas fa-crown"></i></button>`
              }
              <button class="btn btn-sm btn-danger" onclick="deleteUser('${uid}')"><i class="fas fa-trash"></i></button>
            ` : isAdmin ? '<span style="color:var(--text-dim);font-size:0.8rem">Администратор</span>' : '<span style="color:var(--text-dim);font-size:0.8rem">—</span>'}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Редактор статистики игрока ──────────────────────────────
  window.openStatsEditor = (userId) => {
    const users   = DB.get('pl_users');
    const players = DB.get('pl_players');
    const user    = users.find(u => String(u.id) === String(userId));
    if (!user) return;
    const player  = players.find(p => String(p.userId) === String(userId) || (p.nick || '').toLowerCase() === (user.username || '').toLowerCase());

    const kd = parseFloat(player?.stats?.kd ?? player?.kd ?? 0).toFixed(2);

    document.getElementById('statsModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'statsModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999';
    modal.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;width:90%;max-width:320px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
          <h3 style="margin:0;font-size:1.05rem">
            <i class="fas fa-chart-bar" style="color:var(--accent);margin-right:8px"></i>K/D — <span style="color:var(--primary)">${user.username}</span>
          </h3>
          <button onclick="document.getElementById('statsModal').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;padding:4px"><i class="fas fa-times"></i></button>
        </div>
        <div>
          <label style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;display:block">K/D коэффициент</label>
          <input id="se_kd" type="number" step="0.01" min="0" max="99" value="${kd}"
            style="width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:1.1rem;box-sizing:border-box;font-weight:700" />
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button id="se_saveBtn" class="btn btn-primary" style="flex:1" onclick="savePlayerStats('${userId}')">
            <i class="fas fa-save"></i> Сохранить
          </button>
          <button class="btn btn-outline" style="flex:1" onclick="document.getElementById('statsModal').remove()">
            <i class="fas fa-times"></i> Отмена
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('se_kd').focus();
    document.getElementById('se_kd').select();
  };

  window.savePlayerStats = async (userId) => {
    const kd = parseFloat(document.getElementById('se_kd').value) || 0;

    const btn = document.getElementById('se_saveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохраняем...';

    const users   = DB.get('pl_users');
    const user    = users.find(u => String(u.id) === String(userId));
    const players = DB.get('pl_players');
    const pi = players.findIndex(p =>
      String(p.userId) === String(userId) ||
      (p.nick || '').toLowerCase() === (user?.username || '').toLowerCase()
    );

    if (pi !== -1) {
      players[pi].stats = { ...players[pi].stats, kd };
      players[pi].kd    = kd;
      lsSet('pl_players', players);

      const pid = players[pi].id;
      if (pid) {
        try {
          await DB.update('pl_players', pid, { kd, stats: players[pi].stats });
        } catch(e) { console.warn('[STATS] ⚠️', e.message); }
      }
    } else {
      showToast('Игрок не найден', 'error');
    }

    document.getElementById('statsModal')?.remove();
    renderUsersTable();
    showToast(`K/D ${user?.username} сохранён`);
  };

  window.setUserRole = async (id, role) => {
    const label = role === 'igl' ? 'назначить капитаном (IGL)' : 'снять роль IGL';
    if (!confirm(`${label}?`)) return;
    const users = DB.get('pl_users');
    const idx = users.findIndex(u => String(u.id) === String(id));
    if (idx === -1) return;

    if (role === 'user' && users[idx].teamId) {
      const teamId = users[idx].teamId;
      const teams = DB.get('pl_teams').filter(t => String(t.id) !== String(teamId));
      lsSet('pl_teams', teams);
      await DB.remove('pl_teams', teamId).catch(() => {});
      users[idx].teamId = null;
    }

    users[idx].role = role;
    lsSet('pl_users', users);

    await DB.update('pl_users', String(id), { role, teamId: users[idx].teamId || null }).catch(e => console.warn('[ADMIN]', e.message));

    const cur = Auth.current();
    if (cur && String(cur.id) === String(id)) { const { password: _, ...safe } = users[idx]; Auth.login(safe); }

    renderUsersTable();
    showToast(role === 'igl' ? '👑 Роль IGL назначена' : 'Роль IGL снята');
  };

  window.deleteUser = async (id) => {
    if (!confirm('Удалить пользователя?')) return;

    const users = DB.get('pl_users');
    const user = users.find(u => String(u.id) === String(id));

    lsSet('pl_users', users.filter(u => String(u.id) !== String(id)));

    if (user) {
      const players = DB.get('pl_players');
      const playerToDelete = players.find(p =>
        String(p.userId) === String(id) ||
        (p.nick || '').toLowerCase() === (user.username || '').toLowerCase()
      );
      lsSet('pl_players', players.filter(p =>
        String(p.userId) !== String(id) &&
        (p.nick || '').toLowerCase() !== (user.username || '').toLowerCase()
      ));

      if (playerToDelete?.id) {
        await DB.remove('pl_players', String(playerToDelete.id)).catch(e => console.warn('[DB] ⚠️', e.message));
      }
    }

    renderUsersTable();
    updateDashboard();
    showToast('Пользователь удалён', 'error');

    await DB.remove('pl_users', String(id)).catch(e => console.warn('[DB] ⚠️', e.message));
  };

  // ──────────────────────────────────
  // MATCHES
  // ──────────────────────────────────
  let editingMatchId = null;

  document.getElementById('addMatchBtn').addEventListener('click', () => {
    editingMatchId = null;
    document.getElementById('matchFormTitle').textContent = 'Добавить матч';
    clearMatchForm();
    populateMatchTeams();
    toggleForm('matchForm', true);
  });
  document.getElementById('cancelMatchBtn').addEventListener('click', () => toggleForm('matchForm', false));

  document.getElementById('saveMatchBtn').addEventListener('click', async () => {
    const team1      = document.getElementById('matchTeam1').value;
    const team2      = document.getElementById('matchTeam2').value;
    const tournament = document.getElementById('matchTournament').value.trim();
    const score1     = parseInt(document.getElementById('matchScore1').value) || 0;
    const score2     = parseInt(document.getElementById('matchScore2').value) || 0;
    const date       = document.getElementById('matchDate').value;
    const status     = document.getElementById('matchStatus').value;
    const url        = document.getElementById('matchUrl').value.trim();

    if (!team1 || !team2 || team1 === team2) { showToast('Выберите разные команды', 'error'); return; }
    if (!tournament) { showToast('Введите название турнира', 'error'); return; }

    const btn = document.getElementById('saveMatchBtn');
    btn.disabled = true;

    const match = { team1, team2, score1, score2, tournament, date: date ? new Date(date).toISOString() : new Date().toISOString(), status, url };
    if (editingMatchId !== null) {
      await DB.update('pl_matches', editingMatchId, match);
      showToast('Матч обновлён');
    } else {
      await DB.insert('pl_matches', match);
      showToast('Матч добавлен');
    }
    btn.disabled = false;
    toggleForm('matchForm', false);
    renderMatchesTable();
  });

  function clearMatchForm() {
    document.getElementById('matchScore1').value = '0';
    document.getElementById('matchScore2').value = '0';
    document.getElementById('matchTournament').value = '';
    document.getElementById('matchDate').value = '';
    document.getElementById('matchStatus').value = 'upcoming';
    document.getElementById('matchUrl').value = '';
    document.getElementById('matchEditId').value = '';
  }

  // Кнопка копирования ссылки
  document.getElementById('copyMatchUrlBtn').addEventListener('click', () => {
    const url = document.getElementById('matchUrl').value.trim();
    if (!url) { showToast('Введите ссылку', 'error'); return; }
    navigator.clipboard.writeText(url).then(() => {
      showToast('Ссылка скопирована');
      const btn = document.getElementById('copyMatchUrlBtn');
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
    });
  });

  function populateMatchTeams() {
    const teams = DB.get('pl_teams');
    ['matchTeam1','matchTeam2'].forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">— Выберите команду —</option>';
      teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = t.name;
        sel.appendChild(opt);
      });
    });
  }

  function renderMatchesTable() {
    const tbody = document.getElementById('matchesTableBody');
    const matches = DB.get('pl_matches').slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    if (!matches.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:30px">Матчей нет</td></tr>`;
      return;
    }
    const statusLabels = { upcoming: 'Предстоящий', finished: 'Завершён' };
    const statusColors = { upcoming: 'var(--accent)', finished: 'var(--success)' };
    tbody.innerHTML = matches.map(m => {
      const d = new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <tr>
          <td><strong>${m.team1}</strong></td>
          <td style="text-align:center;font-weight:700;font-size:1rem">${m.status === 'upcoming' ? '—' : `${m.score1} : ${m.score2}`}</td>
          <td><strong>${m.team2}</strong></td>
          <td style="max-width:180px;font-size:0.82rem">${m.tournament}</td>
          <td style="font-size:0.82rem">${d}</td>
          <td><span style="color:${statusColors[m.status]};font-size:0.8rem;font-weight:600">${statusLabels[m.status] || m.status}</span></td>
          <td>
            <div class="action-btns">
              ${m.url ? `<a href="${m.url}" target="_blank" class="btn btn-sm btn-outline" title="Открыть на xplay"><i class="fas fa-external-link-alt"></i></a>` : ''}
              <button class="btn btn-sm btn-outline" onclick="editMatch('${m.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteMatch('${m.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  window.editMatch = (id) => {
    const matches = DB.get('pl_matches');
    const m = matches.find(x => String(x.id) === String(id));
    if (!m) return;
    editingMatchId = id;
    document.getElementById('matchFormTitle').textContent = 'Редактировать матч';
    clearMatchForm();
    populateMatchTeams();
    document.getElementById('matchTeam1').value    = m.team1;
    document.getElementById('matchTeam2').value    = m.team2;
    document.getElementById('matchScore1').value   = m.score1;
    document.getElementById('matchScore2').value   = m.score2;
    document.getElementById('matchTournament').value = m.tournament;
    document.getElementById('matchStatus').value   = m.status;
    document.getElementById('matchUrl').value      = m.url || '';
    if (m.date) {
      const d = new Date(m.date);
      const pad = n => String(n).padStart(2,'0');
      document.getElementById('matchDate').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    // Switch to matches panel
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="matches"]').classList.add('active');
    document.getElementById('panel-matches').classList.add('active');
    toggleForm('matchForm', true);
    document.getElementById('matchForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteMatch = async (id) => {
    if (!confirm('Удалить матч?')) return;
    await DB.remove('pl_matches', id);
    renderMatchesTable();
    showToast('Матч удалён', 'error');
  };

  // ──────────────────────────────────
  // TOURNAMENTS
  // ──────────────────────────────────
  let tournamentImageData = '';
  let editingTournamentId = null;

  // Турниры теперь через DB (Supabase), убираем localStorage-хелперы
  function getStoredTournaments() { return DB.get('pl_tournaments'); }

  document.getElementById('addTournamentBtn').addEventListener('click', () => {
    editingTournamentId = null;
    document.getElementById('tournamentFormTitle').textContent = 'Добавить турнир';
    clearTournamentForm();
    toggleForm('tournamentForm', true);
    document.getElementById('tournamentForm').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('cancelTournamentBtn').addEventListener('click', () => toggleForm('tournamentForm', false));

  setupFileUpload('tournamentImageArea', 'tournamentImage', 'tournamentImagePreview', 'tournamentImageImg', 'removeTournamentImage', (data) => { tournamentImageData = data; });

  document.getElementById('saveTournamentBtn').addEventListener('click', async () => {
    const name = document.getElementById('tournamentName').value.trim();
    if (!name) { showToast('Введите название турнира', 'error'); return; }

    const btn = document.getElementById('saveTournamentBtn');
    btn.disabled = true;

    const existing = editingTournamentId ? getStoredTournaments().find(t => t.id === editingTournamentId) : null;
    const entry = {
      name,
      status:      document.getElementById('tournamentStatus').value,
      prize:       document.getElementById('tournamentPrize').value.trim() || '—',
      format:      document.getElementById('tournamentFormat').value.trim() || '—',
      teams:       parseInt(document.getElementById('tournamentTeams').value) || 0,
      location:    document.getElementById('tournamentLocation').value.trim() || 'Online',
      dateStart:   document.getElementById('tournamentDateStart').value || '',
      dateEnd:     document.getElementById('tournamentDateEnd').value || '',
      description: document.getElementById('tournamentDesc').value.trim() || '',
      banner:      tournamentImageData || (existing ? existing.banner || existing.image : '')
    };

    if (editingTournamentId !== null) {
      await DB.update('pl_tournaments', editingTournamentId, entry);
      showToast('Турнир обновлён');
    } else {
      entry.createdAt = new Date().toISOString();
      await DB.insert('pl_tournaments', entry);
      showToast('Турнир добавлен');
    }

    btn.disabled = false;
    toggleForm('tournamentForm', false);
    renderTournamentsTable();
    updateDashboard();
  });

  function clearTournamentForm() {
    ['tournamentName','tournamentPrize','tournamentFormat','tournamentTeams',
     'tournamentLocation','tournamentDateStart','tournamentDateEnd','tournamentDesc'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('tournamentStatus').value = 'upcoming';
    document.getElementById('tournamentEditId').value = '';
    tournamentImageData = '';
    document.getElementById('tournamentImagePreview').style.display = 'none';
    document.getElementById('tournamentImageImg').src = '';
  }

  function renderTournamentsTable() {
    const tbody = document.getElementById('tournamentsTableBody');
    if (!tbody) return;
    const list = DB.get('pl_tournaments');

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:30px">Нет турниров</td></tr>`;
      return;
    }

    const statusLabels = { upcoming: 'Предстоящий', ongoing: 'Идёт сейчас', finished: 'Завершён' };
    const statusColors = { upcoming: '#FFB300', ongoing: 'var(--success)', finished: 'var(--text-muted)' };

    const fmtDate = str => str ? new Date(str).toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'numeric' }) : '—';

    tbody.innerHTML = list.map(t => `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td><span style="color:${statusColors[t.status]||'var(--text-muted)'};font-weight:600;font-size:0.82rem">${statusLabels[t.status] || t.status}</span></td>
        <td style="color:#FFB300;font-weight:600">${t.prize || '—'}</td>
        <td style="font-size:0.82rem">${t.format || '—'}</td>
        <td style="font-size:0.82rem">${fmtDate(t.dateStart)}</td>
        <td style="font-size:0.82rem">${fmtDate(t.dateEnd)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="editTournament('${t.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger"  onclick="deleteTournament('${t.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.editTournament = (id) => {
    const list = getStoredTournaments();
    const t = list.find(x => String(x.id) === String(id));
    if (!t) return;
    editingTournamentId = id;
    document.getElementById('tournamentFormTitle').textContent = 'Редактировать турнир';
    document.getElementById('tournamentName').value      = t.name;
    document.getElementById('tournamentStatus').value    = t.status;
    document.getElementById('tournamentPrize').value     = t.prize || '';
    document.getElementById('tournamentFormat').value    = t.format || '';
    document.getElementById('tournamentTeams').value     = t.teams || '';
    document.getElementById('tournamentLocation').value  = t.location || '';
    document.getElementById('tournamentDateStart').value = t.dateStart || '';
    document.getElementById('tournamentDateEnd').value   = t.dateEnd || '';
    document.getElementById('tournamentDesc').value      = t.description || '';
    tournamentImageData = t.banner || t.image || '';
    if (t.image) {
      document.getElementById('tournamentImageImg').src = t.image;
      document.getElementById('tournamentImagePreview').style.display = 'flex';
    } else {
      document.getElementById('tournamentImagePreview').style.display = 'none';
    }
    toggleForm('tournamentForm', true);
    // Switch to tournaments panel
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="tournaments"]').classList.add('active');
    document.getElementById('panel-tournaments').classList.add('active');
    document.getElementById('tournamentForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteTournament = async (id) => {
    if (!confirm('Удалить турнир?')) return;
    await DB.remove('pl_tournaments', id);
    renderTournamentsTable();
    updateDashboard();
    showToast('Турнир удалён', 'error');
  };

  // ──────────────────────────────────
  // HIGHLIGHTS
  // ──────────────────────────────────
  let hlThumbData  = '';
  let hlAvatarData = '';
  let editingHlId  = null;

  function getHL() {
    try {
      const raw = localStorage.getItem('pl_highlights');
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
    } catch (_) {}
    return [];
  }
  function saveHL(list) { localStorage.setItem('pl_highlights', JSON.stringify(list)); }

  renderHighlightsTable();

  document.getElementById('addHighlightBtn').addEventListener('click', () => {
    editingHlId = null;
    document.getElementById('highlightFormTitle').textContent = 'Добавить хайлайт';
    clearHlForm();
    toggleForm('highlightForm', true);
    document.getElementById('highlightForm').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('cancelHighlightBtn').addEventListener('click', () => toggleForm('highlightForm', false));

  setupFileUpload('hlThumbArea',  'hlThumbFile',  'hlThumbPreview',  'hlThumbImg',  'removeHlThumb',  (data) => { hlThumbData  = data; });
  setupFileUpload('hlAvatarArea', 'hlAvatarFile', 'hlAvatarPreview', 'hlAvatarImg', 'removeHlAvatar', (data) => { hlAvatarData = data; });

  document.getElementById('saveHighlightBtn').addEventListener('click', () => {
    const nick  = document.getElementById('hlNick').value.trim();
    const kd    = document.getElementById('hlKd').value.trim();
    const video = document.getElementById('hlVideo').value.trim();
    if (!nick || !kd || !video) { showToast('Заполните ник, K/D и путь к видео', 'error'); return; }

    const list     = getHL();
    const existing = editingHlId ? list.find(h => h.id === editingHlId) : null;
    const entry = {
      id:     editingHlId || ('h' + Date.now()),
      nick,
      kd,
      label:  document.getElementById('hlLabel').value.trim() || 'Топ хайлайт',
      video,
      thumb:  hlThumbData  || (existing ? existing.thumb  : ''),
      avatar: hlAvatarData || (existing ? existing.avatar : '')
    };

    if (editingHlId !== null) {
      const idx = list.findIndex(h => h.id === editingHlId);
      if (idx !== -1) list[idx] = entry;
    } else {
      list.push(entry);
    }
    saveHL(list);
    toggleForm('highlightForm', false);
    renderHighlightsTable();
    showToast(editingHlId ? 'Хайлайт обновлён' : 'Хайлайт добавлен');
  });

  function clearHlForm() {
    ['hlNick','hlKd','hlLabel','hlVideo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    hlThumbData  = '';
    hlAvatarData = '';
    document.getElementById('hlThumbPreview').style.display  = 'none';
    document.getElementById('hlThumbImg').src                = '';
    document.getElementById('hlAvatarPreview').style.display = 'none';
    document.getElementById('hlAvatarImg').src               = '';
    document.getElementById('hlEditId').value = '';
  }

  function renderHighlightsTable() {
    const tbody = document.getElementById('highlightsTableBody');
    if (!tbody) return;
    const list = getHL();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:30px">Нет хайлайтов</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(h => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            ${h.avatar
              ? `<img src="${h.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);flex-shrink:0" />`
              : `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:0.8rem;flex-shrink:0">${(h.nick||'?').charAt(0).toUpperCase()}</div>`
            }
            ${h.thumb
              ? `<img src="${h.thumb}" style="width:64px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--border)" />`
              : `<div style="width:64px;height:36px;border-radius:6px;background:var(--bg-secondary);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-dim)"><i class="fas fa-film"></i></div>`
            }
          </div>
        </td>
        <td><strong>${h.nick}</strong></td>
        <td><span style="color:var(--accent);font-weight:700">${h.kd}</span></td>
        <td style="color:var(--text-muted);font-size:0.82rem">${h.label || '—'}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.video}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="editHighlight('${h.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger"  onclick="deleteHighlight('${h.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.editHighlight = (id) => {
    const list = getHL();
    const h = list.find(x => String(x.id) === String(id));
    if (!h) return;
    editingHlId = id;
    document.getElementById('highlightFormTitle').textContent = 'Редактировать хайлайт';
    document.getElementById('hlNick').value  = h.nick;
    document.getElementById('hlKd').value    = h.kd;
    document.getElementById('hlLabel').value = h.label || '';
    document.getElementById('hlVideo').value = h.video;

    // thumb
    hlThumbData = h.thumb || '';
    if (h.thumb) { document.getElementById('hlThumbImg').src = h.thumb; document.getElementById('hlThumbPreview').style.display = 'flex'; }
    else { document.getElementById('hlThumbPreview').style.display = 'none'; }

    // avatar
    hlAvatarData = h.avatar || '';
    if (h.avatar) { document.getElementById('hlAvatarImg').src = h.avatar; document.getElementById('hlAvatarPreview').style.display = 'flex'; }
    else { document.getElementById('hlAvatarPreview').style.display = 'none'; }

    // Switch panel
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="highlights"]').classList.add('active');
    document.getElementById('panel-highlights').classList.add('active');
    toggleForm('highlightForm', true);
    document.getElementById('highlightForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteHighlight = (id) => {
    if (!confirm('Удалить хайлайт?')) return;
    saveHL(getHL().filter(h => String(h.id) !== String(id)));
    renderHighlightsTable();
    showToast('Хайлайт удалён', 'error');
  };

  // ──────────────────────────────────
  // HELPERS
  // ──────────────────────────────────
  function updateDashboard() {
    document.getElementById('statTeams').textContent = DB.get('pl_teams').length;
    document.getElementById('statPlayers').textContent = DB.get('pl_players').length;
    document.getElementById('statNews').textContent = DB.get('pl_news').length;
    document.getElementById('statTournaments').textContent = getStoredTournaments().length;
  }

  function toggleForm(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
  }

  function setupFileUpload(areaId, inputId, previewId, imgId, removeId, onLoad) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);
    const removeBtn = document.getElementById(removeId);

    if (!area || !input) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = 'var(--primary)'; });
    area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) processFile(file);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) processFile(input.files[0]);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        onLoad('');
        preview.style.display = 'none';
        img.src = '';
        input.value = '';
      });
    }

    function processFile(file) {
      // Показываем превью сразу локально
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
        preview.style.display = 'flex';
      };
      reader.readAsDataURL(file);

      // Загружаем на ImgBB
      img.style.opacity = '0.5';
      uploadFileToImgBB(file).then(url => {
        img.src = url;
        img.style.opacity = '1';
        onLoad(url);
        console.log('[IMGBB] ✅ Загружено:', url);
      }).catch(e => {
        img.style.opacity = '1';
        console.error('[IMGBB] ❌', e.message);
        showToast('Ошибка загрузки изображения', 'error');
        onLoad('');
      });
    }
  }

  // ──────────────────────────────────
  // AWARDS
  // ──────────────────────────────────
  function getAwards() {
    try { return JSON.parse(localStorage.getItem('pl_awards')) || []; } catch(_) { return []; }
  }
  function saveAwards(list) { localStorage.setItem('pl_awards', JSON.stringify(list)); }

  let editingAwardId = null;
  let awardImageData = '';

  renderAwardsTable();

  // Загрузка фото награды
  const awardImageArea  = document.getElementById('awardImageArea');
  const awardImageInput = document.getElementById('awardImageInput');
  const awardImagePreview = document.getElementById('awardImagePreview');
  const awardImageImg   = document.getElementById('awardImageImg');

  awardImageArea.addEventListener('click', () => awardImageInput.click());
  awardImageInput.addEventListener('change', async () => {
    const file = awardImageInput.files[0];
    if (!file) return;
    // Превью сразу
    const reader = new FileReader();
    reader.onload = e => {
      awardImageImg.src = e.target.result;
      awardImagePreview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
    // Загрузка на ImgBB
    awardImageImg.style.opacity = '0.5';
    try {
      awardImageData = await uploadFileToImgBB(file);
      awardImageImg.src = awardImageData;
      console.log('[IMGBB] ✅ Награда загружена:', awardImageData);
    } catch(e) {
      console.error('[IMGBB] ❌', e.message);
      showToast('Ошибка загрузки изображения', 'error');
      awardImageData = '';
    } finally {
      awardImageImg.style.opacity = '1';
    }
  });
  document.getElementById('removeAwardImage').addEventListener('click', () => {
    awardImageData = '';
    awardImagePreview.style.display = 'none';
    awardImageInput.value = '';
  });

  // Заполняем список получателей при смене типа
  function populateAwardRecipients() {
    const type = document.getElementById('awardTarget').value;
    const sel = document.getElementById('awardRecipient');
    sel.innerHTML = '';
    if (type === 'player') {
      DB.get('pl_players').forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.nick || p.name;
        opt.textContent = `${p.nick || p.name}${p.team ? ' — ' + p.team : ''}`;
        sel.appendChild(opt);
      });
    } else {
      DB.get('pl_teams').forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = t.name;
        sel.appendChild(opt);
      });
    }
  }

  document.getElementById('awardTarget').addEventListener('change', populateAwardRecipients);

  document.getElementById('addAwardBtn').addEventListener('click', () => {
    editingAwardId = null;
    awardImageData = '';
    document.getElementById('awardFormTitle').textContent = 'Добавить награду';
    document.getElementById('awardName').value = '';
    document.getElementById('awardColor').value = 'gold';
    document.getElementById('awardTarget').value = 'player';
    document.getElementById('awardDesc').value = '';
    document.getElementById('awardDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('awardEditId').value = '';
    document.getElementById('awardCount').value = '1';
    document.getElementById('awardImagePreview').style.display = 'none';
    document.getElementById('awardImageImg').src = '';
    awardImageInput.value = '';
    populateAwardRecipients();
    toggleForm('awardForm', true);
  });

  document.getElementById('cancelAwardBtn').addEventListener('click', () => toggleForm('awardForm', false));

  document.getElementById('saveAwardBtn').addEventListener('click', () => {
    const name      = document.getElementById('awardName').value.trim();
    const color     = document.getElementById('awardColor').value;
    const target    = document.getElementById('awardTarget').value;
    const recipient = document.getElementById('awardRecipient').value;
    const desc      = document.getElementById('awardDesc').value.trim();
    const date      = document.getElementById('awardDate').value;
    const count     = parseInt(document.getElementById('awardCount').value) || 1;

    if (!name || !recipient) { showToast('Заполните название и получателя', 'error'); return; }
    if (!awardImageData && editingAwardId === null) { showToast('Добавьте изображение награды', 'error'); return; }

    const list = getAwards();
    const existing = editingAwardId ? list.find(a => a.id === editingAwardId) : null;

    if (editingAwardId !== null) {
      // Редактирование одной существующей награды
      const entry = {
        id: editingAwardId,
        name,
        image: awardImageData || (existing ? existing.image : ''),
        color, target, recipient, desc, date
      };
      const idx = list.findIndex(a => a.id === editingAwardId);
      if (idx !== -1) list[idx] = entry;
      saveAwards(list);
      DB.update('pl_awards', String(editingAwardId), entry).catch(e => console.warn('[AWARDS] update:', e.message));
      showToast('Награда обновлена');
    } else {
      // Создание N копий награды
      const imageToUse = awardImageData;
      const newEntries = [];
      for (let i = 0; i < count; i++) {
        newEntries.push({
          id: Date.now() + i,
          name, image: imageToUse, color, target, recipient, desc, date
        });
      }
      newEntries.forEach(entry => {
        list.push(entry);
        DB.insert('pl_awards', entry).catch(e => console.warn('[AWARDS] insert:', e.message));
      });
      saveAwards(list);
      showToast(count > 1 ? `Выдано ${count} наград!` : 'Награда выдана!');
    }
    toggleForm('awardForm', false);
    renderAwardsTable();
    showToast(editingAwardId !== null ? 'Награда обновлена' : 'Награда выдана!');
  });

  function renderAwardsTable() {
    const tbody = document.getElementById('awardsTableBody');
    if (!tbody) return;
    const list = getAwards();
    const colorLabels = { gold: '🥇 Золото', silver: '🥈 Серебро', bronze: '🥉 Бронза', primary: '💜', accent: '💙' };
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:30px">Наград пока нет</td></tr>`;
      return;
    }
    tbody.innerHTML = list.slice().reverse().map(a => {
      const iconHTML = a.image
        ? `<img src="${a.image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px">`
        : `<i class="fas fa-medal" style="font-size:1.3rem;color:#FFB300"></i>`;
      const d = a.date ? new Date(a.date).toLocaleDateString('ru-RU') : '—';
      return `
        <tr>
          <td>${iconHTML}</td>
          <td><strong>${a.name}</strong>${a.desc ? `<br><span style="font-size:0.75rem;color:var(--text-muted)">${a.desc}</span>` : ''}</td>
          <td><strong>${a.recipient}</strong></td>
          <td><span style="font-size:0.78rem;color:var(--text-muted)">${a.target === 'player' ? '👤 Игрок' : '🛡️ Команда'}</span></td>
          <td style="font-size:0.82rem">${d}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-outline" onclick="editAward('${a.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteAward('${a.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  window.editAward = (id) => {
    const a = getAwards().find(x => String(x.id) === String(id));
    if (!a) return;
    editingAwardId = id;
    awardImageData = a.image || '';
    document.getElementById('awardFormTitle').textContent = 'Редактировать награду';
    document.getElementById('awardName').value    = a.name;
    document.getElementById('awardColor').value   = a.color;
    document.getElementById('awardTarget').value  = a.target;
    document.getElementById('awardDesc').value    = a.desc || '';
    document.getElementById('awardDate').value    = a.date || '';
    document.getElementById('awardEditId').value  = a.id;
    if (a.image) {
      awardImageImg.src = a.image;
      awardImagePreview.style.display = 'flex';
    } else {
      awardImagePreview.style.display = 'none';
    }
    populateAwardRecipients();
    document.getElementById('awardRecipient').value = a.recipient;
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="awards"]').classList.add('active');
    document.getElementById('panel-awards').classList.add('active');
    toggleForm('awardForm', true);
    document.getElementById('awardForm').scrollIntoView({ behavior: 'smooth' });
  };

  window.deleteAward = (id) => {
    if (!confirm('Удалить награду?')) return;
    saveAwards(getAwards().filter(a => String(a.id) !== String(id)));
    DB.remove('pl_awards', String(id)).catch(e => console.warn('[AWARDS] remove:', e.message));
    renderAwardsTable();
    showToast('Награда удалена', 'error');
  };

  // ──────────────────────────────────
  // TEAM ROSTER MANAGEMENT
  // ──────────────────────────────────
  let currentRosterTeamId = null;
  let currentRosterTeamName = '';

  window.manageTeamRoster = function(teamId, teamName) {
    currentRosterTeamId = teamId;
    currentRosterTeamName = teamName;
    document.getElementById('rosterModalTitle').innerHTML = `<i class="fas fa-users"></i> Управление составом: ${teamName}`;
    renderRosterList();
    populateRosterUserSelect();
    document.getElementById('rosterModal').style.display = 'flex';
  };

  window.closeRosterModal = function() {
    document.getElementById('rosterModal').style.display = 'none';
    currentRosterTeamId = null;
    currentRosterTeamName = '';
  };

  function renderRosterList() {
    const list = document.getElementById('rosterCurrentList');
    const players = DB.get('pl_players').filter(p => p.team === currentRosterTeamName);
    const users = DB.get('pl_users');
    const teams = DB.get('pl_teams');
    const team = teams.find(t => t.id === currentRosterTeamId);
    
    // Находим капитана (IGL) команды
    const captain = team && team.ownerId ? users.find(u => u.id === team.ownerId) : null;
    const captainNick = captain ? captain.username : null;
    
    const items = [];
    
    // Добавляем капитана первым (отдельная карточка с короной, без кнопки удаления)
    if (captain) {
      items.push(`
        <div class="roster-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.35);border-radius:8px">
          ${captain.avatar ? `<img src="${captain.avatar}" style="width:40px;height:40px;object-fit:cover;border-radius:50%;border:2px solid var(--warning)">` : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">${captain.username.charAt(0).toUpperCase()}</div>`}
          <div style="flex:1">
            <div style="font-weight:700">${captain.username}</div>
            <div style="font-size:0.75rem;color:#f59e0b"><i class="fas fa-crown"></i> IGL — Капитан команды</div>
          </div>
        </div>`);
    }
    
    // Добавляем остальных игроков (пропускаем капитана чтобы не дублировать)
    players.forEach(p => {
      if (captainNick && p.nick === captainNick) return; // пропускаем IGL
      items.push(`
        <div class="roster-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px">
          ${p.photo ? `<img src="${p.photo}" style="width:40px;height:40px;object-fit:cover;border-radius:50%">` : `<div style="width:40px;height:40px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">${p.nick.charAt(0).toUpperCase()}</div>`}
          <div style="flex:1">
            <div style="font-weight:600">${p.nick}</div>
            ${p.role ? `<div style="font-size:0.75rem;color:var(--text-muted)">${p.role}</div>` : ''}
          </div>
          <button class="btn btn-sm btn-danger" onclick="removePlayerFromRoster('${p.nick.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button>
        </div>`);
    });
    
    if (items.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет игроков в команде</div>';
    } else {
      list.innerHTML = items.join('');
    }
  }

  function populateRosterUserSelect() {
    const select = document.getElementById('rosterUserSelect');
    const users = DB.get('pl_users');
    const players = DB.get('pl_players');
    const teams = DB.get('pl_teams');
    const currentTeam = teams.find(t => String(t.id) === String(currentRosterTeamId));

    select.innerHTML = '<option value="">— Выберите пользователя —</option>';

    users.forEach(u => {
      // Пропускаем только администраторов
      if (u.role === 'admin') return;

      // Пропускаем капитана текущей команды (он уже в составе)
      if (currentTeam && String(currentTeam.ownerId) === String(u.id)) return;

      // Пропускаем тех, кто уже в этой команде
      const alreadyInTeam = players.find(p =>
        (p.nick || '').toLowerCase() === (u.username || '').toLowerCase() &&
        p.team === currentRosterTeamName
      );
      if (alreadyInTeam) return;

      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.username} (${u.email})${u.role === 'igl' ? ' 👑 IGL' : ''}`;
      select.appendChild(opt);
    });
  }

  window.addUserToTeamRoster = function() {
    const userId = document.getElementById('rosterUserSelect').value;
    if (!userId) {
      showToast('Выберите пользователя', 'error');
      return;
    }
    
    const users = DB.get('pl_users');
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
      showToast('Пользователь не найден', 'error');
      return;
    }
    
    const players = DB.get('pl_players');
    
    // Проверяем, есть ли уже игрок с таким ником
    let player = players.find(p => p.nick === user.username);
    
    if (player) {
      // Игрок существует - обновляем его команду
      if (player.team && player.team !== currentRosterTeamName) {
        if (!confirm(`${player.nick} уже в команде "${player.team}". Перевести в "${currentRosterTeamName}"?`)) {
          return;
        }
      }
      player.team = currentRosterTeamName;
    } else {
      // Создаем нового игрока
      player = {
        id: Date.now(),
        nick: user.username,
        name: user.username,
        team: currentRosterTeamName,
        photo: user.avatar || '',
        role: user.role === 'igl' ? 'IGL' : '',
        country: '',
        rating: 0,
        stats: { kd: 0, hs: 0, adr: 0, matches: 0, wins: 0 }
      };
      players.push(player);
    }
    
    DB.set('pl_players', players);
    showToast(`${user.username} добавлен в команду`);
    renderRosterList();
    populateRosterUserSelect();
  };

  window.removePlayerFromRoster = function(playerNick) {
    if (!confirm(`Удалить ${playerNick} из команды?`)) return;
    
    const players = DB.get('pl_players');
    const player = players.find(p => p.nick === playerNick && p.team === currentRosterTeamName);
    
    if (player) {
      player.team = '';
      DB.set('pl_players', players);
      showToast(`${playerNick} удалён из команды`);
      renderRosterList();
      populateRosterUserSelect();
    }
  };

  // ──────────────────────────────────
  // VETO
  // ──────────────────────────────────

  // Карты по умолчанию
  const VETO_DEFAULT_MAPS = [
    { name: 'Dust2',    status: 'available' },
    { name: 'Mirage',   status: 'available' },
    { name: 'Nuke',     status: 'available' },
    { name: 'Ancient',  status: 'available' },
    { name: 'Inferno',  status: 'available' },
    { name: 'Overpass', status: 'available' },
    { name: 'Anubis',   status: 'available' },
  ];

  function generateVetoStepsLocal(format) {
    if (format === 'bo1') {
      return [
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
      ];
    }
    if (format === 'bo3') {
      return [
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'pick' },
        { turn: 'team2', action: 'pick' },
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
      ];
    }
    if (format === 'bo5') {
      return [
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'pick' },
        { turn: 'team2', action: 'pick' },
        { turn: 'team1', action: 'pick' },
        { turn: 'team2', action: 'pick' },
      ];
    }
    return [];
  }

  // Находим капитанов команд
  function findCaptain(teamName) {
    const users = DB.get('pl_users');
    const teams = DB.get('pl_teams');
    const team = teams.find(t => t.name === teamName);
    if (team && team.ownerId) {
      const u = users.find(u => u.id === team.ownerId);
      if (u) return u.id;
    }
    // fallback: ищем IGL с этой командой
    const igl = users.find(u => u.role === 'igl' && u.team === teamName);
    return igl ? igl.id : null;
  }

  // Заполняем список матчей
  function populateVetoMatchSelect() {
    const sel = document.getElementById('vetoMatchSelect');
    if (!sel) return;
    const matches = DB.get('pl_matches');
    sel.innerHTML = '<option value="">— Выберите матч —</option>';
    matches.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.team1} vs ${m.team2} — ${m.tournament || '?'}`;
      sel.appendChild(opt);
    });
  }

  function renderVetoTable() {
    const tbody = document.getElementById('vetoTableBody');
    if (!tbody) return;
    const vetos = DB.get('pl_vetos');
    if (!vetos.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:30px">Вето ещё не создано</td></tr>`;
      return;
    }
    const statusLabels = { waiting: 'Ожидание', active: 'Идёт вето', done: 'Завершено' };
    const statusColors = { waiting: 'var(--warning)', active: 'var(--accent)', done: 'var(--success)' };
    tbody.innerHTML = vetos.slice().reverse().map(v => {
      const d = v.createdAt ? new Date(v.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
      return `
        <tr>
          <td><strong>${v.team1}</strong> vs <strong>${v.team2}</strong></td>
          <td><span style="color:var(--primary);font-weight:700;font-size:0.85rem">${(v.format||'').toUpperCase()}</span></td>
          <td><span style="color:${statusColors[v.status]||'var(--text-muted)'};font-weight:600;font-size:0.82rem">${statusLabels[v.status] || v.status}</span></td>
          <td style="font-size:0.82rem;color:var(--text-muted)">${d}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-outline" onclick="openVeto('${v.id}')" title="Открыть страницу вето"><i class="fas fa-external-link-alt"></i></button>
              <button class="btn btn-sm btn-outline" onclick="copyVetoLink('${v.id}')" title="Скопировать ссылку"><i class="fas fa-link"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteVeto('${v.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  document.getElementById('addVetoBtn').addEventListener('click', () => {
    populateVetoMatchSelect();
    toggleForm('vetoForm', true);
  });

  document.getElementById('cancelVetoBtn').addEventListener('click', () => toggleForm('vetoForm', false));

  document.getElementById('saveVetoBtn').addEventListener('click', async () => {
    const matchId = parseInt(document.getElementById('vetoMatchSelect').value);
    const format  = document.getElementById('vetoFormat').value;

    if (!matchId) { showToast('Выберите матч', 'error'); return; }

    const match = DB.get('pl_matches').find(m => m.id === matchId);
    if (!match) { showToast('Матч не найден', 'error'); return; }

    const team1CaptainId = findCaptain(match.team1);
    const team2CaptainId = findCaptain(match.team2);

    const firstTeam = Math.random() < 0.5 ? 'team1' : 'team2';
    let steps = generateVetoStepsLocal(format);
    if (firstTeam === 'team2') {
      steps = steps.map(s => ({ ...s, turn: s.turn === 'team1' ? 'team2' : 'team1' }));
    }

    const firstStep = steps[0] || {};
    const firstTeamName = firstTeam === 'team1' ? match.team1 : match.team2;
    const createdAt = new Date().toISOString();

    try {
      // Сохраняем через MongoDB API
      const veto = {
        matchId:        matchId,
        team1:          match.team1,
        team2:          match.team2,
        tournament:     match.tournament || '',
        team1CaptainId: team1CaptainId,
        team2CaptainId: team2CaptainId,
        format:         format,
        status:         'waiting',
        currentTurn:    firstStep.turn || 'team1',
        action:         firstStep.action || 'ban',
        maps:           JSON.parse(JSON.stringify(VETO_DEFAULT_MAPS)),
        pickedMaps:     [],
        bannedMaps:     [],
        log:            [],
        steps:          steps,
        currentStep:    0,
        createdAt:      createdAt,
        startedAt:      null,
        finishedAt:     null,
      };

      const saved = await DB.insert('pl_vetos', veto);
      console.log(`[DB] ✅ Вето создано в MongoDB, ID: ${saved.id}`);

      toggleForm('vetoForm', false);
      renderVetoTable();
      showToast(`Вето создано! Первым банит: ${firstTeamName}`);
    } catch(e) {
      console.error('[DB] ❌ Ошибка создания вето:', e.message);
      showToast('Ошибка создания вето', 'error');
    }
  });

  window.openVeto = function(id) {
    window.open(`veto.html?id=${id}`, '_blank');
  };

  window.copyVetoLink = function(id) {
    const url = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}veto.html?id=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Ссылка скопирована');
    }).catch(() => {
      showToast('Не удалось скопировать', 'error');
    });
  };

  window.deleteVeto = async function(id) {
    if (!confirm('Удалить вето?')) return;

    // Удаляем через MongoDB API (localStorage + сервер)
    await DB.remove('pl_vetos', id);
    renderVetoTable();
    showToast('Вето удалено', 'error');
    console.log(`[DB] 🗑️ Вето ${id} удалено из MongoDB`);
  };

  renderVetoTable();
});
