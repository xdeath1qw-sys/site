// ── Home Page ──
document.addEventListener('DOMContentLoaded', () => {

  let initialized = false;

  // Запускаем init только после получения свежих данных из Supabase
  window.addEventListener('db-updated', () => {
    if (!initialized) {
      init();
      initialized = true;
    } else {
      animateCounter('heroTeams',   DB.get('pl_teams').length);
      animateCounter('heroPlayers', DB.get('pl_players').length);
      animateCounter('heroNews',    DB.get('pl_news').length);
      if (typeof _renderHomeAll === 'function') _renderHomeAll();
    }
  });

  function init() {
    const teams   = DB.get('pl_teams');
    const users   = DB.get('pl_users').filter(u => u.role !== 'admin');
    const players = DB.get('pl_players');
    const news    = DB.get('pl_news');

    // Hero counters — используем players для единообразия с главной и админкой
    animateCounter('heroTeams',   teams.length);
    animateCounter('heroPlayers', players.length);
    animateCounter('heroNews',    news.length);

    // View modes
    let teamsView    = 'grid';
    let playersView  = 'grid';
    let showAllPlayers = false;

    // Teams view toggle
    document.querySelectorAll('#teamsViewToggle .view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#teamsViewToggle .view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        teamsView = btn.dataset.view;
        renderHomeTeams(currentTier);
      });
    });

    // Players view toggle
    document.querySelectorAll('#playersViewToggle .view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#playersViewToggle .view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playersView = btn.dataset.view;
        renderHomePlayers();
      });
    });

    // Teams tier filter
    let currentTier = 'all';
    renderHomeTeams(currentTier);

    document.querySelectorAll('.tier-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTier = tab.dataset.tier;
        renderHomeTeams(currentTier);
      });
    });

    // Players preview
    renderHomePlayers();

    // News preview (top 3)
    renderHomeNews(news.slice(0, 3));

    // Экспортируем функцию перерендера для db-updated
    window._renderHomeAll = function() {
      renderHomeTeams(currentTier);
      renderHomePlayers();
      renderHomeNews(DB.get('pl_news').slice(0, 3));
    };

    // "Показать всех" button click
    document.addEventListener('click', e => {
      if (e.target && e.target.id === 'showAllPlayersBtn') {
        showAllPlayers = true;
        renderHomePlayers();
      }
    });

    // ── render functions ──
    function renderHomeTeams(tier) {
      const grid = document.getElementById('homeTeamsGrid');
      if (!grid) return;
      let list = DB.get('pl_teams');
      if (tier !== 'all') list = list.filter(t => String(t.tier) === String(tier));
      if (!list.length) {
        grid.className = 'teams-grid';
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-shield-halved"></i><p>Команды не найдены</p></div>`;
        return;
      }
      const items = list.slice(0, 10);
      if (teamsView === 'list') {
        grid.className = 'list-view';
        grid.innerHTML = `
          <div class="list-header">
            <span class="lh-num">#</span>
            <span class="lh-name">Команда</span>
            <span class="lh-tier">Тир</span>
            <span class="lh-country">Страна</span>
            <span class="lh-rating">Рейтинг</span>
          </div>
          ${items.map((t, i) => teamListRow(t, i + 1)).join('')}`;
      } else {
        grid.className = 'teams-grid';
        grid.innerHTML = items.map(teamCard).join('');
      }
    }

    function renderHomePlayers() {
      const grid = document.getElementById('homePlayersGrid');
      if (!grid) return;
      const allPlayers = DB.get('pl_players');
      if (!allPlayers.length) {
        grid.className = 'players-grid';
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Игроки не добавлены</p></div>`;
        return;
      }
      const playersList = showAllPlayers ? allPlayers : allPlayers.slice(0, 10);
      const hasMore = !showAllPlayers && allPlayers.length > 10;
      const showAllBtn = hasMore
        ? `<div style="text-align:center;margin-top:24px;">
             <button id="showAllPlayersBtn" class="btn btn-outline">
               <i class="fas fa-users"></i> Показать всех игроков (${allPlayers.length})
             </button>
           </div>`
        : '';

      if (playersView === 'list') {
        grid.className = 'list-view';
        grid.innerHTML = `
          <div class="list-header players-header">
            <span class="lh-num">#</span>
            <span class="lh-name">Игрок</span>
            <span class="lh-tier">Роль</span>
            <span class="lh-country">Команда</span>
            <span class="lh-rating">K/D</span>
            <span class="lh-extra">HS%</span>
          </div>
          ${playersList.map((p, i) => playerListRow(p, i + 1)).join('')}`;
      } else {
        grid.className = 'players-grid';
        grid.innerHTML = playersList.map(playerCard).join('');
      }
      const old = document.getElementById('showAllPlayersBtn');
      if (old) old.parentElement.remove();
      if (hasMore) grid.insertAdjacentHTML('afterend', showAllBtn);
    }

  } // конец init()

}); // конец DOMContentLoaded


function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

function renderHomeNews(newsList) {
  const grid = document.getElementById('homeNewsGrid');
  if (!grid) return;
  if (!newsList.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-newspaper"></i><p>Новостей пока нет</p></div>`;
    return;
  }
  grid.innerHTML = newsList.map(newsCard).join('');
}

function teamCard(t) {
  const logo = t.logo
    ? `<img src="${t.logo}" alt="${t.name}" />`
    : `<span>${t.name.substring(0,2).toUpperCase()}</span>`;
  return `
    <div class="team-card">
      <div class="team-card-top">
        <div class="team-logo">${logo}</div>
        <div class="team-info">
          <div class="team-name">${t.name}</div>
          <div class="team-country"><i class="fas fa-location-dot"></i> ${t.country || '—'}</div>
        </div>
      </div>
      <div class="team-meta">
        <span class="tier-badge tier-${t.tier}">T${t.tier}</span>
        <span class="team-rating">Рейтинг: <span>${t.rating || 0}</span></span>
      </div>
      ${t.description ? `<div class="team-desc">${t.description}</div>` : ''}
    </div>`;
}

function teamListRow(t, num) {
  const logo = t.logo
    ? `<img src="${t.logo}" alt="${t.name}" class="list-logo" />`
    : `<span class="list-logo-placeholder">${t.name.substring(0,2).toUpperCase()}</span>`;
  return `
    <div class="list-row">
      <span class="lh-num lr-num">${num}</span>
      <span class="lh-name lr-name">${logo} <strong>${t.name}</strong></span>
      <span class="lh-tier"><span class="tier-badge tier-${t.tier}">T${t.tier}</span></span>
      <span class="lh-country lr-muted"><i class="fas fa-location-dot"></i> ${t.country || '—'}</span>
      <span class="lh-rating lr-accent">${t.rating || 0}</span>
    </div>`;
}

function playerCard(p) {
  const photo = p.photo
    ? `<img src="${p.photo}" alt="${p.nick}" />`
    : `<i class="fas fa-user"></i>`;
  const stars = renderStars(p.rating || 0);
  const kd   = p.stats && p.stats.kd   ? p.stats.kd          : '—';
  const hs   = p.stats && p.stats.hs   ? p.stats.hs + '%'     : '—';
  const wins = p.stats && p.stats.wins ? p.stats.wins         : '—';
  const adr  = p.stats && p.stats.adr  ? p.stats.adr          : '—';
  return `
    <div class="player-card">
      <div class="player-card-img">
        ${photo}
        ${p.team ? `<span class="player-team-badge">${p.team}</span>` : ''}
      </div>
      <div class="player-card-body">
        <div class="player-nick">${p.nick}</div>
        ${p.name ? `<div class="player-real-name">${p.name}</div>` : ''}
        ${p.role ? `<div class="player-role">${p.role}</div>` : ''}
        <div class="stars">${stars}</div>
        <div class="player-stats">
          <div class="player-stat-item"><span class="player-stat-val">${kd}</span><span class="player-stat-lbl">K/D</span></div>
          <div class="player-stat-item"><span class="player-stat-val">${hs}</span><span class="player-stat-lbl">HS%</span></div>
          <div class="player-stat-item"><span class="player-stat-val">${wins}</span><span class="player-stat-lbl">Побед</span></div>
          <div class="player-stat-item"><span class="player-stat-val">${adr}</span><span class="player-stat-lbl">ADR</span></div>
        </div>
      </div>
    </div>`;
}

function playerListRow(p, num) {
  const photo = p.photo
    ? `<img src="${p.photo}" alt="${p.nick}" class="list-logo" />`
    : `<span class="list-logo-placeholder">${p.nick.substring(0,2).toUpperCase()}</span>`;
  const kd = p.stats && p.stats.kd ? p.stats.kd        : '—';
  const hs = p.stats && p.stats.hs ? p.stats.hs + '%'  : '—';
  return `
    <div class="list-row players-row">
      <span class="lh-num lr-num">${num}</span>
      <span class="lh-name lr-name">${photo} <strong>${p.nick}</strong>${p.name ? `<small class="lr-real">${p.name}</small>` : ''}</span>
      <span class="lh-tier lr-muted">${p.role || '—'}</span>
      <span class="lh-country lr-muted">${p.team || '—'}</span>
      <span class="lh-rating lr-accent">${kd}</span>
      <span class="lh-extra lr-muted">${hs}</span>
    </div>`;
}

function newsCard(n) {
  const catLabels = { general: 'Общее', tournament: 'Турниры', teams: 'Команды', players: 'Игроки' };
  const img = n.image
    ? `<img src="${n.image}" alt="${n.title}" />`
    : `<i class="fas fa-newspaper news-no-img"></i>`;
  const d = new Date(n.date || n.createdAt);
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
    <div class="news-card" onclick="window.location.href='news.html'">
      <div class="news-card-img">
        ${img}
        <span class="news-cat cat-${n.category}">${catLabels[n.category] || n.category}</span>
      </div>
      <div class="news-card-body">
        <div class="news-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
        <div class="news-title">${n.title}</div>
        <div class="news-excerpt">${n.excerpt || ''}</div>
        <span class="news-read-more">Читать далее <i class="fas fa-arrow-right"></i></span>
      </div>
    </div>`;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full)            html += '<i class="fas fa-star star-filled"></i>';
    else if (i === full && half) html += '<i class="fas fa-star-half-stroke star-filled"></i>';
    else                     html += '<i class="fas fa-star star-empty"></i>';
  }
  return html;
}
