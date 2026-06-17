// ── Teams Page ──
document.addEventListener('DOMContentLoaded', () => {
  whenDbReady(() => {
  let currentTier = 'all';
  let searchQuery = '';
  let currentView = 'list';

  const TEAM_CREATE_CD_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней в мс

  // ── Хелперы КД ──
  function getCdInfo(user) {
    if (!user || !user.teamDeletedAt) return null;
    const elapsed = Date.now() - new Date(user.teamDeletedAt).getTime();
    if (elapsed >= TEAM_CREATE_CD_MS) return null; // КД прошёл
    const remaining = TEAM_CREATE_CD_MS - elapsed;
    const days  = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const mins  = Math.floor((remaining % 3600000) / 60000);
    return { remaining, days, hours, mins };
  }

  function refreshUser() {
    const u = Auth.current();
    if (!u) return null;
    // Перечитываем из БД чтобы получить свежие данные
    const users = DB.get('pl_users');
    const fresh = users.find(x => x.id === u.id);
    if (fresh) { const { password: _, ...safe } = fresh; Auth.login(safe); return safe; }
    return u;
  }

  // ── Показ/скрытие кнопки создания команды ──
  function renderIglControls() {
    const user = refreshUser();
    const wrap = document.getElementById('iglControlsWrap');
    if (!wrap) return;

    if (!user || user.role !== 'igl') { wrap.innerHTML = ''; return; }

    const cd = getCdInfo(user);
    const myTeam = DB.get('pl_teams').find(t => String(t.ownerId) === String(user.id));

    if (myTeam) {
      // У IGL уже есть команда — показываем кнопку удаления
      wrap.innerHTML = `
        <div class="igl-team-controls">
          <span class="igl-myteam-label"><i class="fas fa-crown"></i> Ваша команда: <strong>${myTeam.name}</strong></span>
          <button class="btn btn-danger btn-sm" id="deleteMyTeamBtn"><i class="fas fa-trash"></i> Удалить команду</button>
        </div>`;
      document.getElementById('deleteMyTeamBtn').addEventListener('click', () => deleteMyTeam(user, myTeam));
    } else if (cd) {
      // КД активен
      wrap.innerHTML = `
        <div class="igl-cd-block">
          <i class="fas fa-clock"></i>
          <div>
            <div class="igl-cd-title">Создание команды на перезарядке</div>
            <div class="igl-cd-timer" id="cdTimer">
              ${cd.days}д ${cd.hours}ч ${cd.mins}м
            </div>
          </div>
        </div>`;
      // Живой таймер
      const interval = setInterval(() => {
        const u2 = Auth.current();
        const cd2 = getCdInfo(u2);
        const timerEl = document.getElementById('cdTimer');
        if (!cd2) { clearInterval(interval); renderIglControls(); return; }
        if (timerEl) timerEl.textContent = `${cd2.days}д ${cd2.hours}ч ${cd2.mins}м`;
      }, 60000);
    } else {
      // Может создать команду
      wrap.innerHTML = `
        <button class="btn btn-primary" id="openCreateTeamBtn">
          <i class="fas fa-plus"></i> Создать команду
        </button>`;
      document.getElementById('openCreateTeamBtn').addEventListener('click', openCreateModal);
    }
  }

  // ── Удаление своей команды ──
  function deleteMyTeam(user, team) {
    if (!confirm(`Удалить команду «${team.name}»? Это действие нельзя отменить. КД на создание новой команды — 7 дней.`)) return;

    // Убираем команду у игроков
    const players = DB.get('pl_players').map(p => p.team === team.name ? { ...p, team: '' } : p);
    DB.set('pl_players', players);

    // Удаляем команду
    DB.set('pl_teams', DB.get('pl_teams').filter(t => t.id !== team.id));

    // Ставим КД пользователю
    const users = DB.get('pl_users');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].teamDeletedAt = new Date().toISOString();
      users[idx].teamId = null;
      DB.set('pl_users', users);
      const { password: _, ...safe } = users[idx];
      Auth.login(safe);
    }

    showToast('Команда удалена. КД 7 дней.', 'error');
    renderIglControls();
    renderTeams();
  }

  // ── Модальное окно создания команды ──
  function openCreateModal() {
    document.getElementById('createTeamModal').style.display = 'flex';
    document.getElementById('ctName').value = '';
    document.getElementById('ctCountry').value = '';
    document.getElementById('ctDescription').value = '';
    document.getElementById('ctAlert').style.display = 'none';
    ctLogoData = '';
    document.getElementById('ctLogoPreview').style.display = 'none';
  }

  function closeCreateModal() {
    document.getElementById('createTeamModal').style.display = 'none';
  }

  let ctLogoData = '';

  document.getElementById('ctModalClose').addEventListener('click', closeCreateModal);
  document.getElementById('ctCancelBtn').addEventListener('click', closeCreateModal);
  document.getElementById('createTeamModal').addEventListener('click', e => {
    if (e.target === document.getElementById('createTeamModal')) closeCreateModal();
  });

  // Загрузка лого
  const ctLogoArea = document.getElementById('ctLogoArea');
  const ctLogoInput = document.getElementById('ctLogoInput');
  ctLogoArea.addEventListener('click', () => ctLogoInput.click());
  ctLogoInput.addEventListener('change', async () => {
    const file = ctLogoInput.files[0];
    if (!file) return;
    // Превью сразу
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('ctLogoImg').src = e.target.result;
      document.getElementById('ctLogoPreview').style.display = 'flex';
    };
    reader.readAsDataURL(file);
    // Загрузка на ImgBB
    document.getElementById('ctLogoImg').style.opacity = '0.5';
    try {
      ctLogoData = await uploadFileToImgBB(file);
      document.getElementById('ctLogoImg').src = ctLogoData;
      console.log('[IMGBB] ✅ Лого команды загружено:', ctLogoData);
    } catch(e) {
      console.error('[IMGBB] ❌', e.message);
      showToast('Ошибка загрузки логотипа', 'error');
      ctLogoData = '';
    } finally {
      document.getElementById('ctLogoImg').style.opacity = '1';
    }
  });
  document.getElementById('ctRemoveLogo').addEventListener('click', () => {
    ctLogoData = '';
    document.getElementById('ctLogoPreview').style.display = 'none';
    ctLogoInput.value = '';
  });

  // Сохранение команды
  document.getElementById('ctSaveBtn').addEventListener('click', async () => {
    const user = refreshUser();
    if (!user || user.role !== 'igl') return;

    const cd = getCdInfo(user);
    if (cd) { showToast('КД ещё активен!', 'error'); return; }

    const myTeam = DB.get('pl_teams').find(t => String(t.ownerId) === String(user.id));
    if (myTeam) { showToast('У вас уже есть команда!', 'error'); return; }

    const name = document.getElementById('ctName').value.trim();
    const country = document.getElementById('ctCountry').value.trim();
    const description = document.getElementById('ctDescription').value.trim();
    const alertEl = document.getElementById('ctAlert');

    if (!name) {
      alertEl.style.display = 'flex';
      alertEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Введите название команды';
      return;
    }

    const teams = DB.get('pl_teams');
    if (teams.find(t => t.name.toLowerCase() === name.toLowerCase())) {
      alertEl.style.display = 'flex';
      alertEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Команда с таким названием уже существует';
      return;
    }

    const btn = document.getElementById('ctSaveBtn');
    btn.disabled = true;

    const newTeam = {
      name,
      tier: 3,
      country: country || '—',
      rating: 0,
      description,
      logo: ctLogoData,
      ownerId: user.id,
      createdAt: new Date().toISOString()
    };

    const saved = await DB.insert('pl_teams', newTeam);

    // Сохраняем teamId у пользователя
    const users = DB.get('pl_users');
    const idx = users.findIndex(u => String(u.id) === String(user.id));
    if (idx !== -1) {
      users[idx].teamId = saved.id;
      users[idx].team = name;
      users[idx].teamDeletedAt = null;
      lsSet('pl_users', users);
      await DB.update('pl_users', String(user.id), { teamId: saved.id, team: name, teamDeletedAt: null }).catch(() => {});
      const { password: _, ...safe } = users[idx];
      Auth.login(safe);
    }

    // Добавляем IGL как игрока команды если его ещё нет
    const players = DB.get('pl_players');
    const existingPlayer = players.find(p =>
      String(p.userId) === String(user.id) ||
      (p.nick || '').toLowerCase() === (user.username || '').toLowerCase()
    );
    if (existingPlayer) {
      // Обновляем команду
      await DB.update('pl_players', String(existingPlayer.id), { team: name, role: 'IGL' }).catch(() => {});
      const pi = players.findIndex(p => String(p.id) === String(existingPlayer.id));
      if (pi !== -1) { players[pi].team = name; players[pi].role = 'IGL'; lsSet('pl_players', players); }
    } else {
      // Создаём запись игрока
      await DB.insert('pl_players', {
        nick: user.username,
        name: user.username,
        team: name,
        role: 'IGL',
        country: '',
        rating: 0,
        photo: user.avatar || '',
        userId: user.id,
        stats: { kd: 0, hs: 0, adr: 0, matches: 0, wins: 0 }
      });
    }

    btn.disabled = false;
    closeCreateModal();
    showToast(`Команда «${name}» создана!`, 'success');
    renderIglControls();
    renderTeams();
  });

  // ── View toggle ──
  document.querySelectorAll('#teamsViewToggle .view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#teamsViewToggle .view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderTeams();
    });
  });

  // ── Tier filter ──
  document.querySelectorAll('.tier-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTier = tab.dataset.tier;
      renderTeams();
    });
  });

  // ── Search ──
  const search = document.getElementById('teamSearch');
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value.toLowerCase();
      renderTeams();
    });
  }

  renderIglControls();
  renderTeams();

  // ── Render teams ──
  function renderTeams() {
    const grid = document.getElementById('teamsGrid');
    if (!grid) return;
    const user = Auth.current();

    let teams = DB.get('pl_teams');
    if (currentTier !== 'all') teams = teams.filter(t => String(t.tier) === String(currentTier));
    if (searchQuery) teams = teams.filter(t =>
      t.name.toLowerCase().includes(searchQuery) ||
      (t.country || '').toLowerCase().includes(searchQuery)
    );

    if (!teams.length) {
      grid.className = 'teams-grid';
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-shield-halved"></i><p>Команды не найдены</p></div>`;
      return;
    }

    if (currentView === 'list') {
      const LIMIT = 10;
      const visible = teams.slice(0, LIMIT);
      const hidden  = teams.slice(LIMIT);

      const buildTeamRows = (list, offset) => list.map((t, i) => {
        const logo = t.logo
          ? `<img src="${t.logo}" alt="${t.name}" class="list-logo" />`
          : `<span class="list-logo-placeholder">${t.name.substring(0,2).toUpperCase()}</span>`;
        const isOwn = user && String(t.ownerId) === String(user.id);
        return `
          <div class="list-row${isOwn ? ' own-team-row' : ''}" style="cursor:pointer" onclick="openTeamModal(${t.id})">
            <span class="lh-num lr-num">${offset + i + 1}</span>
            <span class="lh-name lr-name">${logo} <strong>${t.name}</strong>${isOwn ? ' <span class="own-badge"><i class="fas fa-crown"></i></span>' : ''}</span>
            <span class="lh-tier"><span class="tier-badge tier-${t.tier}">T${t.tier}</span></span>
            <span class="lh-country lr-muted"><i class="fas fa-location-dot"></i> ${t.country || '—'}</span>
            <span class="lh-rating lr-accent">${t.rating || 0}</span>
          </div>`;
      }).join('');

      grid.className = 'list-view';
      grid.innerHTML = `
        <div class="list-header">
          <span class="lh-num">#</span>
          <span class="lh-name">Команда</span>
          <span class="lh-tier">Тир</span>
          <span class="lh-country">Страна</span>
          <span class="lh-rating">Рейтинг</span>
        </div>
        <div id="teamsVisibleRows">${buildTeamRows(visible, 0)}</div>
        ${hidden.length ? `<div id="teamsHiddenRows" style="display:none">${buildTeamRows(hidden, LIMIT)}</div>` : ''}
        ${hidden.length ? `
          <div style="text-align:center;padding:16px 0">
            <button class="btn btn-outline btn-sm" onclick="toggleAllTeams(this, ${hidden.length})">
              <i class="fas fa-shield-halved"></i> Все команды (ещё ${hidden.length})
            </button>
          </div>` : ''}`;
    } else {
      const LIMIT = 10;
      const visible = teams.slice(0, LIMIT);
      const hidden  = teams.slice(LIMIT);

      const buildTeamCards = (list) => list.map(t => {
        const logo = t.logo
          ? `<img src="${t.logo}" alt="${t.name}" />`
          : `<span>${t.name.substring(0,2).toUpperCase()}</span>`;
        const players = DB.get('pl_players').filter(p => p.team === t.name);
        const allUsers = DB.get('pl_users');
        const captain = allUsers.find(u => u.id === t.ownerId);
        const isOwn = user && String(t.ownerId) === String(user.id);

        // Собираем 5 слотов: IGL + игроки + пустые
        const slots = [];
        if (captain) {
          slots.push({ nick: captain.username, photo: captain.avatar || captain.photo || '', isCaptain: true });
        }
        players.forEach(p => {
          if (slots.length < 5) slots.push({ nick: p.nick, photo: p.photo || '', isCaptain: false });
        });
        while (slots.length < 5) slots.push(null); // пустые слоты

        const rosterHTML = slots.map(s => s
          ? `<div class="tc-slot" title="${s.nick}" onclick="event.stopPropagation();window.location.href='profile.html?user=${encodeURIComponent(s.nick)}'">
               ${s.photo
                 ? `<img src="${s.photo}" alt="${s.nick}" />`
                 : `<span>${s.nick.charAt(0).toUpperCase()}</span>`}
               ${s.isCaptain ? `<div class="tc-slot-crown">👑</div>` : ''}
             </div>`
          : `<div class="tc-slot tc-slot-empty"><i class="fas fa-user-plus"></i></div>`
        ).join('');

        return `
          <div class="team-card${isOwn ? ' own-team-card' : ''}" style="cursor:pointer" onclick="openTeamModal(${t.id})">
            <div class="team-card-top">
              <div class="team-logo">${logo}</div>
              <div class="team-info">
                <div class="team-name">
                  ${t.name}
                  ${isOwn ? '<span class="own-badge"><i class="fas fa-crown"></i> Ваша</span>' : ''}
                </div>
                <div class="team-country"><i class="fas fa-location-dot"></i> ${t.country || '—'}</div>
              </div>
            </div>
            <div class="team-meta">
              <span class="tier-badge tier-${t.tier}">Tier ${t.tier}</span>
              <span class="team-rating">Рейтинг: <span>${t.rating || 0}</span></span>
            </div>
            ${t.description ? `<div class="team-desc">${t.description}</div>` : ''}
            <div class="tc-roster">${rosterHTML}</div>
          </div>`;
      }).join('');

      grid.className = 'teams-grid';
      grid.innerHTML = `
        <div id="teamsVisibleCards" style="display:contents">${buildTeamCards(visible)}</div>
        ${hidden.length ? `<div id="teamsHiddenCards" style="display:none;contents">${buildTeamCards(hidden)}</div>` : ''}`;

      if (hidden.length) {
        const btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'grid-column:1/-1;text-align:center;padding:8px 0 4px';
        btnWrap.innerHTML = `<button class="btn btn-outline btn-sm" onclick="toggleAllTeamsGrid(this, ${hidden.length})"><i class="fas fa-shield-halved"></i> Все команды (ещё ${hidden.length})</button>`;
        grid.appendChild(btnWrap);
      }
    }
  }

  // ── Team Modal ──
  window.openTeamModal = function(teamId) {
    const teams   = DB.get('pl_teams');
    const players = DB.get('pl_players');
    const t = teams.find(x => String(x.id) === String(teamId));
    if (!t) return;

    const teamPlayers = players.filter(p => p.team === t.name);
    const allUsers = DB.get('pl_users');
    const captain  = allUsers.find(u => u.id === t.ownerId);

    // Все участники: капитан + игроки (макс 5 в ряду)
    const allMembers = [
      ...(captain ? [{ nick: captain.username, photo: captain.avatar || '', role: 'IGL', isCaptain: true }] : []),
      ...teamPlayers.map(p => ({ nick: p.nick || p.name, photo: p.photo || '', role: p.role || '', isCaptain: false }))
    ];

    const logoHTML = t.logo
      ? `<img src="${t.logo}" class="tm-logo-img">`
      : `<div class="tm-logo-placeholder">${t.name.substring(0,2).toUpperCase()}</div>`;

    // ── Фотокарточки игроков ──
    const playerCards = allMembers.slice(0, 5).map(p => `
      <div class="tm-player-card" onclick="window.location.href='profile.html?user=${encodeURIComponent(p.nick)}'">
        <div class="tm-player-photo">
          ${p.photo ? `<img src="${p.photo}" alt="${p.nick}">` : `<div class="tm-photo-placeholder">${p.nick.charAt(0).toUpperCase()}</div>`}
          ${p.isCaptain ? `<div class="tm-crown"><i class="fas fa-crown"></i></div>` : ''}
        </div>
        <div class="tm-player-nick">${p.nick}</div>
        ${p.role ? `<div class="tm-player-role">${p.role}</div>` : ''}
      </div>`).join('');

    // ── Статистика команды — из данных команды или подсчёт из матчей ──
    const totalMatches = DB.get('pl_matches').filter(m => m.team1 === t.name || m.team2 === t.name);
    const winsCalc   = totalMatches.filter(m => m.status === 'finished' && ((m.team1 === t.name && m.score1 > m.score2) || (m.team2 === t.name && m.score2 > m.score1))).length;
    const lossesCalc = totalMatches.filter(m => m.status === 'finished' && ((m.team1 === t.name && m.score1 < m.score2) || (m.team2 === t.name && m.score2 < m.score1))).length;
    const playedCalc = totalMatches.filter(m => m.status === 'finished').length;

    // Если в команде есть сохранённые данные — используем их, иначе подсчитываем
    const played  = t.matches  !== undefined ? t.matches  : playedCalc;
    const wins    = t.wins     !== undefined ? t.wins     : winsCalc;
    const losses  = t.losses   !== undefined ? t.losses   : lossesCalc;
    const winrate = played ? Math.round(wins / played * 100) : 0;

    const statCards = [
      { label: 'Рейтинг',  val: t.rating || 0,          icon: 'fa-star' },
      { label: 'Матчей',   val: played || 0,             icon: 'fa-gamepad' },
      { label: 'Побед',    val: wins,                    icon: 'fa-trophy' },
      { label: 'Поражений',val: losses,                  icon: 'fa-times-circle' },
      { label: 'Winrate',  val: played ? winrate+'%':'—',icon: 'fa-chart-line' },
      { label: 'Игроков',  val: allMembers.length,       icon: 'fa-users' },
    ].map(s => `
      <div class="tm-stat-card">
        <i class="fas ${s.icon}"></i>
        <span class="tm-stat-val">${s.val}</span>
        <span class="tm-stat-label">${s.label}</span>
      </div>`).join('');

    // ── Предстоящие матчи / турниры ──
    const upcomingMatches = DB.get('pl_matches')
      .filter(m => (m.team1 === t.name || m.team2 === t.name) && m.status === 'upcoming')
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);

    const regs = (() => { try { return JSON.parse(localStorage.getItem('pl_tourn_regs')) || {}; } catch(_) { return {}; } })();
    const allTournaments = (() => { try { const r = localStorage.getItem('pl_tournaments'); return r ? JSON.parse(r) : []; } catch(_) { return []; } })();
    const upcomingTourns = allTournaments.filter(tr => {
      if (tr.status === 'finished') return false;
      const rl = regs[tr.id] || regs[String(tr.id)] || [];
      return rl.some(r => (r.teamName||'').toLowerCase() === t.name.toLowerCase());
    }).slice(0, 3);

    const matchRows = [
      ...upcomingTourns.map(tr => `
        <div class="tm-match-row" onclick="window.location.href='tournaments.html?id=${encodeURIComponent(tr.id)}'">
          <div class="tm-match-icon tourn"><i class="fas fa-trophy"></i></div>
          <div class="tm-match-info">
            <div class="tm-match-name">${tr.name}</div>
            <div class="tm-match-sub">${tr.prize || ''} ${tr.dateStart ? '· ' + new Date(tr.dateStart).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}) : ''}</div>
          </div>
          <span class="tm-match-badge ${tr.status === 'ongoing' ? 'live' : 'soon'}">${tr.status === 'ongoing' ? '<i class="fas fa-bolt"></i> Идёт' : '<i class="fas fa-clock"></i> Скоро'}</span>
        </div>`),
      ...upcomingMatches.map(m => {
        const opp = m.team1 === t.name ? m.team2 : m.team1;
        const d = m.date ? new Date(m.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
        return `
          <div class="tm-match-row">
            <div class="tm-match-icon match"><i class="fas fa-gamepad"></i></div>
            <div class="tm-match-info">
              <div class="tm-match-name">vs ${opp}</div>
              <div class="tm-match-sub">${m.tournament} ${d ? '· '+d : ''}</div>
            </div>
            <span class="tm-match-badge soon"><i class="fas fa-clock"></i> Скоро</span>
          </div>`;
      })
    ].join('');

    // ── Награды команды ──
    const teamAwards = (() => {
      try { return JSON.parse(localStorage.getItem('pl_awards')) || []; } catch(_) { return []; }
    })().filter(a => a.target === 'team' && (a.recipient||'').toLowerCase() === t.name.toLowerCase());

    const colorMap = { gold:'#FFB300', silver:'#9E9E9E', bronze:'#CD7F32', primary:'#6C63FF', accent:'#00D4FF' };
    const awardsHTML = teamAwards.length ? `
      <div class="tm2-awards">
        <div class="tm2-section-title" style="padding:16px 24px 0"><i class="fas fa-medal"></i> Награды</div>
        <div class="tm2-awards-list">
          ${teamAwards.map(a => {
            const color = colorMap[a.color] || '#FFB300';
            const iconHTML = a.image
              ? `<img src="${a.image}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
              : `<i class="fas fa-medal" style="color:${color};font-size:1.3rem"></i>`;
            const yr = a.date ? new Date(a.date).getFullYear() : '';
            return `
              <div class="award-item" title="${a.name}${a.desc?' — '+a.desc:''}${yr?' ('+yr+')':''}">
                <div class="award-icon" style="border-color:${color};box-shadow:0 0 8px ${color}44">${iconHTML}</div>
                <div class="award-name" style="color:${color}">${a.name}</div>
                ${yr ? `<div class="award-year">${yr}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>` : '';

    document.getElementById('teamModalContent').innerHTML = `
      <div class="tm2-wrap">
        <!-- Шапка -->
        <div class="tm2-header">
          ${logoHTML}
          <div class="tm2-header-info">
            <div class="tm2-name">${t.name}</div>
            <div class="tm2-meta">
              <span class="tier-badge tier-${t.tier}">Tier ${t.tier}</span>
              <span><i class="fas fa-location-dot"></i> ${t.country || '—'}</span>
              ${captain ? `<span><i class="fas fa-crown" style="color:#FFB300"></i> ${captain.username}</span>` : ''}
            </div>
            ${t.description ? `<div class="tm2-desc">${t.description}</div>` : ''}
          </div>
        </div>

        <!-- Игроки в ряд -->
        <div class="tm2-roster">
          ${playerCards || '<div class="tm2-empty">Игроков пока нет</div>'}
        </div>

        <!-- Награды -->
        ${awardsHTML}

        <!-- Стата + матчи -->
        <div class="tm2-bottom">
          <div class="tm2-stats">
            <div class="tm2-section-title"><i class="fas fa-chart-bar"></i> Статистика</div>
            <div class="tm2-stat-grid">${statCards}</div>
          </div>
          <div class="tm2-matches">
            <div class="tm2-section-title"><i class="fas fa-calendar-alt"></i> Предстоящие</div>
            ${matchRows || '<div class="tm2-empty">Матчей нет</div>'}
          </div>
        </div>
      </div>`;

    document.getElementById('teamModal').style.display = 'flex';
  };

  window.toggleAllTeams = function(btn, hiddenCount) {
    const el = document.getElementById('teamsHiddenRows');
    if (!el) return;
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? '' : 'none';
    btn.innerHTML = isHidden
      ? `<i class="fas fa-chevron-up"></i> Скрыть`
      : `<i class="fas fa-shield-halved"></i> Все команды (ещё ${hiddenCount})`;
  };

  window.toggleAllTeamsGrid = function(btn, hiddenCount) {
    const el = document.getElementById('teamsHiddenCards');
    if (!el) return;
    const isHidden = el.style.display === 'none' || el.style.display === 'none;contents';
    el.style.display = isHidden ? 'contents' : 'none';
    btn.innerHTML = isHidden
      ? `<i class="fas fa-chevron-up"></i> Скрыть`
      : `<i class="fas fa-shield-halved"></i> Все команды (ещё ${hiddenCount})`;
  };

  window.closeTeamModal = function() {
    document.getElementById('teamModal').style.display = 'none';
  };
  }); // конец whenDbReady

  // Перерендериваем когда Supabase вернул свежие данные
  window.addEventListener('db-updated', () => {
    if (typeof renderTeams === 'function') renderTeams();
  });
}); // конец DOMContentLoaded

