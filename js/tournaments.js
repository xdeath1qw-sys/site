// ── TOURNAMENTS PAGE ──────────────────────────────────────────────

(function () {
  'use strict';

  // ── Default seed data ──────────────────────────────────────────
  const DEFAULT_TOURNAMENTS = [
    {
      id: 't1',
      name: 'EFL League Spring Cup 2026',
      game: 'CS2',
      status: 'upcoming',
      prize: '$5 000',
      format: 'Double Elimination',
      teams: 16,
      dateStart: '2026-07-10',
      dateEnd: '2026-07-20',
      location: 'Online',
      description: 'Открытый онлайн-чемпионат весеннего сезона. Участвуют команды из СНГ и Восточной Европы.'
    },
    {
      id: 't2',
      name: 'EFL Summer Invitational',
      game: 'CS2',
      status: 'upcoming',
      prize: '$2 000',
      format: 'Single Elimination',
      teams: 8,
      dateStart: '2026-08-01',
      dateEnd: '2026-08-03',
      location: 'Online',
      description: 'Инвайтный турнир для топ-команд лиги. Формат — Best of 3 на всех стадиях.'
    },
    {
      id: 't3',
      name: 'EFL League Weekly #12',
      game: 'CS2',
      status: 'ongoing',
      prize: '$500',
      format: 'GSL Groups',
      teams: 8,
      dateStart: '2026-06-14',
      dateEnd: '2026-06-15',
      location: 'Online',
      description: 'Еженедельный турнир для всех зарегистрированных команд.'
    },
    {
      id: 't4',
      name: 'EFL League Winter LAN 2025',
      game: 'CS2',
      status: 'finished',
      prize: '$10 000',
      format: 'Double Elimination',
      teams: 16,
      dateStart: '2025-12-10',
      dateEnd: '2025-12-14',
      location: 'Москва, офлайн',
      description: 'Крупнейший LAN-турнир зимнего сезона.'
    },
    {
      id: 't5',
      name: 'Open Qualifier #3',
      game: 'CS2',
      status: 'upcoming',
      prize: 'Квалификация',
      format: 'Single Elimination',
      teams: 32,
      dateStart: '2026-06-28',
      dateEnd: '2026-06-29',
      location: 'Online',
      description: 'Открытая квалификация в основную лигу сезона.'
    },
  ];

  // ── Storage ────────────────────────────────────────────────────
  function getTournaments() {
    try {
      const raw = localStorage.getItem('pl_tournaments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  // Регистрации: { tournamentId: [ { userId, username, teamName, date } ] }
  function getRegs() {
    try { return JSON.parse(localStorage.getItem('pl_tourn_regs')) || {}; }
    catch (_) { return {}; }
  }
  function saveRegs(r) { localStorage.setItem('pl_tourn_regs', JSON.stringify(r)); }

  function isRegistered(tournId, userId) {
    return (getRegs()[tournId] || []).some(r => r.userId === userId);
  }
  function register(tournId, userId, username, teamName, roster) {
    const regs = getRegs();
    if (!regs[tournId]) regs[tournId] = [];
    if (!regs[tournId].some(r => r.userId === userId)) {
      regs[tournId].push({ userId, username, teamName, roster: roster || [], date: new Date().toISOString() });
    }
    saveRegs(regs);
  }
  function unregister(tournId, userId) {
    const regs = getRegs();
    if (regs[tournId]) regs[tournId] = regs[tournId].filter(r => r.userId !== userId);
    saveRegs(regs);
  }
  function regCount(tournId) {
    return (getRegs()[tournId] || []).length;
  }

  // ── State ──────────────────────────────────────────────────────
  function getAll() { return getTournaments(); }
  let filterStatus = 'all';
  let filterSearch = '';

  // ── Countdown ─────────────────────────────────────────────────
  function msLeft(dateStr) {
    return new Date(dateStr).setHours(0, 0, 0, 0) - Date.now();
  }
  function buildCountdown(dateStr) {
    const diff = msLeft(dateStr);
    if (diff <= 0) return '';
    const totalSec = Math.floor(diff / 1000);
    const days  = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins  = Math.floor((totalSec % 3600) / 60);
    return `
      <div class="countdown">
        <span class="countdown-label">Начало через:</span>
        <div class="countdown-block">
          <span class="countdown-num" data-part="days">${days}</span>
          <span class="countdown-unit">дн</span>
        </div>
        <span class="countdown-sep">:</span>
        <div class="countdown-block">
          <span class="countdown-num" data-part="hours">${String(hours).padStart(2,'0')}</span>
          <span class="countdown-unit">ч</span>
        </div>
        <span class="countdown-sep">:</span>
        <div class="countdown-block">
          <span class="countdown-num" data-part="mins">${String(mins).padStart(2,'0')}</span>
          <span class="countdown-unit">мин</span>
        </div>
      </div>`;
  }

  // ── Helpers ───────────────────────────────────────────────────
  function statusLabel(s) {
    return { upcoming: 'Предстоящий', ongoing: 'Идёт сейчас', finished: 'Завершён' }[s] || s;
  }
  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Кнопка регистрации ────────────────────────────────────────
  function buildRegBtn(t) {
    if (t.status === 'finished') return '';

    const user = (typeof Auth !== 'undefined') ? Auth.current() : null;

    // Не авторизован
    if (!user) {
      return `
        <div class="tourn-reg-row">
          <a href="login.html" class="btn btn-outline btn-sm btn-full">
            <i class="fas fa-sign-in-alt"></i> Войти для регистрации
          </a>
        </div>`;
    }

    // Не IGL
    if (user.role !== 'igl') {
      return `
        <div class="tourn-reg-row">
          <div class="tourn-no-team">
            <i class="fas fa-crown"></i>
            <span>Только капитан (IGL) может регистрировать команду</span>
          </div>
        </div>`;
    }

    // IGL но нет команды
    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const myTeam = allTeams.find(t2 => t2.id === user.teamId);

    if (!myTeam) {
      return `
        <div class="tourn-reg-row">
          <div class="tourn-no-team">
            <i class="fas fa-users-slash"></i>
            <span>Сначала создайте команду</span>
          </div>
        </div>`;
    }

    // Проверяем количество игроков в команде (минимум 5) — только для предстоящих
    // Капитан (IGL) считается как 1 игрок команды
    if (t.status !== 'ongoing') {
      const allPlayers = (typeof DB !== 'undefined') ? DB.get('pl_players') : [];
      const teamPlayers = allPlayers.filter(p => p.team === myTeam.name);
      const MIN_PLAYERS = 5;
      // +1 за капитана (сам IGL)
      const totalWithCaptain = teamPlayers.length + 1;

      if (totalWithCaptain < MIN_PLAYERS) {
        const need = MIN_PLAYERS - totalWithCaptain;
        return `
          <div class="tourn-reg-row">
            <div class="tourn-no-team tourn-need-players">
              <i class="fas fa-users"></i>
              <div>
                <span>Недостаточно игроков для регистрации</span>
                <span class="tourn-players-count">
                  <strong>${totalWithCaptain} / ${MIN_PLAYERS}</strong> — нужно ещё <strong>${need}</strong>
                </span>
              </div>
            </div>
          </div>`;
      }
    }

    // Всё ок — можно регистрироваться
    // Если турнир уже идёт — регистрация закрыта
    if (t.status === 'ongoing') {
      return `
        <div class="tourn-reg-row">
          <div class="tourn-match-started">
            <i class="fas fa-bolt"></i>
            <span>Матч уже начался</span>
          </div>
        </div>`;
    }

    const already = isRegistered(t.id, user.id);
    const count   = regCount(t.id);

    if (already) {
      return `
        <div class="tourn-reg-row">
          <button class="btn btn-reg-done btn-sm btn-full" data-tid="${escHtml(String(t.id))}" onclick="tournCancel(this)">
            <i class="fas fa-check-circle"></i> Команда <strong>${escHtml(myTeam.name)}</strong> записана
            <span class="tourn-reg-count">${count}</span>
          </button>
        </div>`;
    }

    const icon  = t.status === 'ongoing' ? 'fa-bolt' : 'fa-paper-plane';
    const label = t.status === 'ongoing' ? 'Участвовать сейчас' : 'Зарегистрировать команду';

    return `
      <div class="tourn-reg-row">
        <button class="btn btn-primary btn-sm btn-full" data-tid="${escHtml(String(t.id))}" data-team="${escHtml(myTeam.name)}" onclick="openTournRegModal('${escHtml(String(t.id))}')">
          <i class="fas ${icon}"></i> ${label}
          <span class="tourn-reg-count">${count}</span>
        </button>
      </div>`;
  }

  // ── Card ──────────────────────────────────────────────────────
  function buildCard(t) {
    const countdown   = t.status === 'upcoming' ? buildCountdown(t.dateStart) : '';
    const bannerInner = t.image
      ? `<img src="${t.image}" style="width:100%;height:100%;object-fit:cover;display:block" alt="${escHtml(t.name)}" />`
      : `<i class="fas fa-trophy"></i>`;

    return `
      <div class="tournament-card status-${t.status}" data-id="${t.id}">
        <div class="tournament-banner${t.image ? ' tournament-banner-img' : ''}">
          ${bannerInner}
          <span class="tournament-status-badge badge-${t.status}">${statusLabel(t.status)}</span>
        </div>
        <div class="tournament-body">
          <div class="tournament-name">${escHtml(t.name)}</div>
          <div class="tournament-game"><i class="fas fa-gamepad"></i> ${escHtml(t.game)}</div>
          <div class="tournament-info-row">
            <div class="t-info-item">
              <span class="t-info-label"><i class="fas fa-calendar-alt"></i> Старт</span>
              <span class="t-info-value">${formatDate(t.dateStart)}</span>
            </div>
            <div class="t-info-item">
              <span class="t-info-label"><i class="fas fa-flag-checkered"></i> Финал</span>
              <span class="t-info-value">${formatDate(t.dateEnd)}</span>
            </div>
            <div class="t-info-item">
              <span class="t-info-label"><i class="fas fa-coins"></i> Призовой фонд</span>
              <span class="t-info-value prize">${escHtml(t.prize)}</span>
            </div>
            <div class="t-info-item">
              <span class="t-info-label"><i class="fas fa-sitemap"></i> Формат</span>
              <span class="t-info-value">${escHtml(t.format)}</span>
            </div>
            <div class="t-info-item">
              <span class="t-info-label"><i class="fas fa-location-dot"></i> Площадка</span>
              <span class="t-info-value">${escHtml(t.location)}</span>
            </div>
          </div>
          <div class="tournament-teams-row">
            <i class="fas fa-shield-halved"></i>
            ${t.status === 'ongoing'
              ? `<span class="tourn-started-label"><i class="fas fa-bolt"></i> Турнир начался</span>`
              : `<span>Слотов: <strong>${Math.max(0, t.teams - regCount(t.id))}</strong> / ${t.teams}</span>`
            }
          </div>
          ${countdown}
          ${buildRegBtn(t)}
        </div>
      </div>`;
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const grid = document.getElementById('tournamentsGrid');
    if (!grid) return;

    const all = getAll();
    const q   = filterSearch.toLowerCase();

    const filtered = all.filter(t => {
      const okStatus = filterStatus === 'all' || t.status === filterStatus;
      const okSearch = !q
        || t.name.toLowerCase().includes(q)
        || (t.game || '').toLowerCase().includes(q)
        || (t.location || '').toLowerCase().includes(q);
      return okStatus && okSearch;
    });

    filtered.sort((a, b) => {
      const order = { ongoing: 0, upcoming: 1, finished: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.status === 'finished') return new Date(b.dateEnd) - new Date(a.dateEnd);
      return new Date(a.dateStart) - new Date(b.dateStart);
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="no-tournaments">
          <i class="fas fa-trophy"></i>
          <p>Турниры не найдены</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(buildCard).join('');
  }

  // ── Глобальные обработчики кнопок регистрации ─────────────────
  // Обновляет надпись слотов на карточке турнира
  function updateSlotsDisplay(tid) {
    const t = getAll().find(x => String(x.id) === String(tid));
    if (!t) return;
    const card = document.querySelector(`.tournament-card[data-id="${tid}"]`);
    if (!card) return;
    const row = card.querySelector('.tournament-teams-row');
    if (!row) return;
    if (t.status === 'ongoing') {
      row.innerHTML = `<i class="fas fa-shield-halved"></i> <span class="tourn-started-label"><i class="fas fa-bolt"></i> Турнир начался</span>`;
    } else {
      const free = Math.max(0, t.teams - regCount(tid));
      row.innerHTML = `<i class="fas fa-shield-halved"></i> <span>Слотов: <strong>${free}</strong> / ${t.teams}</span>`;
    }
  }

  // ── Модалка регистрации ────────────────────────────────────────
  let _regModalTid = null;

  window.openTournRegModal = function(tid) {
    const user = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!user) { window.location.href = 'login.html'; return; }

    _regModalTid = tid;

    const t = getAll().find(x => String(x.id) === String(tid));
    const modal = document.getElementById('tournRegModal');
    if (!modal) return;

    // Заголовок
    const nameEl = document.getElementById('tournRegModalName');
    if (nameEl && t) nameEl.textContent = t.name;

    // Скрываем алерт
    const alertEl = document.getElementById('tournRegAlert');
    if (alertEl) alertEl.style.display = 'none';

    // Получаем команду пользователя
    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const myTeam = allTeams.find(tm => String(tm.id) === String(user.teamId));

    // Показываем команду в шапке блока состава
    const displayEl = document.getElementById('tournRegTeamDisplay');
    const hiddenSel = document.getElementById('tournRegTeamSelect');
    if (displayEl) {
      if (myTeam) {
        displayEl.innerHTML = myTeam.logo
          ? `<img src="${myTeam.logo}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;margin-right:8px">${escHtml(myTeam.name)}`
          : `<i class="fas fa-shield-halved" style="margin-right:8px"></i>${escHtml(myTeam.name)}`;
      } else {
        displayEl.textContent = '— Нет команды —';
      }
    }
    if (hiddenSel && myTeam) hiddenSel.value = String(myTeam.id);

    // Загружаем игроков
    window.onTournRegTeamChange();

    modal.style.display = 'flex';
  };

  window.closeTournRegModal = function() {
    const modal = document.getElementById('tournRegModal');
    if (modal) modal.style.display = 'none';
    _regModalTid = null;
  };

  window.onTournRegTeamChange = function() {
    const hiddenSel = document.getElementById('tournRegTeamSelect');
    const wrap = document.getElementById('tournRegRosterWrap');
    const listEl = document.getElementById('tournRegPlayerList');
    const countEl = document.getElementById('tournRegRosterCount');
    if (!hiddenSel || !wrap || !listEl) return;

    const teamId = hiddenSel.value;
    if (!teamId) { wrap.style.display = 'none'; return; }

    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const team = allTeams.find(tm => String(tm.id) === String(teamId));
    if (!team) { wrap.style.display = 'none'; return; }

    const allPlayers = (typeof DB !== 'undefined') ? DB.get('pl_players') : [];
    const players = allPlayers.filter(p => p.team === team.name);

    wrap.style.display = 'block';

    // Капитан — всегда в составе, показываем отдельно
    const captainUser = (typeof Auth !== 'undefined') ? Auth.current() : null;
    const captainNick = captainUser ? captainUser.username : 'Капитан';
    const captainRow = `
      <label class="roster-player-row roster-captain">
        <input type="checkbox" checked disabled style="accent-color:var(--primary)">
        <span class="roster-player-info">
          <span class="roster-nick">${escHtml(captainNick)}</span>
          <span class="roster-role"><i class="fas fa-crown"></i> IGL / Капитан</span>
        </span>
      </label>`;

    // Остальные игроки — нужно выбрать 4
    listEl.innerHTML = captainRow + players.map(p => `
      <label class="roster-player-row">
        <input type="checkbox" class="roster-cb" value="${escHtml(p.nick || p.name || p.id)}"
               onchange="updateRosterCount()">
        <span class="roster-player-info">
          <span class="roster-nick">${escHtml(p.nick || p.name)}</span>
          ${p.role ? `<span class="roster-role">${escHtml(p.role)}</span>` : ''}
        </span>
      </label>`).join('');

    if (countEl) countEl.textContent = '1 / 5';
  };

  window.updateRosterCount = function() {
    const checked = document.querySelectorAll('#tournRegPlayerList .roster-cb:checked');
    const countEl = document.getElementById('tournRegRosterCount');
    const count = checked.length + 1; // +1 капитан
    if (countEl) {
      countEl.textContent = `${count} / 5`;
      countEl.style.color = count === 5 ? 'var(--success)' : count > 5 ? 'var(--danger)' : 'var(--text-muted)';
    }
    // Блокируем лишние если уже 4 выбрано (5 с капитаном)
    document.querySelectorAll('#tournRegPlayerList .roster-cb:not(:checked)').forEach(cb => {
      cb.disabled = checked.length >= 4;
    });
  };

  window.confirmTournReg = function() {
    const tid = _regModalTid;
    if (!tid) return;

    const user = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!user) return;

    const alertEl = document.getElementById('tournRegAlert');

    const hiddenSel = document.getElementById('tournRegTeamSelect');
    const teamId = hiddenSel ? hiddenSel.value : null;
    if (!teamId) {
      if (alertEl) { alertEl.style.display = 'flex'; alertEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Команда не найдена'; }
      return;
    }

    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const team = allTeams.find(tm => String(tm.id) === String(teamId));
    if (!team) return;

    const checked = document.querySelectorAll('#tournRegPlayerList .roster-cb:checked');
    const roster = Array.from(checked).map(cb => cb.value);
    // Добавляем капитана в состав
    const captainUser2 = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (captainUser2) roster.unshift(captainUser2.username);

    if (roster.length !== 5) {
      if (alertEl) { alertEl.style.display = 'flex'; alertEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> Выберите 4 игрока (капитан уже включён). Выбрано: ${roster.length - 1}`; }
      return;
    }

    if (alertEl) alertEl.style.display = 'none';

    register(tid, user.id, user.username, team.name, roster);

    // ── Увеличиваем счётчик матчей всем игрокам в ростере ──
    const allPlayers = (typeof DB !== 'undefined') ? DB.get('pl_players') : [];
    let changed = false;
    roster.forEach(nick => {
      const idx = allPlayers.findIndex(p =>
        (p.nick || '').toLowerCase() === nick.toLowerCase() ||
        (p.name || '').toLowerCase() === nick.toLowerCase()
      );
      if (idx !== -1) {
        if (!allPlayers[idx].stats) allPlayers[idx].stats = {};
        allPlayers[idx].stats.matches = (parseInt(allPlayers[idx].stats.matches) || 0) + 1;
        changed = true;
      }
    });
    if (changed && typeof DB !== 'undefined') DB.set('pl_players', allPlayers);

    // ── Увеличиваем счётчик матчей у команды ──
    if (typeof DB !== 'undefined') {
      const allTeams = DB.get('pl_teams');
      const teamIdx = allTeams.findIndex(tm => tm.name === team.name);
      if (teamIdx !== -1) {
        const newMatches = (parseInt(allTeams[teamIdx].matches) || 0) + 1;
        allTeams[teamIdx].matches = newMatches;
        DB.set('pl_teams', allTeams);

        // Каждые 5 матчей — показываем запрос результатов
        if (newMatches > 0 && newMatches % 5 === 0) {
          _resultsTeamName = team.name;
          _resultsBatch = 5;
          setTimeout(() => window.openResultsModal(team.name, newMatches), 800);
        }
      }
    }

    // Обновляем кнопку на карточке
    const card = document.querySelector(`.tournament-card[data-id="${tid}"]`);
    if (card) {
      const regRow = card.querySelector('.tourn-reg-row');
      const count = regCount(tid);
      if (regRow) {
        regRow.innerHTML = `
          <button class="btn btn-reg-done btn-sm btn-full" data-tid="${escHtml(String(tid))}" onclick="tournCancel(this)">
            <i class="fas fa-check-circle"></i> Команда <strong>${escHtml(team.name)}</strong> записана
            <span class="tourn-reg-count">${count}</span>
          </button>`;
      }
    }

    updateSlotsDisplay(tid);
    window.closeTournRegModal();
    if (typeof showToast === 'function') showToast(`Команда «${team.name}» зарегистрирована!`);
  };

  window.tournCancel = function (btn) {
    if (!confirm('Отменить регистрацию команды?')) return;
    const tid  = btn.dataset.tid;
    const user = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!user) return;

    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const myTeam = allTeams.find(t => t.id === user.teamId);
    const teamName = myTeam ? myTeam.name : '';

    unregister(tid, user.id);

    // ── Уменьшаем счётчик матчей у команды при отмене ──
    if (typeof DB !== 'undefined' && myTeam) {
      const allTeams = DB.get('pl_teams');
      const teamIdx = allTeams.findIndex(tm => tm.name === myTeam.name);
      if (teamIdx !== -1) {
        allTeams[teamIdx].matches = Math.max(0, (parseInt(allTeams[teamIdx].matches) || 0) - 1);
        DB.set('pl_teams', allTeams);
      }
    }

    const t     = getAll().find(x => String(x.id) === String(tid));
    const count = regCount(tid);
    const icon  = 'fa-paper-plane';
    const label = 'Зарегистрировать команду';

    btn.className = 'btn btn-primary btn-sm btn-full';
    btn.dataset.team = teamName;
    btn.setAttribute('onclick', `openTournRegModal('${tid}')`);
    btn.innerHTML = `<i class="fas ${icon}"></i> ${label} <span class="tourn-reg-count">${count}</span>`;

    updateSlotsDisplay(tid);
    if (typeof showToast === 'function') showToast('Регистрация отменена', 'error');
  };

  // tournRegister оставляем для совместимости (не используется)
  window.tournRegister = function() {};

  // ── Модалка результатов каждые 5 матчей ──────────────────────
  let _resultsTeamName = null;
  let _resultsBatch = 5;

  window.openResultsModal = function(teamName, totalMatches) {
    _resultsTeamName = teamName;
    _resultsBatch = 5;
    const modal = document.getElementById('teamResultsModal');
    if (!modal) return;
    document.getElementById('resultsMatchCount').textContent = totalMatches;
    document.getElementById('resultsOf').textContent = _resultsBatch;
    const winsInput = document.getElementById('resultsWins');
    winsInput.max = _resultsBatch;
    winsInput.value = 0;
    updateResultsPreview();
    modal.style.display = 'flex';
  };

  window.closeResultsModal = function() {
    const modal = document.getElementById('teamResultsModal');
    if (modal) modal.style.display = 'none';
  };

  window.updateResultsPreview = function() {
    const wins = Math.max(0, Math.min(_resultsBatch, parseInt(document.getElementById('resultsWins').value) || 0));
    const losses = _resultsBatch - wins;
    const wr = Math.round(wins / _resultsBatch * 100);
    document.getElementById('resWinsVal').textContent = wins;
    document.getElementById('resLossesVal').textContent = losses;
    document.getElementById('resWrVal').textContent = wr + '%';
  };

  window.saveTeamResults = function() {
    if (!_resultsTeamName) return;
    const wins = Math.max(0, Math.min(_resultsBatch, parseInt(document.getElementById('resultsWins').value) || 0));
    const losses = _resultsBatch - wins;

    const allTeams = (typeof DB !== 'undefined') ? DB.get('pl_teams') : [];
    const idx = allTeams.findIndex(t => t.name === _resultsTeamName);
    if (idx !== -1) {
      allTeams[idx].wins   = (parseInt(allTeams[idx].wins)   || 0) + wins;
      allTeams[idx].losses = (parseInt(allTeams[idx].losses) || 0) + losses;
      if (typeof DB !== 'undefined') DB.set('pl_teams', allTeams);
    }

    window.closeResultsModal();
    if (typeof showToast === 'function') showToast(`Результаты сохранены: ${wins}W / ${losses}L`);
  };

  // ── Тикер обратного отсчёта ───────────────────────────────────
  function tickCountdowns() {
    document.querySelectorAll('.tournament-card.status-upcoming .countdown').forEach(block => {
      const card = block.closest('.tournament-card');
      const id   = card && card.dataset.id;
      if (!id) return;
      const t = getAll().find(x => String(x.id) === String(id));
      if (!t) return;
      const diff = msLeft(t.dateStart);
      if (diff <= 0) { block.remove(); return; }
      const totalSec = Math.floor(diff / 1000);
      const days  = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins  = Math.floor((totalSec % 3600) / 60);
      const d = block.querySelector('[data-part="days"]');
      const h = block.querySelector('[data-part="hours"]');
      const m = block.querySelector('[data-part="mins"]');
      if (d) d.textContent = days;
      if (h) h.textContent = String(hours).padStart(2, '0');
      if (m) m.textContent = String(mins).padStart(2, '0');
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('#statusTabs .tier-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#statusTabs .tier-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterStatus = btn.dataset.status;
        render();
      });
    });

    const searchInput = document.getElementById('tournamentSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterSearch = searchInput.value.trim();
        render();
      });
    }

    render();
    setInterval(tickCountdowns, 30000);

    // Если в URL передан ?id= — прокручиваем к нужному турниру и подсвечиваем
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('id');
    if (highlightId) {
      setTimeout(() => {
        const card = document.querySelector(`.tournament-card[data-id="${highlightId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('tourn-card-highlight');
          setTimeout(() => card.classList.remove('tourn-card-highlight'), 3000);
        }
      }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
