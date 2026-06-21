// ── Profile Page ──
document.addEventListener('DOMContentLoaded', () => {
  whenDbReady(() => {
  const params     = new URLSearchParams(window.location.search);
  const viewUser   = params.get('user'); // ник игрока для просмотра

  // Если открываем чужой профиль
  if (viewUser) {
    const layout = document.getElementById('profileLayout');
    if (!layout) return;

    const players = DB.get('pl_players');
    const allUsers = DB.get('pl_users');

    // Ищем игрока по нику
    const linkedPlayer = players.find(p =>
      (p.nick || '').toLowerCase() === viewUser.toLowerCase()
    );

    // Ищем пользователя по нику
    const targetUser = allUsers.find(u =>
      u.username.toLowerCase() === viewUser.toLowerCase()
    );

    if (!linkedPlayer && !targetUser) {
      layout.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-user-slash"></i>
          <p>Игрок «${viewUser}» не найден</p>
          <a href="teams.html" class="btn btn-outline btn-sm" style="margin-top:14px">← Назад</a>
        </div>`;
      return;
    }

    // Создаём объект пользователя для рендера (только для просмотра)
    const fakeUser = targetUser
      ? (({ password: _, ...safe }) => safe)(targetUser)
      : { id: null, username: viewUser, email: '', role: 'user', avatar: linkedPlayer?.photo || '' };

    renderProfile(fakeUser, linkedPlayer, layout, true);
    return;
  }

  // Свой профиль
  const user = Auth.current();
  const layout = document.getElementById('profileLayout');
  if (!layout) return;

  if (!user) {
    layout.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fas fa-lock"></i>
        <p>Вы не вошли в аккаунт</p>
        <a href="login.html" class="btn btn-primary" style="margin-top:16px">Войти</a>
      </div>`;
    return;
  }

  const players = DB.get('pl_players');
  let linkedPlayer = null;
  if (user.linkedPlayerId) {
    linkedPlayer = players.find(p => p.id === user.linkedPlayerId);
  }
  if (!linkedPlayer) {
    linkedPlayer = players.find(p => p.nick.toLowerCase() === user.username.toLowerCase());
  }

  renderProfile(user, linkedPlayer, layout, false);
  }); // конец whenDbReady
}); // конец DOMContentLoaded

function renderProfile(user, player, layout, readOnly) {
  layout.className = 'player-profile-layout';

  const s = player ? (player.stats || {}) : {};
  const kd       = parseFloat(s.kd) || 0;
  const hs       = parseInt(s.hs) || 0;
  const adr      = parseFloat(s.adr) || 0;
  const winrate  = s.matches && s.wins ? Math.round(s.wins / s.matches * 100) : 0;

  // Photo
  const photoSrc = player?.photo || user.avatar || '';
  const photoHTML = photoSrc
    ? `<img src="${photoSrc}" alt="avatar" class="pp-photo" />`
    : `<div class="pp-photo pp-photo-placeholder">
         <span>${(player?.nick || user.username).charAt(0).toUpperCase()}</span>
       </div>`;

  // Info table rows
  const infoRows = [
    { label: 'Команда',  val: player?.team    || '—' },
    { label: 'Роль',     val: player?.role    || '—' },
    { label: 'Страна',   val: player?.country || '—' },
    { label: 'Матчей',   val: s.matches || '—' },
    { label: 'Побед',    val: s.wins    || '—' },
    { label: 'Winrate',  val: s.matches && s.wins ? Math.round(s.wins/s.matches*100)+'%' : '—' },
  ].map(r => `
    <div class="pp-info-row">
      <span class="pp-info-label">${r.label}</span>
      <span class="pp-info-val">${r.val}</span>
    </div>`).join('');

  // Skill bars removed — show only key stats
  const statItems = [
    { label: 'K/D Ratio', val: kd ? kd.toFixed(2) : '—' },
    { label: 'Headshot %', val: hs ? hs + '%' : '—' },
    { label: 'ADR', val: adr || '—' },
    { label: 'Побед', val: s.wins || '—' },
    { label: 'Матчей', val: s.matches || '—' },
    { label: 'Winrate', val: winrate ? winrate + '%' : '—' },
  ].map(item => `
    <div class="pp-stat-line">
      <span>${item.label}</span>
      <span class="pp-stat-accent">${item.val}</span>
    </div>`).join('');

  // Matches — обычные матчи + зарегистрированные турниры
  // teamName берём из player.team ИЛИ из команды пользователя по teamId
  let teamName = player?.team || '';
  if (!teamName && user.teamId) {
    const allTeamsForMatch = DB.get('pl_teams');
    const userTeam = allTeamsForMatch.find(t => String(t.id) === String(user.teamId));
    if (userTeam) teamName = userTeam.name;
  }
  const regularMatches = player
    ? DB.get('pl_matches')
        .filter(m => m.team1 === teamName || m.team2 === teamName)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)
    : [];

  // Турниры где зарегистрирована команда игрока
  const tournamentEntries = [];
  if (teamName) {
    const allTournaments = (() => {
      try {
        const raw = localStorage.getItem('pl_tournaments');
        if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
      } catch(_) {}
      return [];
    })();
    const regs = (() => { try { return JSON.parse(localStorage.getItem('pl_tourn_regs')) || {}; } catch(_) { return {}; } })();
    allTournaments.forEach(t => {
      if (t.status === 'finished') return;
      // Ищем по всем возможным ключам id
      const regList = regs[t.id] || regs[String(t.id)] || regs[Number(t.id)] || [];
      const isRegistered = regList.some(r =>
        r.teamName === teamName ||
        (r.teamName || '').toLowerCase() === teamName.toLowerCase()
      );
      console.log('[TOURN DEBUG]', t.name, 'regList:', regList.length, 'teamName:', teamName, 'found:', isRegistered);
      if (isRegistered) {
        tournamentEntries.push({
          _isTournament: true,
          name: t.name,
          status: t.status,
          dateStart: t.dateStart,
          prize: t.prize
        });
      }
    });
  }

  // Объединяем: сначала турниры, потом матчи
  const matchRows = (() => {
    const rows = [];

    tournamentEntries.forEach(t => {
      const statusLabel = t.status === 'ongoing'
        ? `<span class="pp-tourn-status ongoing"><i class="fas fa-bolt"></i> Идёт сейчас</span>`
        : `<span class="pp-tourn-status upcoming"><i class="fas fa-clock"></i> Скоро</span>`;
      const dateStr = t.dateStart
        ? new Date(t.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      rows.push(`
        <div class="pp-tourn-row" style="cursor:pointer" onclick="window.location.href='tournaments.html?id=${encodeURIComponent(t.id)}'">
          <div class="pp-tourn-icon">
            <i class="fas fa-trophy"></i>
          </div>
          <div class="pp-tourn-info">
            <div class="pp-tourn-name">${t.name}</div>
            <div class="pp-tourn-meta">
              ${dateStr ? `<span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>` : ''}
              ${t.prize ? `<span><i class="fas fa-coins"></i> ${t.prize}</span>` : ''}
            </div>
          </div>
          <div class="pp-tourn-right">
            ${statusLabel}
          </div>
        </div>`);
    });

    regularMatches.forEach(m => {
      const isTeam1  = m.team1 === teamName;
      const opponent = isTeam1 ? m.team2  : m.team1;
      const myScore  = isTeam1 ? m.score1 : m.score2;
      const oppScore = isTeam1 ? m.score2 : m.score1;

      let rc = 'match-draw';
      if (m.status === 'upcoming') rc = 'match-upcoming';
      else if (myScore > oppScore) rc = 'match-win';
      else if (myScore < oppScore) rc = 'match-loss';

      const scoreStr = m.status === 'upcoming'
        ? `<span class="match-score upcoming">скоро</span>`
        : `<span class="match-score ${myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw'}">${myScore} : ${oppScore}</span>`;

      const ind = m.status === 'upcoming' ? 'ind-upcoming' : myScore > oppScore ? 'ind-win' : myScore < oppScore ? 'ind-loss' : 'ind-draw';

      rows.push(`
        <div class="pp-match-row ${rc}">
          <div class="pp-match-vs">
            <span class="pp-match-opp">vs <strong>${opponent}</strong></span>
            <span class="pp-match-tourn">${m.tournament}</span>
          </div>
          <div class="pp-match-right">
            ${scoreStr}
            ${m.url ? `<a href="${m.url}" target="_blank" class="pp-match-link" title="Смотреть на xplay"><i class="fas fa-external-link-alt"></i></a>` : ''}
            <div class="pp-match-indicator ${ind}"></div>
          </div>
        </div>`);
    });

    return rows.length
      ? rows.join('')
      : `<div class="pp-no-matches">Матчей пока нет</div>`;
  })();

  // Player select options for link
  const allPlayers = DB.get('pl_players');
  const playerOptions = allPlayers.map(p =>
    `<option value="${p.id}" ${player && player.id === p.id ? 'selected' : ''}>${p.nick}${p.team ? ' — ' + p.team : ''}</option>`
  ).join('');

  const joinDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  layout.innerHTML = `
    <!-- ═══ TOP HERO CARD ═══ -->
    <div class="pp-hero">
      <div class="pp-hero-left">
        ${photoHTML}
        <div class="pp-hero-info">
          <div class="pp-nick">${player?.nick || user.username}</div>
          ${player?.name ? `<div class="pp-real-name">${player.name}</div>` : ''}
          <div class="pp-hero-badges">
            ${player?.team    ? `<span class="pp-badge"><i class="fas fa-shield-halved"></i> ${player.team}</span>` : ''}
            ${player?.role    ? `<span class="pp-badge"><i class="fas fa-crosshairs"></i> ${player.role}</span>` : ''}
            ${player?.country ? `<span class="pp-badge"><i class="fas fa-location-dot"></i> ${player.country}</span>` : ''}
          </div>
          <div class="pp-info-table">${infoRows}</div>
        </div>
      </div>
      <div class="pp-hero-right">
        <div class="pp-role-badge role-${user.role}">${user.role === 'admin' ? '⚡ Администратор' : user.role === 'igl' ? '👑 Капитан (IGL)' : '👤 Пользователь'}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:6px"><i class="fas fa-calendar"></i> ${joinDate}</div>
        <div class="pp-social-links">
          ${user.faceitUrl ? `<a href="${user.faceitUrl}" target="_blank" rel="noopener" class="pp-social-btn pp-faceit-btn"><span class="pp-social-icon faceit-icon">F</span> Faceit</a>` : ''}
          ${user.steamUrl  ? `<a href="${user.steamUrl}"  target="_blank" rel="noopener" class="pp-social-btn pp-steam-btn"><i class="fab fa-steam"></i> Steam</a>` : ''}
        </div>
        ${user.role === 'admin' ? `<a href="admin.html" class="btn btn-primary btn-sm" style="margin-top:12px"><i class="fas fa-cog"></i> Панель управления</a>` : ''}
      </div>
    </div>

    <!-- ═══ AWARDS ═══ -->
    ${buildAwardsStrip(player?.nick || user.username, 'player')}

    <!-- ═══ TABS ═══ -->
    <div class="pp-tabs">
      <button class="pp-tab active" data-tab="info"><i class="fas fa-chart-bar"></i> Статистика</button>
      ${!readOnly && user.role === 'igl' ? `<button class="pp-tab" data-tab="team"><i class="fas fa-shield-halved"></i> Команда</button>` : ''}
      ${!readOnly ? `<button class="pp-tab" data-tab="invites" id="invitesTab"><i class="fas fa-bell"></i> Уведомления<span id="invitesBadge" style="display:none" class="pp-invite-badge"></span></button>` : ''}
      ${!readOnly ? `<button class="pp-tab" data-tab="edit"><i class="fas fa-edit"></i> Редактировать</button>` : ''}
    </div>

    <!-- ═══ TAB: INFO ═══ -->
    <div class="pp-tab-content" id="tab-info">
      <div class="pp-two-col">

        <div class="pp-stats-block">
          <div class="pp-stats-title">
            Статистика
            <span class="pp-stats-sub">${s.matches ? `${s.matches} карт` : 'нет данных'}</span>
          </div>
          <div class="pp-stat-line">
            <span>Rating 3.0</span>
            <i class="fas fa-signal pp-rating-icon"></i>
            <span class="pp-stat-accent">${kd ? kd.toFixed(2) : '—'}</span>
          </div>
        </div>

        <div class="pp-matches-block">
          <div class="pp-matches-title">Предстоящие и последние матчи</div>
          ${matchRows}
        </div>

      </div>
    </div>

    

    <!-- ═══ TAB: TEAM (IGL only) ═══ -->
    ${!readOnly && user.role === 'igl' ? `
    <div class="pp-tab-content" id="tab-team" style="display:none">
      <div class="igl-team-panel" id="iglTeamPanel"></div>
    </div>` : ''}

    <!-- ═══ TAB: INVITES ═══ -->
    ${!readOnly ? `
    <div class="pp-tab-content" id="tab-invites" style="display:none">
      <div class="pp-invites-wrap">
        <h3 style="margin-bottom:20px;display:flex;align-items:center;gap:10px">
          <i class="fas fa-bell" style="color:var(--primary)"></i> Приглашения в команду
        </h3>
        <div id="invitesList"></div>
      </div>
    </div>` : ''}

    <!-- ═══ TAB: EDIT ═══ -->
    ${!readOnly ? `
    <div class="pp-tab-content" id="tab-edit" style="display:none">      <div class="profile-details" style="width:100%">
        <h3><i class="fas fa-user"></i> Данные аккаунта</h3>
        <div id="profileAlert" class="alert" style="display:none"></div>
        <div class="form-group">
          <label><i class="fas fa-user"></i> Никнейм</label>
          <input type="text" id="pUsername" value="${user.username}" />
        </div>
        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Email</label>
          <input type="email" id="pEmail" value="${user.email}" />
        </div>
        <div class="form-group">
          <label>
            <span class="pp-social-icon faceit-icon">F</span>
            Ссылка на Faceit профиль
          </label>
          <input type="url" id="pFaceit" placeholder="https://www.faceit.com/ru/players/ВашНик" value="${user.faceitUrl || ''}" />
        </div>
        <div class="form-group">
          <label>
            <i class="fab fa-steam" style="color:#c6d4df;font-size:16px;vertical-align:middle;margin-right:6px"></i>
            Ссылка на Steam профиль
          </label>
          <input type="url" id="pSteam" placeholder="https://steamcommunity.com/id/ВашНик" value="${user.steamUrl || ''}" />
        </div>
        <div class="form-group">
          <label><i class="fas fa-image"></i> Аватар</label>
          <div class="file-upload-area" id="avatarUploadArea">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Нажмите для выбора фото</p>
            <input type="file" id="avatarFile" accept="image/*" style="display:none" />
          </div>
          <div class="logo-preview" id="avatarPreview" style="${user.avatar ? 'display:flex' : 'display:none'}">
            <img id="avatarPreviewImg" src="${user.avatar || ''}" alt="avatar" style="border-radius:50%" />
          </div>
        </div>
        <button class="btn btn-primary" id="saveProfileBtn"><i class="fas fa-save"></i> Сохранить</button>
      </div>
    </div>` : ''}`;

  // ── Tabs ──
  document.querySelectorAll('.pp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pp-tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).style.display = 'block';
    });
  });

  // ── Автообновление матчей каждые 15 сек ──
  function refreshMatches() {
    const block = document.querySelector('.pp-matches-block');
    if (!block) return;

    let tName = player?.team || '';
    if (!tName && user.teamId) {
      const allT = DB.get('pl_teams');
      const ut = allT.find(t => String(t.id) === String(user.teamId));
      if (ut) tName = ut.name;
    }
    if (!tName) return;

    const updated = DB.get('pl_matches')
      .filter(m => m.team1 === tName || m.team2 === tName)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    // Турниры
    const allTournaments = (() => {
      try {
        const raw = localStorage.getItem('pl_tournaments');
        if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
      } catch(_) {}
      return [];
    })();
    const regs2 = (() => { try { return JSON.parse(localStorage.getItem('pl_tourn_regs')) || {}; } catch(_) { return {}; } })();
    const tournRows = allTournaments
      .filter(t => {
        if (t.status === 'finished') return false;
        const regList = regs2[t.id] || regs2[String(t.id)] || regs2[Number(t.id)] || [];
        return regList.some(r =>
          r.teamName === tName ||
          (r.teamName || '').toLowerCase() === tName.toLowerCase()
        );
      })
      .map(t => {
        const sl = t.status === 'ongoing'
          ? `<span class="pp-tourn-status ongoing"><i class="fas fa-bolt"></i> Идёт сейчас</span>`
          : `<span class="pp-tourn-status upcoming"><i class="fas fa-clock"></i> Скоро</span>`;
        const dateStr = t.dateStart
          ? new Date(t.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
          : '';
        return `
          <div class="pp-tourn-row" style="cursor:pointer" onclick="window.location.href='tournaments.html?id=${encodeURIComponent(t.id)}'">
            <div class="pp-tourn-icon"><i class="fas fa-trophy"></i></div>
            <div class="pp-tourn-info">
              <div class="pp-tourn-name">${t.name}</div>
              <div class="pp-tourn-meta">
                ${dateStr ? `<span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>` : ''}
                ${t.prize ? `<span><i class="fas fa-coins"></i> ${t.prize}</span>` : ''}
              </div>
            </div>
            <div class="pp-tourn-right">${sl}</div>
          </div>`;
      });

    const matchRows2 = updated.map(m => {
      const isTeam1  = m.team1 === tName;
      const opponent = isTeam1 ? m.team2  : m.team1;
      const myScore  = isTeam1 ? m.score1 : m.score2;
      const oppScore = isTeam1 ? m.score2 : m.score1;
      let rc = 'match-draw';
      if (m.status === 'upcoming') rc = 'match-upcoming';
      else if (myScore > oppScore) rc = 'match-win';
      else if (myScore < oppScore) rc = 'match-loss';
      const scoreStr = m.status === 'upcoming'
        ? `<span class="match-score upcoming">скоро</span>`
        : `<span class="match-score ${myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw'}">${myScore} : ${oppScore}</span>`;
      const ind = m.status === 'upcoming' ? 'ind-upcoming' : myScore > oppScore ? 'ind-win' : myScore < oppScore ? 'ind-loss' : 'ind-draw';
      return `
        <div class="pp-match-row ${rc}">
          <div class="pp-match-vs">
            <span class="pp-match-opp">vs <strong>${opponent}</strong></span>
            <span class="pp-match-tourn">${m.tournament}</span>
          </div>
          <div class="pp-match-right">
            ${scoreStr}
            ${m.url ? `<a href="${m.url}" target="_blank" class="pp-match-link"><i class="fas fa-external-link-alt"></i></a>` : ''}
            <div class="pp-match-indicator ${ind}"></div>
          </div>
        </div>`;
    });

    const allRows = [...tournRows, ...matchRows2];
    block.innerHTML = `<div class="pp-matches-title">Предстоящие и последние матчи</div>${allRows.length ? allRows.join('') : '<div class="pp-no-matches">Матчей пока нет</div>'}`;
  }

  setInterval(refreshMatches, 15000);

  // ── IGL Team Panel ──
  if (!readOnly && user.role === 'igl') {
    renderIglTeamPanel(user);
  }

  // ── Avatar upload ──
  if (!readOnly) {
    let newAvatar = user.avatar || '';
    const area      = document.getElementById('avatarUploadArea');
    const fileInput = document.getElementById('avatarFile');
    const preview   = document.getElementById('avatarPreview');
    const previewImg= document.getElementById('avatarPreviewImg');
    if (area) area.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      // Показываем превью сразу (локально)
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
        preview.style.display = 'flex';
      };
      reader.readAsDataURL(file);

      // Загружаем на ImgBB
      const uploadBtn = document.getElementById('saveProfileBtn');
      if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка фото...'; }
      try {
        newAvatar = await uploadFileToImgBB(file);
        previewImg.src = newAvatar;
        console.log('[IMGBB] ✅ Аватар загружен:', newAvatar);
      } catch(e) {
        console.error('[IMGBB] ❌', e.message);
        if (typeof showToast === 'function') showToast('Ошибка загрузки фото', 'error');
      } finally {
        if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить'; }
      }
    });

    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => saveProfile(user, newAvatar));

    // ── Invites ──
    renderInvites(user);
    setInterval(() => renderInvites(user), 5000);
  }
}

// ── Save profile data ──
function saveProfile(user, newAvatar) {
  const newUsername = document.getElementById('pUsername').value.trim();
  const newEmail    = document.getElementById('pEmail').value.trim().toLowerCase();
  const alertEl     = document.getElementById('profileAlert');

  if (!newUsername || !newEmail) {
    showProfileAlert('Заполните все обязательные поля', 'error', alertEl); return;
  }

  // Ждём загрузки БД если она ещё не готова
  if (!window._dbReady) {
    showProfileAlert('Загрузка данных... попробуйте через секунду', 'error', alertEl);
    window.whenDbReady(() => saveProfile(user, newAvatar));
    return;
  }

  let users = DB.get('pl_users');

  // Ищем пользователя по id, username или email для большей надёжности
  let idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) idx = users.findIndex(u => (u.username || '').toLowerCase() === (user.username || '').toLowerCase());
  if (idx === -1) idx = users.findIndex(u => u.email === user.email);

  // Если не нашли в localStorage — данные ещё не синхронизировались с Supabase,
  // восстанавливаем из текущей сессии и продолжаем сохранение
  if (idx === -1) {
    console.warn('[PROFILE] User not in localStorage, restoring from session and saving...');
    users.push({ ...user });
    idx = users.length - 1;
  }

  if (users.find((u, i) => i !== idx && u.username.toLowerCase() === newUsername.toLowerCase())) {
    showProfileAlert('Такой никнейм уже занят', 'error', alertEl); return;
  }
  if (users.find((u, i) => i !== idx && u.email === newEmail)) {
    showProfileAlert('Этот email уже занят', 'error', alertEl); return;
  }

  users[idx].username = newUsername;
  users[idx].email    = newEmail;
  if (newAvatar) users[idx].avatar = newAvatar;

  // Faceit ссылка
  const faceitInput = document.getElementById('pFaceit');
  if (faceitInput) {
    const faceitVal = faceitInput.value.trim();
    if (!faceitVal || faceitVal.includes('faceit.com')) {
      users[idx].faceitUrl = faceitVal;
    }
  }

  // Steam ссылка
  const steamInput = document.getElementById('pSteam');
  if (steamInput) {
    const steamVal = steamInput.value.trim();
    if (!steamVal || steamVal.includes('steamcommunity.com') || steamVal.includes('steam')) {
      users[idx].steamUrl = steamVal;
    }
  }

  lsSet('pl_users', users);

  // Сохраняем изменения в MongoDB через update
  const updatedUser = users[idx];
  if (updatedUser.id) {
    DB.update('pl_users', updatedUser.id, updatedUser).catch(e => console.warn('[PROFILE] ⚠️ update user:', e.message));
  }

  // Синхронизируем изменения с записью игрока
  const players = DB.get('pl_players');
  const pi = players.findIndex(p => p.userId === user.id || p.nick.toLowerCase() === user.username.toLowerCase());
  if (pi !== -1) {
    players[pi].nick = newUsername;
    if (newAvatar) players[pi].photo = newAvatar;
    lsSet('pl_players', players);
    if (players[pi].id) {
      DB.update('pl_players', players[pi].id, players[pi]).catch(e => console.warn('[PROFILE] ⚠️ update player:', e.message));
    }
  }

  const { password: _, ...safeUser } = users[idx];
  Auth.login(safeUser);

  showProfileAlert('Профиль успешно обновлён', 'success', alertEl);
  if (typeof showToast === 'function') showToast('Профиль обновлён');
}

function showProfileAlert(msg, type, el) {
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
  el.style.display = 'flex';
}

// ── Render invites tab ──
function renderInvites(user) {
  const badge = document.getElementById('invitesBadge');
  const list  = document.getElementById('invitesList');
  if (!list) return;

  // Приглашения ищем по userId ИЛИ по нику пользователя
  const invites = DB.get('pl_invites').filter(inv =>
    inv.status === 'pending' && (
      inv.targetUserId === user.id ||
      inv.playerNick.toLowerCase() === user.username.toLowerCase()
    )
  );

  // Бейдж
  if (badge) {
    badge.textContent = invites.length;
    badge.style.display = invites.length > 0 ? 'inline-flex' : 'none';
  }

  if (!invites.length) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>Нет новых приглашений</p></div>`;
    return;
  }

  list.innerHTML = invites.map(inv => {
    const d = new Date(inv.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="invite-card" id="inv-${inv.id}">
        <div class="invite-card-left">
          <div class="invite-team-icon"><i class="fas fa-shield-halved"></i></div>
          <div>
            <div class="invite-title">Приглашение в команду <strong>${inv.teamName}</strong></div>
            <div class="invite-meta">
              <span><i class="fas fa-crown"></i> Капитан: ${inv.captainNick}</span>
              <span><i class="fas fa-clock"></i> ${d}</span>
            </div>
          </div>
        </div>
        <div class="invite-btns">
          <button class="btn btn-success btn-sm accept-inv" data-id="${inv.id}" data-team="${inv.teamName}" data-teamid="${inv.teamId || ''}">
            <i class="fas fa-check"></i> Принять
          </button>
          <button class="btn btn-danger btn-sm decline-inv" data-id="${inv.id}">
            <i class="fas fa-times"></i> Отклонить
          </button>
        </div>
      </div>`;
  }).join('');

  // Принять
  document.querySelectorAll('.accept-inv').forEach(btn => {
    btn.addEventListener('click', () => {
      const invId = parseInt(btn.dataset.id);
      const teamName = btn.dataset.team;

      // Помечаем приглашение принятым
      const all = DB.get('pl_invites');
      const idx = all.findIndex(i => i.id === invId);
      if (idx !== -1) { all[idx].status = 'accepted'; DB.set('pl_invites', all); }

      // Обновляем игрока в базе если он там есть (по нику)
      const players = DB.get('pl_players');
      const pi = players.findIndex(p => p.nick.toLowerCase() === user.username.toLowerCase());
      if (pi !== -1) { players[pi].team = teamName; DB.set('pl_players', players); }

      // Сохраняем команду прямо в данных пользователя
      const users = DB.get('pl_users');
      const ui = users.findIndex(u => u.id === user.id);
      if (ui !== -1) {
        users[ui].team = teamName;
        DB.set('pl_users', users);
        const { password: _, ...safe } = users[ui];
        Auth.login(safe);
      }

      showToast(`Вы вступили в команду ${teamName}!`, 'success');
      setTimeout(() => location.reload(), 900);
    });
  });

  // Отклонить
  document.querySelectorAll('.decline-inv').forEach(btn => {
    btn.addEventListener('click', () => {
      const invId = parseInt(btn.dataset.id);
      const all = DB.get('pl_invites');
      const idx = all.findIndex(i => i.id === invId);
      if (idx !== -1) { all[idx].status = 'declined'; DB.set('pl_invites', all); }
      showToast('Приглашение отклонено');
      renderInvites(user);
    });
  });
}

// ── IGL Team Panel ──
function renderIglTeamPanel(user) {
  const panel = document.getElementById('iglTeamPanel');
  if (!panel) return;

  const allTeams = DB.get('pl_teams');
  const myTeam = allTeams.find(t => t.id === user.teamId);

  if (!myTeam) {
    panel.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-shield-halved"></i>
        <p>У вас нет команды</p>
        <a href="teams.html" class="btn btn-primary btn-sm" style="margin-top:14px">Создать команду</a>
      </div>`;
    return;
  }

  const ROLES = ['IGL', 'AWPer', 'Rifler', 'Entry Fragger', 'Lurker', 'Support', 'Замена'];

  const allPlayers = DB.get('pl_players');
  const teamPlayers = allPlayers.filter(p => p.team === myTeam.name);

  const logoHTML = myTeam.logo
    ? `<img src="${myTeam.logo}" class="igl-header-logo">`
    : `<div class="igl-header-logo igl-logo-placeholder">${myTeam.name.substring(0,2).toUpperCase()}</div>`;

  // ── Карточки игроков (HLTV стиль) ──
  // Сначала капитан, потом остальные
  const allMembers = [
    { id: 'captain', nick: user.username, photo: user.avatar || '', role: 'IGL', isCaptain: true },
    ...teamPlayers.map(p => ({ id: p.id, nick: p.nick || p.name, photo: p.photo || '', role: p.role || '', isCaptain: false }))
  ];

  const playerCards = allMembers.map(p => `
    <div class="igl-hltv-card">
      <div class="igl-hltv-photo">
        ${p.photo
          ? `<img src="${p.photo}" alt="${p.nick}">`
          : `<div class="igl-hltv-placeholder">${p.nick.charAt(0).toUpperCase()}</div>`
        }
        ${p.isCaptain ? `<div class="igl-hltv-captain-crown"><i class="fas fa-crown"></i></div>` : ''}
      </div>
      <div class="igl-hltv-nick">${p.nick}</div>
      ${p.role ? `<div class="igl-hltv-role">${p.role}</div>` : '<div class="igl-hltv-role" style="opacity:0">—</div>'}
    </div>`).join('');

  // ── Список с выбором ролей ──
  const captainRow = `
    <div class="igl-player-row igl-captain-row">
      <div class="igl-player-left">
        ${user.avatar ? `<img src="${user.avatar}" class="igl-player-avatar">` : `<div class="igl-player-avatar igl-avatar-placeholder">${user.username.charAt(0).toUpperCase()}</div>`}
        <div>
          <div class="igl-player-nick">${user.username} <span class="igl-you-badge">Вы</span></div>
        </div>
      </div>
      <div class="igl-player-right">
        <span class="roster-role" style="font-size:0.82rem"><i class="fas fa-crown" style="color:#f59e0b;margin-right:4px"></i> IGL / Капитан</span>
      </div>
    </div>`;

  const playerRows = teamPlayers.map(p => {
    const roleOpts = ROLES.map(r =>
      `<option value="${r}" ${p.role === r ? 'selected' : ''}>${r}</option>`
    ).join('');
    return `
      <div class="igl-player-row" id="igl-row-${p.id}">
        <div class="igl-player-left">
          ${p.photo ? `<img src="${p.photo}" class="igl-player-avatar">` : `<div class="igl-player-avatar igl-avatar-placeholder">${(p.nick||'?').charAt(0).toUpperCase()}</div>`}
          <div>
            <div class="igl-player-nick">${p.nick || p.name}</div>
            ${p.name ? `<div class="igl-player-real">${p.name}</div>` : ''}
          </div>
        </div>
        <div class="igl-player-right">
          <select class="igl-role-select" data-pid="${p.id}" onchange="iglSetRole(this)">
            <option value="">— Роль —</option>
            ${roleOpts}
          </select>
          <span class="igl-save-hint" id="hint-${p.id}" style="display:none;color:var(--success);font-size:0.78rem"><i class="fas fa-check"></i> Сохранено</span>
        </div>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <!-- Шапка команды -->
    <div class="igl-team-header">
      ${logoHTML}
      <div>
        <div class="igl-team-name">${myTeam.name}</div>
        <div class="igl-team-meta">
          <span><i class="fas fa-users"></i> ${teamPlayers.length + 1} игроков</span>
          <span><i class="fas fa-location-dot"></i> ${myTeam.country || '—'}</span>
        </div>
      </div>
    </div>

    <!-- HLTV-стиль фото игроков -->
    <div class="igl-hltv-roster">
      ${playerCards}
    </div>

    <!-- Список с назначением ролей -->
    <div class="igl-players-list" style="margin-top:24px">
      <div class="igl-list-title"><i class="fas fa-users"></i> Состав — назначьте роли</div>
      ${captainRow}
      ${teamPlayers.length
        ? playerRows
        : `<div style="color:var(--text-dim);font-size:0.88rem;padding:16px 0">В команде пока нет других игроков</div>`
      }
    </div>`;
}

window.iglSetRole = function(select) {
  const pid = select.dataset.pid; // строка, не parseInt — совместимо с MongoDB
  const role = select.value;
  if (!pid) return;

  const players = DB.get('pl_players');
  const idx = players.findIndex(p => String(p.id) === String(pid));
  if (idx === -1) return;

  players[idx].role = role;
  DB.set('pl_players', players);

  // Синхронизируем с сервером
  DB.update('pl_players', String(pid), { role }).catch(e =>
    console.warn('[IGL] role update failed:', e.message)
  );

  // Показываем подсказку "Сохранено"
  const hint = document.getElementById(`hint-${pid}`);
  if (hint) {
    hint.style.display = 'inline-flex';
    setTimeout(() => { hint.style.display = 'none'; }, 2000);
  }

  if (typeof showToast === 'function') showToast(`Роль «${role}» назначена`, 'success');
};

// ── Awards helper ──
function getAwards() {
  try { return JSON.parse(localStorage.getItem('pl_awards')) || []; } catch(_) { return []; }
}

function buildAwardsStrip(recipientName, type) {
  const awards = getAwards().filter(a =>
    a.target === type &&
    (a.recipient || '').toLowerCase() === (recipientName || '').toLowerCase()
  );
  if (!awards.length) return '';

  const colorMap = {
    gold:    '#FFB300',
    silver:  '#9E9E9E',
    bronze:  '#CD7F32',
    primary: '#6C63FF',
    accent:  '#00D4FF'
  };

  const items = awards.map(a => {
    const color = colorMap[a.color] || '#FFB300';
    const iconHTML = a.image
      ? `<img src="${a.image}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
      : `<i class="fas fa-medal" style="color:${color};font-size:1.3rem"></i>`;
    const d = a.date ? new Date(a.date).getFullYear() : '';
    return `
      <div class="award-item" title="${a.name}${a.desc ? ' — ' + a.desc : ''}${d ? ' (' + d + ')' : ''}">
        <div class="award-icon" style="border-color:${color};box-shadow:0 0 8px ${color}33">
          ${iconHTML}
        </div>
        <div class="award-name" style="color:${color}">${a.name}</div>
        ${d ? `<div class="award-year">${d}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="awards-strip">
      <div class="awards-strip-title"><i class="fas fa-medal"></i> Награды</div>
      <div class="awards-list">${items}</div>
    </div>`;
}
