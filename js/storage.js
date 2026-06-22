// ══════════════════════════════════════════════════════════════
//  EFL League — MongoDB Storage
// ══════════════════════════════════════════════════════════════

const API_BASE = '/api/data';

// ── localStorage helpers ───────────────────────────────────────
function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e) {
    // localStorage переполнен — чистим и пробуем снова
    console.warn('[DB] ⚠️ localStorage full, clearing...');
    try {
      ['pl_highlights','pl_awards','pl_notifications','pl_invites'].forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify(val));
    } catch(e2) {
      const session = localStorage.getItem('pl_session');
      localStorage.clear();
      if (session) localStorage.setItem('pl_session', session);
      try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
    }
  }
}

// ── Проверка что значение это URL, а не base64 (legacy) ──────
function stripBase64(val) {
  if (!val) return '';
  // Если осталась старая base64 строка — отбрасываем, работаем только с URL
  if (val.startsWith('data:')) return '';
  return val;
}

// ── API запрос к MongoDB ───────────────────────────────────────
async function apiFetch(col, options = {}) {
  const { method = 'GET', id = null, body = null } = options;
  let url = `${API_BASE}?col=${col}`;
  if (id) url += `&id=${id}`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── Конвертеры: MongoDB → localStorage ───────────────────────

function userFromMG(u) {
  return {
    id: u.id || u._id,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role || 'user',
    team: u.team || '',
    teamId: u.team_id || u.teamId || null,
    teamDeletedAt: u.team_deleted_at || u.teamDeletedAt || null,
    avatar: stripBase64(u.avatar || ''),
    faceitUrl: u.faceit_url || u.faceitUrl || '',
    steamUrl: u.steam_url || u.steamUrl || '',
    joinedAt: u.joined_at || u.joinedAt || u.createdAt
  };
}

function playerFromMG(p) {
  return {
    id: p.id || p._id,
    nick: p.nick,
    name: p.name || '',
    team: p.team || '',
    role: p.role || '',
    country: p.country || '',
    rating: p.rating || 0,
    photo: stripBase64(p.photo || ''),
    userId: p.user_id || p.userId,
    stats: {
      kd: p.kd || 0,
      hs: p.hs || 0,
      wins: p.wins || 0,
      matches: p.matches || 0,
      adr: p.adr || 0
    }
  };
}

function teamFromMG(t) {
  return {
    id: t.id || t._id,
    name: t.name,
    tier: t.tier || 3,
    country: t.country || '',
    rating: t.rating || 0,
    logo: stripBase64(t.logo || ''),
    description: t.description || '',
    ownerId: t.owner_id || t.ownerId || null,
    matches: t.matches || 0,
    wins: t.wins || 0,
    losses: t.losses || 0,
    createdAt: t.created_at || t.createdAt
  };
}

function newsFromMG(n) {
  return {
    id: n.id || n._id,
    title: n.title,
    excerpt: n.excerpt || '',
    content: n.content,
    category: n.category || 'general',
    image: stripBase64(n.image || ''),
    createdAt: n.created_at || n.createdAt
  };
}

function tournFromMG(t) {
  return {
    id: t.id || t._id,
    name: t.name,
    status: t.status || 'upcoming',
    prize: t.prize || '',
    format: t.format || '',
    teams: t.teams_count || t.teams || 0,
    location: t.location || 'Online',
    dateStart: t.start_date || t.dateStart || '',
    dateEnd: t.end_date || t.dateEnd || '',
    description: t.description || '',
    banner: stripBase64(t.banner || ''),
    createdAt: t.created_at || t.createdAt
  };
}

function matchFromMG(m) {
  return {
    id: m.id || m._id,
    team1: m.team1,
    team2: m.team2,
    score1: m.score1 || 0,
    score2: m.score2 || 0,
    tournament: m.tournament,
    date: m.match_date || m.date || '',
    status: m.status || 'upcoming',
    url: m.match_url || m.url || '',
    createdAt: m.created_at || m.createdAt
  };
}

function vetoFromMG(v) {
  return {
    id: v.id || v._id,
    team1: v.team1,
    team2: v.team2,
    team1CaptainId: v.team1_captain_id || v.team1CaptainId,
    team2CaptainId: v.team2_captain_id || v.team2CaptainId,
    tournament: v.tournament,
    format: v.format || 'bo1',
    status: v.status || 'waiting',
    maps: v.maps || [],
    steps: v.steps || [],
    pickedMaps: v.picked_maps || v.pickedMaps || [],
    bannedMaps: v.banned_maps || v.bannedMaps || [],
    log: v.log || [],
    currentStep: v.current_step || v.currentStep || 0,
    currentTurn: v.current_turn || v.currentTurn || 'team1',
    action: v.action || 'ban',
    startedAt: v.started_at || v.startedAt || null,
    finishedAt: v.finished_at || v.finishedAt || null,
    createdAt: v.created_at || v.createdAt
  };
}

// ── Конвертеры: localStorage → MongoDB ───────────────────────

function userToMG(u) {
  return {
    username: u.username, email: u.email, password: u.password,
    role: u.role || 'user', team: u.team || null,
    team_id: u.teamId || null, team_deleted_at: u.teamDeletedAt || null,
    avatar: u.avatar || null, faceit_url: u.faceitUrl || null,
    steam_url: u.steamUrl || null
  };
}

function playerToMG(p) {
  return {
    nick: p.nick, name: p.name || '', team: p.team || '',
    role: p.role || '', country: p.country || '', rating: p.rating || 0,
    photo: p.photo || null, user_id: p.userId || null,
    kd: p.stats?.kd || 0, hs: p.stats?.hs || 0,
    wins: p.stats?.wins || 0, matches: p.stats?.matches || 0, adr: p.stats?.adr || 0
  };
}

function teamToMG(t) {
  return {
    name: t.name, tier: t.tier || 3, country: t.country || '',
    rating: t.rating || 0, logo: t.logo || null, description: t.description || null,
    owner_id: t.ownerId || null, matches: t.matches || 0, wins: t.wins || 0, losses: t.losses || 0
  };
}

function newsToMG(n) {
  return {
    title: n.title, excerpt: n.excerpt || null, content: n.content,
    category: n.category || 'general', image: n.image || null
  };
}

function tournToMG(t) {
  return {
    name: t.name, status: t.status || 'upcoming', prize: t.prize || null,
    format: t.format || null, teams_count: t.teams || 0, location: t.location || 'Online',
    start_date: t.dateStart || null, end_date: t.dateEnd || null,
    description: t.description || null, banner: t.banner || null
  };
}

function matchToMG(m) {
  return {
    team1: m.team1, team2: m.team2, score1: m.score1 || 0, score2: m.score2 || 0,
    tournament: m.tournament, match_date: m.date || null,
    status: m.status || 'upcoming', match_url: m.url || null
  };
}

function vetoToMG(v) {
  return {
    team1: v.team1, team2: v.team2,
    team1_captain_id: v.team1CaptainId || null, team2_captain_id: v.team2CaptainId || null,
    tournament: v.tournament, format: v.format || 'bo1', status: v.status || 'waiting',
    maps: v.maps || [], steps: v.steps || [],
    picked_maps: v.pickedMaps || [], banned_maps: v.bannedMaps || [],
    log: v.log || [], current_step: v.currentStep || 0, current_turn: v.currentTurn || 'team1',
    action: v.action || 'ban', started_at: v.startedAt || null, finished_at: v.finishedAt || null
  };
}

// ── Awards конвертеры ─────────────────────────────────────────
function awardFromMG(a) {
  return {
    id:        a.id || a._id?.toString(),
    name:      a.name      || '',
    image:     a.image     || '',
    color:     a.color     || 'gold',
    target:    a.target    || 'player',
    recipient: a.recipient || '',
    desc:      a.desc      || '',
    date:      a.date      || ''
  };
}

function awardToMG(a) {
  return {
    name:      a.name      || '',
    image:     a.image     || '',
    color:     a.color     || 'gold',
    target:    a.target    || 'player',
    recipient: a.recipient || '',
    desc:      a.desc      || '',
    date:      a.date      || ''
  };
}

// ── Карта коллекций ────────────────────────────────────────────
const colMap = {
  pl_users:       { col: 'users',       fromMG: userFromMG,   toMG: userToMG   },
  pl_players:     { col: 'players',     fromMG: playerFromMG, toMG: playerToMG },
  pl_teams:       { col: 'teams',       fromMG: teamFromMG,   toMG: teamToMG   },
  pl_news:        { col: 'news',        fromMG: newsFromMG,   toMG: newsToMG   },
  pl_tournaments: { col: 'tournaments', fromMG: tournFromMG,  toMG: tournToMG  },
  pl_matches:     { col: 'matches',     fromMG: matchFromMG,  toMG: matchToMG  },
  pl_vetos:       { col: 'vetos',       fromMG: vetoFromMG,   toMG: vetoToMG   },
  pl_awards:      { col: 'awards',      fromMG: awardFromMG,  toMG: awardToMG  }
};

// ── DB Ready ───────────────────────────────────────────────────
let _dbReady = false;
window._dbReady = false;

// ── Загрузка данных из MongoDB ─────────────────────────────────
window._syncFromJSONBin = async function() {
  console.log('[DB] 🔄 Загрузка из MongoDB...');

  try {
    const [users, players, teams] = await Promise.all([
      apiFetch('users'),
      apiFetch('players'),
      apiFetch('teams')
    ]);

    lsSet('pl_users',   users.map(userFromMG));
    lsSet('pl_players', players.map(playerFromMG));
    lsSet('pl_teams',   teams.map(teamFromMG));

    _dbReady = true;
    window._dbReady = true;

    console.log(`[DB] ✅ Загружено: ${users.length} users, ${players.length} players`);

    if (window._afterSync) { window._afterSync(); window._afterSync = null; }
    window.dispatchEvent(new CustomEvent('db-updated'));

    // Медленный синк в фоне
    Promise.all([
      apiFetch('news'),
      apiFetch('tournaments'),
      apiFetch('matches'),
      apiFetch('vetos'),
      apiFetch('awards')
    ]).then(([news, tournaments, matches, vetos, awards]) => {
      lsSet('pl_news',        news.map(newsFromMG));
      lsSet('pl_tournaments', tournaments.map(tournFromMG));
      lsSet('pl_matches',     matches.map(matchFromMG));
      lsSet('pl_vetos',       vetos.map(vetoFromMG));
      lsSet('pl_awards',      awards.map(awardFromMG));
      if (!lsGet('pl_invites'))       lsSet('pl_invites', []);
      if (!lsGet('pl_notifications')) lsSet('pl_notifications', []);
      if (!lsGet('pl_highlights'))    lsSet('pl_highlights', []);
      if (!lsGet('pl_tourn_regs'))    lsSet('pl_tourn_regs', {});
      window.dispatchEvent(new CustomEvent('db-updated'));
    }).catch(e => console.warn('[DB] ⚠️ Медленный синк:', e.message));

  } catch(e) {
    console.error('[DB] ❌ Ошибка MongoDB:', e.message);
    _dbReady = true;
    window._dbReady = true;
    if (window._afterSync) { window._afterSync(); window._afterSync = null; }
  }
};

window._syncFromJSONBin();

// ── whenDbReady ────────────────────────────────────────────────
window.whenDbReady = function(fn) {
  if (window._dbReady) { fn(); return; }
  const check = setInterval(() => {
    if (window._dbReady) { clearInterval(check); fn(); }
  }, 100);
};

// ── DB объект ─────────────────────────────────────────────────
const DB = {
  get(key) {
    const v = lsGet(key);
    return Array.isArray(v) ? v : [];
  },
  getObj(key) {
    const v = lsGet(key);
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  },
  set(key, val) {
    lsSet(key, val);
    _pushToMongo(key, val);
  },
  setObj(key, val) {
    lsSet(key, val);
  },

  async insert(lsKey, item) {
    const cfg = colMap[lsKey];
    if (!cfg) {
      const arr = lsGet(lsKey) || [];
      arr.push(item);
      lsSet(lsKey, arr);
      return item;
    }
    try {
      const data = cfg.toMG(item);
      const saved = await apiFetch(cfg.col, { method: 'POST', body: data });
      const converted = cfg.fromMG(saved);
      const arr = lsGet(lsKey) || [];
      arr.push(converted);
      lsSet(lsKey, arr);
      console.log(`[DB] ✅ ${cfg.col}: вставлено id=${converted.id}`);
      return converted;
    } catch(e) {
      console.warn(`[DB] ⚠️ insert ${lsKey}:`, e.message);
      const arr = lsGet(lsKey) || [];
      arr.push(item);
      lsSet(lsKey, arr);
      return item;
    }
  },

  async update(lsKey, id, changes) {
    const cfg = colMap[lsKey];
    const arr = lsGet(lsKey) || [];
    // Сравниваем id как строки — MongoDB возвращает строки, localStorage может хранить числа
    const idx = arr.findIndex(x => String(x.id) === String(id));
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...changes };
      lsSet(lsKey, arr);
    }
    if (!cfg || !id) return;
    try {
      // Берём полный объект если нашли, иначе только changes
      const item = idx !== -1 ? arr[idx] : changes;
      const data = cfg.toMG(item);
      await apiFetch(cfg.col, { method: 'PUT', id: String(id), body: data });
      console.log(`[DB] ✅ ${cfg.col}: обновлено id=${id}`);
    } catch(e) {
      console.warn(`[DB] ⚠️ update ${lsKey}:`, e.message);
    }
  },

  async remove(lsKey, id) {
    const cfg = colMap[lsKey];
    const arr = lsGet(lsKey) || [];
    lsSet(lsKey, arr.filter(x => String(x.id) !== String(id)));
    if (!cfg || !id) return;
    try {
      await apiFetch(cfg.col, { method: 'DELETE', id: String(id) });
      console.log(`[DB] 🗑️ ${cfg.col}: удалено id=${id}`);
    } catch(e) {
      console.warn(`[DB] ⚠️ remove ${lsKey}:`, e.message);
    }
  }
};

// ── Синк в MongoDB при изменениях через DB.set ────────────────
async function _pushToMongo(key, val) {
  const cfg = colMap[key];
  if (!cfg || !Array.isArray(val)) return;

  for (const item of val) {
    if (!item.id) continue;
    try {
      const data = cfg.toMG(item);
      await apiFetch(cfg.col, { method: 'PUT', id: String(item.id), body: data });
    } catch(e) {
      // тихая ошибка — не блокируем UI
    }
  }
}

// ── _afterSync ─────────────────────────────────────────────────
window._afterSync = function() {
  console.log('[DB] ✅ БД готова');

  const currentSession = Auth.current();
  if (currentSession) {
    const users = DB.get('pl_users');
    const fresh =
      users.find(u => u.id === currentSession.id) ||
      users.find(u => u.username?.toLowerCase() === currentSession.username?.toLowerCase()) ||
      users.find(u => u.email === currentSession.email);
    if (fresh) {
      const { password: _, ...safe } = fresh;
      Auth.login(safe);
    }
  }

  // Синк каждые 3 минуты
  setInterval(async () => {
    try {
      const [users, players, teams] = await Promise.all([
        apiFetch('users'),
        apiFetch('players'),
        apiFetch('teams')
      ]);
      lsSet('pl_users',   users.map(userFromMG));
      lsSet('pl_players', players.map(playerFromMG));
      lsSet('pl_teams',   teams.map(teamFromMG));
      window.dispatchEvent(new CustomEvent('db-updated'));
    } catch(e) { /* тихая ошибка */ }
  }, 180000);
};

// Заглушки
window.showSyncIndicator = function() {};
window.hideSyncIndicator = function() {};
window.startAutoSync = function() {};

// ── seedData ───────────────────────────────────────────────────
function seedData() {
  if (!lsGet('pl_invites'))       lsSet('pl_invites', []);
  if (!lsGet('pl_notifications')) lsSet('pl_notifications', []);
  if (!lsGet('pl_vetos'))         lsSet('pl_vetos', []);
  if (!lsGet('pl_highlights'))    lsSet('pl_highlights', []);
  if (!lsGet('pl_awards'))        lsSet('pl_awards', []);
  if (!lsGet('pl_tourn_regs'))    lsSet('pl_tourn_regs', {});
}

seedData();
