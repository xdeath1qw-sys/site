// ── Players Page ──
document.addEventListener('DOMContentLoaded', () => {
  console.log('[PLAYERS] Страница загружена');
  
  let searchQuery = '';
  let teamFilter = 'all';
  let currentView = 'list';

  // Показываем скелетон на время загрузки
  const grid = document.getElementById('playersGrid');
  if (grid) {
    grid.className = 'players-table-wrap';
    grid.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
        ${Array(8).fill(0).map(() => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--card);border-radius:10px;border:1px solid var(--border)">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(90deg,var(--border) 25%,var(--bg-secondary) 50%,var(--border) 75%);background-size:200% 100%;animation:skeletonShimmer 1.4s infinite"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <div style="height:13px;width:140px;border-radius:6px;background:linear-gradient(90deg,var(--border) 25%,var(--bg-secondary) 50%,var(--border) 75%);background-size:200% 100%;animation:skeletonShimmer 1.4s infinite"></div>
              <div style="height:11px;width:90px;border-radius:6px;background:linear-gradient(90deg,var(--border) 25%,var(--bg-secondary) 50%,var(--border) 75%);background-size:200% 100%;animation:skeletonShimmer 1.4s infinite 0.2s"></div>
            </div>
            <div style="height:13px;width:40px;border-radius:6px;background:linear-gradient(90deg,var(--border) 25%,var(--bg-secondary) 50%,var(--border) 75%);background-size:200% 100%;animation:skeletonShimmer 1.4s infinite 0.1s"></div>
          </div>`).join('')}
      </div>
      <style>
        @keyframes skeletonShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>`;
  }

  // Ждём загрузки БД (без искусственной задержки)
  const dbReady = new Promise(resolve => {
    const check = () => window._dbReady ? resolve() : setTimeout(check, 100);
    check();
  });

  dbReady.then(() => {
    console.log('[PLAYERS] Готово, отображаем игроков');
    init();
  });

  // Перерендериваем когда Supabase вернул свежие данные
  window.addEventListener('db-updated', () => {
    console.log('[PLAYERS] db-updated — обновляем список');
    populateTeamFilter();
    renderPlayers();
  });

  function init() {
    const players = DB.get('pl_players');
    console.log('[PLAYERS] Загружено игроков:', players.length);
    
    populateTeamFilter();
    renderPlayers();
  }

  // View toggle
  document.querySelectorAll('#playersViewToggle .view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#playersViewToggle .view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderPlayers();
    });
  });

  const search = document.getElementById('playerSearch');
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value.toLowerCase();
      renderPlayers();
    });
  }

  const tf = document.getElementById('teamFilter');
  if (tf) {
    tf.addEventListener('change', () => {
      teamFilter = tf.value;
      renderPlayers();
    });
  }

  function populateTeamFilter() {
    const tf = document.getElementById('teamFilter');
    if (!tf) return;
    const teams = DB.get('pl_teams');
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      tf.appendChild(opt);
    });
  }

  function renderPlayers() {
    const grid = document.getElementById('playersGrid');
    if (!grid) {
      console.error('[PLAYERS] Элемент playersGrid не найден!');
      return;
    }

    // Приглашения только через admin панель — IGL не может приглашать сам
    const currentUser = Auth.current();
    const myTeam = null; // всегда null — кнопки приглашения убраны

    let players = DB.get('pl_players');
    console.log('[PLAYERS] Всего игроков в базе:', players.length);
    
    if (teamFilter !== 'all') {
      players = players.filter(p => p.team === teamFilter);
      console.log('[PLAYERS] После фильтра по команде:', players.length);
    }
    if (searchQuery) {
      players = players.filter(p =>
        p.nick.toLowerCase().includes(searchQuery) ||
        (p.name || '').toLowerCase().includes(searchQuery) ||
        (p.team || '').toLowerCase().includes(searchQuery)
      );
      console.log('[PLAYERS] После поиска:', players.length);
    }

    if (!players.length) {
      grid.className = 'players-grid full-grid';
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Игроки не найдены</p></div>`;
      console.log('[PLAYERS] Игроки не найдены, показываем empty state');
      return;
    }

    // Сортируем по K/D — чем выше, тем выше в списке
    players = players.slice().sort((a, b) => {
      const kdA = parseFloat(a.stats?.kd ?? a.kd ?? 0) || 0;
      const kdB = parseFloat(b.stats?.kd ?? b.kd ?? 0) || 0;
      return kdB - kdA;
    });

    console.log('[PLAYERS] Отображаем', players.length, 'игроков в режиме', currentView);

    if (currentView === 'list') {
      grid.className = 'players-table-wrap';
      const LIMIT = 10;
      const visible = players.slice(0, LIMIT);
      const hidden  = players.slice(LIMIT);

      grid.innerHTML = `
        <table class="players-table">
          <thead>
            <tr>
              <th class="pt-num">#</th>
              <th class="pt-player">Игрок</th>
              <th class="pt-stat">K/D</th>
              <th class="pt-team">Команда</th>
              ${myTeam ? '<th class="pt-action"></th>' : ''}
            </tr>
          </thead>
          <tbody id="playersVisibleBody">
            ${buildPlayerRows(visible, 0, myTeam, currentUser)}
          </tbody>
          ${hidden.length ? `<tbody id="playersHiddenBody" style="display:none">
            ${buildPlayerRows(hidden, LIMIT, myTeam, currentUser)}
          </tbody>` : ''}
        </table>
        ${hidden.length ? `
          <div style="text-align:center;padding:16px 0">
            <button class="btn btn-outline btn-sm" id="showAllPlayersBtn" onclick="toggleAllPlayers(this, ${hidden.length})">
              <i class="fas fa-users"></i> Все игроки (ещё ${hidden.length})
            </button>
          </div>` : ''}`;
    } else {
      grid.className = 'players-grid full-grid';
      grid.innerHTML = players.map(p => {
        const photo = p.photo ? `<img src="${p.photo}" alt="${p.nick}" />` : `<i class="fas fa-user"></i>`;
        const stars = renderStars(p.rating || 0);
        const s = p.stats || {};
        
        // Проверяем, является ли игрок IGL
        const playerUserId = findUserIdByNick(p.nick);
        const isPlayerIgl = playerUserId ? (() => {
          const users = DB.get('pl_users');
          const u = users.find(u => u.id === playerUserId);
          return u && u.role === 'igl';
        })() : false;
        
        const canInvite = myTeam && p.team !== myTeam.name && !hasPendingInvite(p.nick, myTeam.name) && !isPlayerIgl;
        const alreadyInvited = myTeam && p.team !== myTeam.name && hasPendingInvite(p.nick, myTeam.name);
        
        return `
          <div class="player-card">
            <div class="player-card-img">
              ${photo}
              ${p.team ? `<span class="player-team-badge">${p.team}</span>` : ''}
            </div>
            <div class="player-card-body">
              <div class="player-nick">${p.nick}</div>
              ${p.name ? `<div class="player-real-name">${p.name}</div>` : ''}
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
                ${p.role ? `<div class="player-role">${p.role}</div>` : ''}
                ${p.country ? `<span style="font-size:0.72rem;color:var(--text-dim)"><i class="fas fa-location-dot"></i> ${p.country}</span>` : ''}
              </div>
              <div class="stars">${stars}</div>
              <div class="player-stats-full">
                <div class="player-stat-item"><span class="player-stat-val">${s.kd || '—'}</span><span class="player-stat-lbl">K/D</span></div>
                <div class="player-stat-item"><span class="player-stat-val">${s.hs ? s.hs + '%' : '—'}</span><span class="player-stat-lbl">HS%</span></div>
                <div class="player-stat-item"><span class="player-stat-val">${s.adr || '—'}</span><span class="player-stat-lbl">ADR</span></div>
                <div class="player-stat-item"><span class="player-stat-val">${s.wins || '—'}</span><span class="player-stat-lbl">Побед</span></div>
                <div class="player-stat-item"><span class="player-stat-val">${s.matches || '—'}</span><span class="player-stat-lbl">Матчей</span></div>
                <div class="player-stat-item"><span class="player-stat-val">${s.matches && s.wins ? Math.round(s.wins/s.matches*100) + '%' : '—'}</span><span class="player-stat-lbl">Winrate</span></div>
              </div>
              ${isPlayerIgl ? `<div class="invite-sent-badge" style="margin-top:12px;width:100%;justify-content:center;background:var(--warning-dim);border-color:var(--warning);color:var(--warning)"><i class="fas fa-crown"></i> IGL (только через админ)</div>` : ''}
              ${canInvite ? `<button class="btn btn-primary invite-btn" data-pid="${p.id}" data-nick="${p.nick}" style="margin-top:12px;width:100%"><i class="fas fa-user-plus"></i> Пригласить в команду</button>` : ''}
              ${alreadyInvited ? `<div class="invite-sent-badge" style="margin-top:12px;width:100%;justify-content:center"><i class="fas fa-clock"></i> Приглашение отправлено</div>` : ''}
            </div>
          </div>`;
      }).join('');
    }

    // Обработчики кнопок приглашения
    if (myTeam) {
      document.querySelectorAll('.invite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sendInvite(btn.dataset.nick, myTeam, currentUser);
          renderPlayers();
        });
      });
    }
  }

  function buildPlayerRows(list, offset, myTeam, currentUser) {
    const medals = ['🥇', '🥈', '🥉'];
    return list.map((p, i) => {
      const rank = offset + i;
      const photo = p.photo
        ? `<img src="${p.photo}" alt="${p.nick}" class="pt-avatar-img" />`
        : `<span class="pt-avatar-placeholder">${p.nick.substring(0,2).toUpperCase()}</span>`;
      const s = p.stats || {};
      const kd = parseFloat(s.kd ?? p.kd ?? 0) || 0;

      // Проверяем, является ли игрок IGL
      const playerUserId = findUserIdByNick(p.nick);
      const isPlayerIgl = playerUserId ? (() => {
        const users = DB.get('pl_users');
        const u = users.find(u => u.id === playerUserId);
        return u && u.role === 'igl';
      })() : false;
      
      const canInvite   = myTeam && p.team !== myTeam.name && !hasPendingInvite(p.nick, myTeam.name) && !isPlayerIgl;
      const alreadySent = myTeam && p.team !== myTeam.name &&  hasPendingInvite(p.nick, myTeam.name);
      const inMyTeam    = myTeam && p.team === myTeam.name;

      let actionCell = '';
      if (myTeam) {
        if (isPlayerIgl)
          actionCell = `<span class="pt-sent" title="IGL добавляются через админ панель"><i class="fas fa-crown"></i> IGL</span>`;
        else if (canInvite)
          actionCell = `<button class="pt-invite-btn invite-btn" data-pid="${p.id}" data-nick="${p.nick}" title="Пригласить в команду" onclick="event.stopPropagation()"><i class="fas fa-user-plus"></i> Пригласить</button>`;
        else if (alreadySent)
          actionCell = `<span class="pt-sent"><i class="fas fa-clock"></i> Отправлено</span>`;
        else if (inMyTeam)
          actionCell = `<span class="pt-in-team"><i class="fas fa-check"></i> В команде</span>`;
      }

      const rankCell = rank < 3
        ? `<span style="font-size:1.1rem">${medals[rank]}</span>`
        : `<span style="color:var(--text-dim)">${rank + 1}</span>`;

      const kdColor = kd >= 1.5 ? 'var(--success)' : kd >= 1.0 ? '#7ecb7e' : kd > 0 ? 'var(--danger)' : 'var(--text-dim)';

      return `
        <tr class="pt-row" style="cursor:pointer" onclick="window.location.href='profile.html?user=${encodeURIComponent(p.nick)}'">
          <td class="pt-num">${rankCell}</td>
          <td class="pt-player">
            <div class="pt-player-cell">
              <div class="pt-avatar">${photo}</div>
              <div class="pt-player-info">
                <span class="pt-nick">${p.nick}</span>
                ${p.name ? `<span class="pt-real">${p.name}</span>` : ''}
              </div>
            </div>
          </td>
          <td class="pt-stat" style="color:${kdColor};font-weight:700">${kd > 0 ? kd.toFixed(2) : '—'}</td>
          <td class="pt-team-cell">${p.team ? `<span class="pt-team-name"><i class="fas fa-shield-halved"></i> ${p.team}</span>` : '<span class="pt-dash">—</span>'}</td>
          ${myTeam ? `<td class="pt-action">${actionCell}</td>` : ''}
        </tr>`;
    }).join('');
  }

  window.toggleAllPlayers = function(btn, hiddenCount) {
    const hiddenBody = document.getElementById('playersHiddenBody');
    if (!hiddenBody) return;
    const isHidden = hiddenBody.style.display === 'none';
    hiddenBody.style.display = isHidden ? '' : 'none';
    btn.innerHTML = isHidden
      ? `<i class="fas fa-chevron-up"></i> Скрыть`
      : `<i class="fas fa-users"></i> Все игроки (ещё ${hiddenCount})`;
  };
  function hasPendingInvite(playerNick, teamName) {
    return DB.get('pl_invites').some(inv =>
      inv.playerNick.toLowerCase() === playerNick.toLowerCase() &&
      inv.teamName === teamName &&
      inv.status === 'pending'
    );
  }

  // Найти userId по нику (ищем пользователя с таким username)
  function findUserIdByNick(nick) {
    const users = DB.get('pl_users');
    const u = users.find(u => u.username.toLowerCase() === nick.toLowerCase());
    return u ? u.id : null;
  }

  // Отправить приглашение
  function sendInvite(playerNick, team, captain) {
    // Проверяем, не является ли игрок IGL
    const targetUserId = findUserIdByNick(playerNick);
    if (targetUserId) {
      const users = DB.get('pl_users');
      const targetUser = users.find(u => u.id === targetUserId);
      if (targetUser && targetUser.role === 'igl') {
        showToast('IGL можно добавлять только через админ панель', 'error');
        return;
      }
    }
    
    const invites = DB.get('pl_invites');
    invites.push({
      id: Date.now(),
      playerNick,
      targetUserId,   // null если пользователя нет — всё равно сохраняем по нику
      teamName: team.name,
      teamId: team.id,
      captainId: captain.id,
      captainNick: captain.username,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    DB.set('pl_invites', invites);
    showToast(`Приглашение отправлено игроку ${playerNick}`);
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) html += '<i class="fas fa-star star-filled"></i>';
      else if (i === full && half) html += '<i class="fas fa-star-half-stroke star-filled"></i>';
      else html += '<i class="fas fa-star star-empty"></i>';
    }
    return html;
  }
});
