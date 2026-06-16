// ══════════════════════════════════════════════════════════════
//  EFL League — Supabase Storage
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yuitjgahybszbuheejbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1aXRqZ2FoeWJzemJ1aGVlamJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjI3NDAsImV4cCI6MjA5NzA5ODc0MH0.1Jhfe3uaLzxKeMqoHYmjDnjf3Vf1D9f2QfR5QlrRyy8';

// Хелпер для запросов к Supabase REST API
async function sbFetch(table, options = {}) {
  const { method = 'GET', filter = '', body = null, select = '*' } = options;
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── Конвертеры: Supabase ↔ localStorage формат ───────────────

// Пользователи
function userFromSB(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role || 'user',
    team: u.team || '',
    avatar: u.avatar || '',
    faceitUrl: u.faceit_url || '',
    steamUrl: u.steam_url || '',
    joinedAt: u.joined_at
  };
}
function userToSB(u) {
  return {
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role || 'user',
    team: u.team || null,
    avatar: u.avatar || null,
    faceit_url: u.faceitUrl || null,
    steam_url: u.steamUrl || null
  };
}

// Игроки
function playerFromSB(p) {
  return {
    id: p.id,
    nick: p.nick,
    name: p.name || '',
    team: p.team || '',
    role: p.role || '',
    country: p.country || '',
    rating: p.rating || 0,
    photo: p.photo || '',
    userId: p.user_id,
    stats: {
      kd: p.kd || 0,
      hs: p.hs || 0,
      wins: p.wins || 0,
      matches: p.matches || 0,
      adr: p.adr || 0
    }
  };
}
function playerToSB(p) {
  return {
    nick: p.nick,
    name: p.name || '',
    team: p.team || '',
    role: p.role || '',
    country: p.country || '',
    rating: p.rating || 0,
    photo: p.photo || null,
    user_id: p.userId || null,
    kd: p.stats?.kd || 0,
    hs: p.stats?.hs || 0,
    wins: p.stats?.wins || 0,
    matches: p.stats?.matches || 0,
    adr: p.stats?.adr || 0
  };
}

// Команды
function teamFromSB(t) {
  return {
    id: t.id,
    name: t.name,
    tier: t.tier || 3,
    country: t.country || '',
    rating: t.rating || 0,
    logo: t.logo || '',
    description: t.description || '',
    ownerId: t.owner_id || null,
    matches: t.matches || 0,
    wins: t.wins || 0,
    losses: t.losses || 0,
    createdAt: t.created_at
  };
}
function teamToSB(t) {
  return {
    name: t.name,
    tier: t.tier || 3,
    country: t.country || '',
    rating: t.rating || 0,
    logo: t.logo || null,
    description: t.description || null,
    owner_id: t.ownerId || null,
    matches: t.matches || 0,
    wins: t.wins || 0,
    losses: t.losses || 0
  };
}

// Новости
function newsFromSB(n) {
  return {
    id: n.id,
    title: n.title,
    excerpt: n.excerpt || '',
    content: n.content,
    category: n.category || 'general',
    image: n.image || '',
    createdAt: n.created_at
  };
}
function newsToSB(n) {
  return {
    title: n.title,
    excerpt: n.excerpt || null,
    content: n.content,
    category: n.category || 'general',
    image: n.image || null
  };
}

// Турниры
function tournFromSB(t) {
  return {
    id: t.id,
    name: t.name,
    status: t.status || 'upcoming',
    prize: t.prize || '',
    format: t.format || '',
    teams: t.teams_count || 0,
    location: t.location || 'Online',
    dateStart: t.start_date || '',
    dateEnd: t.end_date || '',
    description: t.description || '',
    banner: t.banner || '',
    createdAt: t.created_at
  };
}
function tournToSB(t) {
  return {
    name: t.name,
    status: t.status || 'upcoming',
    prize: t.prize || null,
    format: t.format || null,
    teams_count: t.teams || 0,
    location: t.location || 'Online',
    start_date: t.dateStart || null,
    end_date: t.dateEnd || null,
    description: t.description || null,
    banner: t.banner || null
  };
}

// Матчи
function matchFromSB(m) {
  return {
    id: m.id,
    team1: m.team1,
    team2: m.team2,
    score1: m.score1 || 0,
    score2: m.score2 || 0,
    tournament: m.tournament,
    date: m.match_date || '',
    status: m.status || 'upcoming',
    url: m.match_url || '',
    createdAt: m.created_at
  };
}
function matchToSB(m) {
  return {
    team1: m.team1,
    team2: m.team2,
    score1: m.score1 || 0,
    score2: m.score2 || 0,
    tournament: m.tournament,
    match_date: m.date || null,
    status: m.status || 'upcoming',
    match_url: m.url || null
  };
}

// Вето
function vetoFromSB(v) {
  return {
    id: v.id,
    team1: v.team1,
    team2: v.team2,
    team1CaptainId: v.team1_captain_id,
    team2CaptainId: v.team2_captain_id,
    tournament: v.tournament,
    format: v.format || 'bo1',
    status: v.status || 'waiting',
    maps: v.maps || [],
    steps: v.steps || [],
    pickedMaps: v.picked_maps || [],
    bannedMaps: v.banned_maps || [],
    log: v.log || [],
    currentStep: v.current_step || 0,
    currentTurn: v.current_turn || 'team1',
    action: v.action || 'ban',
    startedAt: v.started_at || null,
    finishedAt: v.finished_at || null,
    createdAt: v.created_at
  };
}
function vetoToSB(v) {
  return {
    team1: v.team1,
    team2: v.team2,
    team1_captain_id: v.team1CaptainId || null,
    team2_captain_id: v.team2CaptainId || null,
    tournament: v.tournament,
    format: v.format || 'bo1',
    status: v.status || 'waiting',
    maps: v.maps || [],
    steps: v.steps || [],
    picked_maps: v.pickedMaps || [],
    banned_maps: v.bannedMaps || [],
    log: v.log || [],
    current_step: v.currentStep || 0,
    current_turn: v.currentTurn || 'team1',
    action: v.action || 'ban',
    started_at: v.startedAt || null,
    finished_at: v.finishedAt || null
  };
}

// ── Кэш данных ─────────────────────────────────────────────────
let _cache = {};
let _dbReady = false;
window._dbReady = false;

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

// ── Загрузка всех данных из Supabase ───────────────────────────
window._syncFromJSONBin = async function() {
  console.log('[DB] 🔄 Загрузка из Supabase...');

  // Если в localStorage уже есть данные — сразу помечаем готовность
  const hasCached = lsGet('pl_users') || lsGet('pl_players') || lsGet('pl_teams');
  if (hasCached) {
    _dbReady = true;
    window._dbReady = true;
    console.log('[DB] ⚡ Кэш найден — показываем сразу, обновляем в фоне');
    if (window._afterSync) { window._afterSync(); window._afterSync = null; }
  }

  try {
    const [users, players, teams] = await Promise.all([
      sbFetch('users'),
      sbFetch('players'),
      sbFetch('teams')
    ]);

    lsSet('pl_users',   users.map(userFromSB));
    lsSet('pl_players', players.map(playerFromSB));
    lsSet('pl_teams',   teams.map(teamFromSB));

    _dbReady = true;
    window._dbReady = true;
    window.dispatchEvent(new CustomEvent('db-updated'));

    // Вызываем _afterSync только если не вызвали раньше (нет кэша)
    if (window._afterSync) { window._afterSync(); window._afterSync = null; }

    // Медленный синк остальных таблиц в фоне
    Promise.all([
      sbFetch('news'),
      sbFetch('tournaments'),
      sbFetch('matches'),
      sbFetch('vetos')
    ]).then(([news, tournaments, matches, vetos]) => {
      lsSet('pl_news',        news.map(newsFromSB));
      lsSet('pl_tournaments', tournaments.map(tournFromSB));
      lsSet('pl_matches',     matches.map(matchFromSB));
      lsSet('pl_vetos',       vetos.map(vetoFromSB));
      if (!lsGet('pl_invites'))       lsSet('pl_invites', []);
      if (!lsGet('pl_notifications')) lsSet('pl_notifications', []);
      if (!lsGet('pl_highlights'))    lsSet('pl_highlights', []);
      if (!lsGet('pl_awards'))        lsSet('pl_awards', []);
      if (!lsGet('pl_tourn_regs'))    lsSet('pl_tourn_regs', {});
      console.log(`[DB] ✅ Загружено: ${users.length} users, ${players.length} players`);
      window.dispatchEvent(new CustomEvent('db-updated'));
    }).catch(e => console.warn('[DB] ⚠️ Медленный синк:', e.message));

  } catch(e) {
    console.error('[DB] ❌ Ошибка Supabase:', e.message);
    _dbReady = true;
    window._dbReady = true;
    if (window._afterSync) { window._afterSync(); window._afterSync = null; }
  }
};

window._syncFromJSONBin();

// Хелпер: выполнить функцию когда БД готова
window.whenDbReady = function(fn) {
  if (window._dbReady) { fn(); return; }
  const check = setInterval(() => {
    if (window._dbReady) { clearInterval(check); fn(); }
  }, 100);
};

// ── Основной объект DB ─────────────────────────────────────────
const DB = {
  get(key) {
    // Всегда читаем из localStorage (который синхронизирован с Supabase при загрузке и каждые 10 сек)
    const v = lsGet(key);
    return Array.isArray(v) ? v : [];
  },
  getObj(key) {
    const v = lsGet(key);
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  },
  set(key, val) {
    lsSet(key, val);
    _pushToSupabase(key, val);
  },
  setObj(key, val) {
    lsSet(key, val);
  },

  // ── Прямые методы для надёжной записи в Supabase ──

  // Вставить новую запись прямо в Supabase, обновить localStorage, вернуть запись с реальным ID
  async insert(lsKey, item) {
    const tableMap = {
      pl_users: { table: 'users', toSB: userToSB, fromSB: userFromSB },
      pl_players: { table: 'players', toSB: playerToSB, fromSB: playerFromSB },
      pl_teams: { table: 'teams', toSB: teamToSB, fromSB: teamFromSB },
      pl_news: { table: 'news', toSB: newsToSB, fromSB: newsFromSB },
      pl_tournaments: { table: 'tournaments', toSB: tournToSB, fromSB: tournFromSB },
      pl_matches: { table: 'matches', toSB: matchToSB, fromSB: matchFromSB }
    };
    const cfg = tableMap[lsKey];
    if (!cfg) { // для остальных ключей — просто localStorage
      const arr = lsGet(lsKey) || [];
      arr.push(item);
      lsSet(lsKey, arr);
      return item;
    }
    try {
      const data = cfg.toSB(item);
      delete data.id;
      const inserted = await sbFetch(cfg.table, { method: 'POST', body: data });
      if (inserted && inserted[0]) {
        const saved = cfg.fromSB(inserted[0]);
        const arr = lsGet(lsKey) || [];
        arr.push(saved);
        lsSet(lsKey, arr);
        console.log(`[DB] ✅ ${cfg.table}: вставлено id=${saved.id}`);
        return saved;
      }
    } catch(e) {
      console.warn(`[DB] ⚠️ insert ${lsKey}:`, e.message);
      // Fallback: сохраняем локально
      const arr = lsGet(lsKey) || [];
      arr.push(item);
      lsSet(lsKey, arr);
    }
    return item;
  },

  // Обновить запись по ID прямо в Supabase, обновить localStorage
  async update(lsKey, id, changes) {
    const tableMap = {
      pl_users: { table: 'users', toSB: userToSB, fromSB: userFromSB },
      pl_players: { table: 'players', toSB: playerToSB, fromSB: playerFromSB },
      pl_teams: { table: 'teams', toSB: teamToSB, fromSB: teamFromSB },
      pl_news: { table: 'news', toSB: newsToSB, fromSB: newsFromSB },
      pl_tournaments: { table: 'tournaments', toSB: tournToSB, fromSB: tournFromSB },
      pl_matches: { table: 'matches', toSB: matchToSB, fromSB: matchFromSB }
    };
    const cfg = tableMap[lsKey];
    // Обновляем localStorage
    const arr = lsGet(lsKey) || [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...changes };
      lsSet(lsKey, arr);
    }
    if (!cfg || !id || id > 2000000000000) return; // временный ID — только localStorage
    try {
      const item = arr[idx] || changes;
      const data = cfg.toSB(item);
      await fetch(`${SUPABASE_URL}/rest/v1/${cfg.table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      console.log(`[DB] ✅ ${cfg.table}: обновлено id=${id}`);
    } catch(e) {
      console.warn(`[DB] ⚠️ update ${lsKey}:`, e.message);
    }
  },

  // Удалить запись по ID прямо из Supabase и localStorage
  async remove(lsKey, id) {
    const tableMap = {
      pl_users: 'users', pl_players: 'players', pl_teams: 'teams',
      pl_news: 'news', pl_tournaments: 'tournaments', pl_matches: 'matches', pl_vetos: 'vetos'
    };
    // Удаляем из localStorage
    const arr = lsGet(lsKey) || [];
    lsSet(lsKey, arr.filter(x => x.id !== id));

    const table = tableMap[lsKey];
    if (!table || !id || id > 2000000000000) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      console.log(`[DB] 🗑️ ${table}: удалено id=${id}`);
    } catch(e) {
      console.warn(`[DB] ⚠️ remove ${lsKey}:`, e.message);
    }
  }
};

// ── Запись в Supabase ──────────────────────────────────────────
async function _pushToSupabase(key, val) {
  if (!_dbReady) return;

  try {
    if (key === 'pl_users') {
      await _syncTable('users', val, userToSB, userFromSB);
    } else if (key === 'pl_players') {
      await _syncTable('players', val, playerToSB, playerFromSB);
    } else if (key === 'pl_teams') {
      await _syncTable('teams', val, teamToSB, teamFromSB);
    } else if (key === 'pl_news') {
      await _syncTable('news', val, newsToSB, newsFromSB);
    } else if (key === 'pl_tournaments') {
      await _syncTable('tournaments', val, tournToSB, tournFromSB);
    } else if (key === 'pl_matches') {
      await _syncTable('matches', val, matchToSB, matchFromSB);
    } else if (key === 'pl_vetos') {
      await _syncVetos(val);
    }
  } catch(e) {
    console.warn('[DB] ⚠️ Ошибка записи в Supabase:', e.message);
  }
}

// Прямая синхронизация вето (UPSERT + DELETE удалённых)
async function _syncVetos(items) {
  if (!Array.isArray(items)) return;

  // Получаем все вето из Supabase
  const existing = await sbFetch('vetos', { select: 'id,created_at' });
  const existingByCreated = {};
  const existingIds = new Set();
  existing.forEach(v => {
    existingByCreated[v.created_at] = v.id;
    existingIds.add(v.id);
  });

  // Собираем ID вето которые должны остаться
  const keepIds = new Set();

  for (const item of items) {
    const data = vetoToSB(item);
    const sbId = existingByCreated[item.createdAt] || (item.id && item.id < 2000000000000 ? item.id : null);

    try {
      if (sbId) {
        keepIds.add(sbId);
        // Обновляем существующее в Supabase
        await fetch(`${SUPABASE_URL}/rest/v1/vetos?id=eq.${sbId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        item.id = sbId;
        console.log(`[DB] ✅ Вето ${sbId} обновлено`);
      } else {
        // Новое вето - INSERT
        data.created_at = item.createdAt || new Date().toISOString();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vetos`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(data)
        });
        const inserted = await res.json();
        if (inserted[0]) {
          keepIds.add(inserted[0].id);
          const vetos = lsGet('pl_vetos') || [];
          const idx = vetos.findIndex(v => v.createdAt === item.createdAt);
          if (idx !== -1) {
            vetos[idx].id = inserted[0].id;
            lsSet('pl_vetos', vetos);
          }
          console.log(`[DB] ✅ Новое вето сохранено, ID: ${inserted[0].id}`);
        }
      }
    } catch(e) {
      console.warn('[DB] ⚠️ Ошибка сохранения вето:', e.message);
    }
  }

  // Удаляем из Supabase те вето, которых больше нет в localStorage
  for (const sbId of existingIds) {
    if (!keepIds.has(sbId)) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/vetos?id=eq.${sbId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        console.log(`[DB] 🗑️ Вето ${sbId} удалено из Supabase`);
      } catch(e) {
        console.warn(`[DB] ⚠️ Ошибка удаления вето ${sbId}:`, e.message);
      }
    }
  }
}

// Синхронизация таблицы: добавляем новые, обновляем существующие
async function _syncTable(table, items, toSB, fromSB) {
  if (!Array.isArray(items)) return;

  const existing = await sbFetch(table);

  const uniqueKey = {
    users: 'username', players: 'nick', teams: 'name',
    news: null, tournaments: null, matches: null
  }[table];

  for (const item of items) {
    const data = toSB(item);

    let existingItem = null;
    if (item.id && item.id < 2000000000000) {
      existingItem = existing.find(e => e.id === item.id);
    }
    if (!existingItem && uniqueKey && item[uniqueKey]) {
      existingItem = existing.find(e => e[uniqueKey] === item[uniqueKey]);
    }

    if (existingItem) {
      item.id = existingItem.id;
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${existingItem.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      } catch(e) {
        console.warn(`[DB] ⚠️ ${table} PATCH:`, e.message);
      }
    } else {
      delete data.id;
      try {
        const inserted = await sbFetch(table, { method: 'POST', body: data });
        if (inserted[0]) {
          item.id = inserted[0].id;
          console.log(`[DB] ✅ ${table}: добавлено id=${inserted[0].id}`);
          // Обновляем ID в localStorage чтобы следующий поиск нашёл правильно
          const keyMap = {
            users: 'pl_users', players: 'pl_players', teams: 'pl_teams',
            news: 'pl_news', tournaments: 'pl_tournaments', matches: 'pl_matches'
          };
          const lsKey = keyMap[table];
          if (lsKey) {
            const arr = lsGet(lsKey) || [];
            // найти по уникальному полю и обновить id
            if (uniqueKey) {
              const idx = arr.findIndex(x => (x[uniqueKey] || '').toLowerCase() === (item[uniqueKey] || '').toLowerCase());
              if (idx !== -1) { arr[idx].id = inserted[0].id; lsSet(lsKey, arr); }
            }
          }
        }
      } catch(e) {
        console.warn(`[DB] ⚠️ ${table} INSERT:`, e.message);
      }
    }
  }
}

// ── Очистка игроков без пользователей ──────────────────────────
// Удаляет из localStorage И из Supabase игроков без аккаунта
async function _cleanOrphanPlayers() {
  const users = DB.get('pl_users');
  if (!users.length) return; // данные ещё не загружены — не чистим

  const userNicks = new Set(users.map(u => (u.username || '').toLowerCase()));
  const userIds   = new Set(users.map(u => u.id));
  const players   = DB.get('pl_players');

  const orphans = players.filter(p =>
    !userNicks.has((p.nick || '').toLowerCase()) && !userIds.has(p.userId)
  );

  if (!orphans.length) return;

  console.log(`[DB] 🧹 Найдено лишних игроков: ${orphans.length} — удаляем...`);

  // Удаляем из localStorage
  lsSet('pl_players', players.filter(p =>
    userNicks.has((p.nick || '').toLowerCase()) || userIds.has(p.userId)
  ));

  // Удаляем из Supabase
  for (const p of orphans) {
    if (!p.id || p.id > 2000000000000) continue;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${p.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      console.log(`[DB] 🗑️ Игрок без аккаунта удалён: ${p.nick} (id=${p.id})`);
    } catch(e) {
      console.warn(`[DB] ⚠️ Ошибка удаления игрока ${p.nick}:`, e.message);
    }
  }
}

// ── seedData ───────────────────────────────────────────────────
function seedData() {
  const ensureKey = (key, defaultVal) => {
    if (!lsGet(key)) {
      if (key === 'pl_tourn_regs') {
        lsSet(key, defaultVal);
      } else {
        lsSet(key, defaultVal);
      }
    }
  };
  ensureKey('pl_invites', []);
  ensureKey('pl_notifications', []);
  ensureKey('pl_vetos', []);
  ensureKey('pl_highlights', []);
  ensureKey('pl_awards', []);
  ensureKey('pl_tourn_regs', {});
}

seedData();

// ── Создаёт записи players для пользователей у которых их нет ──
async function _syncMissingPlayers() {
  const users   = DB.get('pl_users');
  const players = DB.get('pl_players');
  if (!users.length) return;

  const playerNicks = new Set(players.map(p => (p.nick || '').toLowerCase()));
  const playerUserIds = new Set(players.map(p => p.userId).filter(Boolean));

  const missing = users.filter(u =>
    u.role !== 'admin' &&
    !playerUserIds.has(u.id) &&
    !playerNicks.has((u.username || '').toLowerCase())
  );

  if (!missing.length) return;
  console.log(`[DB] 🔧 Создаём записи players для ${missing.length} пользователей без них`);

  for (const u of missing) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          nick: u.username, name: '', team: '', role: '',
          country: '', rating: 0, photo: u.avatar || null,
          user_id: u.id, kd: 0, hs: 0, wins: 0, matches: 0, adr: 0
        })
      });
      const inserted = await res.json();
      if (inserted && inserted[0]) {
        players.push(playerFromSB(inserted[0]));
        console.log(`[DB] ✅ Игрок создан для ${u.username}`);
      }
    } catch(e) { console.warn(`[DB] ⚠️ Не удалось создать игрока для ${u.username}:`, e.message); }
  }

  lsSet('pl_players', players);
  window.dispatchEvent(new CustomEvent('db-updated'));
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

  // Авто-создание записей players для пользователей у которых их нет
  _syncMissingPlayers();

  // Чистка сиротских игроков отключена
  // _cleanOrphanPlayers();

  // Быстрый синк каждые 45 сек — только критичные данные (3 запроса)
  setInterval(async () => {
    try {
      const [users, players, teams] = await Promise.all([
        sbFetch('users'),
        sbFetch('players'),
        sbFetch('teams')
      ]);
      lsSet('pl_users',   users.map(userFromSB));
      lsSet('pl_players', players.map(playerFromSB));
      lsSet('pl_teams',   teams.map(teamFromSB));
      window.dispatchEvent(new CustomEvent('db-updated'));
    } catch(e) { /* тихая ошибка */ }
  }, 45000);

  // Медленный синк каждые 2 мин — новости/матчи/турниры (не критично)
  setInterval(async () => {
    try {
      const [news, tournaments, matches] = await Promise.all([
        sbFetch('news'),
        sbFetch('tournaments'),
        sbFetch('matches')
      ]);
      lsSet('pl_news',        news.map(newsFromSB));
      lsSet('pl_tournaments', tournaments.map(tournFromSB));
      lsSet('pl_matches',     matches.map(matchFromSB));
    } catch(e) { /* тихая ошибка */ }
  }, 120000);
};

// Заглушки
window.showSyncIndicator = function() {};
window.hideSyncIndicator = function() {};
window.startAutoSync = function() {};
