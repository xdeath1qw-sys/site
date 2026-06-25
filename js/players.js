// ── Players Page ──
document.addEventListener('DOMContentLoaded', () => {
  console.log('[PLAYERS] Страница загружена');

  // Режим: если в URL передан ?all=1 — показываем ВСЕХ игроков (включая без команды)
  const urlParams = new URLSearchParams(window.location.search);
  const showAllMode = urlParams.get('all') === '1';

  // Обновляем заголовок страницы в зависимости от режима
  if (showAllMode) {
    const ph = document.querySelector('.page-header h1');
    if (ph) ph.innerHTML = '<i class="fas fa-users"></i> Все игроки';
    const ps = document.querySelector('.page-header p');
    if (ps) ps.textContent = 'Полный рейтинг всех игроков по K/D';
  } else {
    const ph = document.querySelector('.page-header h1');
    if (ph) ph.innerHTML = '<i class="fas fa-medal"></i> Топ игроков';
    const ps = document.querySelector('.page-header p');
    if (ps) ps.textContent = 'Лучшие игроки с командами — топ-10 по K/D';
  }

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

  // Ждём свежих данных из Supabase (db-updated), не используем кэш
  let playersInited = false;
  window.addEventListener('db-updated', () => {
    if (!playersInited) {
      init();
      playersInited = true;
    } else {
      populateTeamFilter();
      renderPlayers();
    }
  });

  // Запасной вариант если db-updated не пришёл за 5 сек
  setTimeout(() => {
    if (!playersInited && window._dbReady) { init(); playersInited = true; }
  }, 5000);

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
    // Очищаем кроме первой опции
    while (tf.options.length > 1) tf.remove(1);
    const teams = DB.get('pl_teams');
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      tf.appendChild(opt);
    });
    // В режиме all — добавляем опцию "Без команды"
    if (showAllMode) {
      const opt = document.createElement('option');
      opt.value = '__no_team__';
      opt.textContent = 'Без команды';
      tf.appendChild(opt);
    }
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
    const totalAllPlayers = players.length; // общее кол-во всех игроков до любых фильтров
    console.log('[PLAYERS] Всего игроков в базе:', players.length);

    // В обычном режиме (топ) — только игроки С командой, макс 10
    if (!showAllMode) {
      players = players.filter(p => p.team && p.team.trim() !== '' && p.team !== '—');
    }
    
    if (teamFilter !== 'all') {
      if (teamFilter === '__no_team__') {
        players = players.filter(p => !p.team || p.team.trim() === '' || p.team === '—');
      } else {
        players = players.filter(p => p.team === teamFilter);
      }
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

    // В режиме топа — берём только первые 10
    const topPlayers = !showAllMode ? players.slice(0, 10) : players;

    // Кнопка "Все игроки" — показывается только в режиме топа
    const allPlayersBtn = !showAllMode
      ? `<div style="text-align:center;padding:20px 0 4px">
           <a href="players.html?all=1" class="btn btn-outline">
             <i class="fas fa-users"></i> Все игроки${totalAllPlayers > 0 ? ` (${totalAllPlayers})` : ''}
           </a>
         </div>`
      : `<div style="text-align:center;padding:20px 0 4px">
           <a href="players.html" class="btn btn-outline">
             <i class="fas fa-medal"></i> Топ-10 игроков
           </a>
         </div>`;

    if (currentView === 'list') {
      grid.className = 'players-table-wrap';

      grid.innerHTML = `
        <table class="players-table">
          <thead>
            <tr>
              <th class="pt-num">#</th>
              <th class="pt-player">Игрок</th>
              <th class="pt-stat">K/D</th>
              <th class="pt-team">Команда</th>
            </tr>
          </thead>
          <tbody>
            ${buildPlayerRows(topPlayers, 0, myTeam, currentUser)}
          </tbody>
        </table>
        ${allPlayersBtn}`;
    } else {
      grid.className = 'players-grid full-grid';
      grid.innerHTML = topPlayers.map(p => {
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
      }).join('') + allPlayersBtn;
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
    // legacy — больше не используется
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
