// ── ADMIN PANEL embedded in Profile page ─────────────────────────
// Runs after profile.js; only activates for admin role.

(function () {
  'use strict';

  /* Wait until profile.js has finished rendering (it runs on DOMContentLoaded,
     so we wait for the same event — since scripts are deferred sequentially we
     run after profile.js already registered its listener, but to be safe we
     use a short poll). */
  function init() {
    const user = Auth.current();
    if (!user || user.role !== 'admin') return;

    // Show the whole admin section
    const section = document.getElementById('adminPanelSection');
    if (!section) return;
    section.style.display = 'block';

    // Add "Управление" tab to the profile tabs rendered by profile.js
    injectAdminTab();

    // Wire sub-tabs
    document.querySelectorAll('.ap-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ap-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.ap-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.ap);
        if (target) target.classList.add('active');
      });
    });

    // Render all sub-panels
    updateOverview();
    renderTeams();
    renderPlayers();
    renderNews();
    renderTournaments();
    renderMatches();
    renderUsers();

    // Wire team form
    wireTeams();
    wirePlayers();
    wireNews();
    wireTournaments();
    wireMatches();
    wireUsers();
  }

  // ── Inject a "Управление" tab into the profile pp-tabs bar ──────
  function injectAdminTab() {
    // profile.js renders .pp-tabs; wait a tick if not yet in DOM
    const attempt = (tries) => {
      const tabs = document.querySelector('.pp-tabs');
      if (!tabs) {
        if (tries > 20) return;
        setTimeout(() => attempt(tries + 1), 100);
        return;
      }
      // avoid double-injection
      if (tabs.querySelector('[data-tab="admin"]')) return;
      const btn = document.createElement('button');
      btn.className = 'pp-tab';
      btn.dataset.tab = 'admin';
      btn.innerHTML = '<i class="fas fa-shield-halved"></i> Управление';
      btn.addEventListener('click', () => {
        // deactivate profile tabs
        document.querySelectorAll('.pp-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pp-tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        // scroll to admin section
        const section = document.getElementById('adminPanelSection');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tabs.appendChild(btn);
    };
    attempt(0);
  }

  // ── Overview ─────────────────────────────────────────────────
  function updateOverview() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('apStatTeams',       DB.get('pl_teams').length);
    set('apStatPlayers',     DB.get('pl_players').length);
    set('apStatNews',        DB.get('pl_news').length);
    set('apStatTournaments', getTournaments().length);
    set('apStatMatches',     DB.get('pl_matches').length);
  }

  // ── Helpers ───────────────────────────────────────────────────
  function toggleForm(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'numeric' });
  }

  // ══════════════════════════════════════════════════════════════
  // TEAMS
  // ══════════════════════════════════════════════════════════════
  let _editTeamId = null;

  function renderTeams() {
    const tbody = document.getElementById('apTeamsBody');
    if (!tbody) return;
    const teams = DB.get('pl_teams');
    if (!teams.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="ap-empty">Нет команд</td></tr>`;
      return;
    }
    tbody.innerHTML = teams.map(t => `
      <tr>
        <td><strong>${esc(t.name)}</strong></td>
        <td><span class="tier-badge tier-${t.tier}">T${t.tier}</span></td>
        <td>${esc(t.country) || '—'}</td>
        <td>${t.rating || 0}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="apEditTeam(${t.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="apDeleteTeam(${t.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
  }

  function wireTeams() {
    document.getElementById('apAddTeamBtn')?.addEventListener('click', () => {
      _editTeamId = null;
      const el = document.getElementById('apTeamFormTitle');
      if (el) el.textContent = 'Добавить команду';
      clearTeamForm();
      toggleForm('apTeamForm', true);
      document.getElementById('apTeamForm')?.scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('apCancelTeamBtn')?.addEventListener('click', () => toggleForm('apTeamForm', false));
    document.getElementById('apSaveTeamBtn')?.addEventListener('click', saveTeam);
  }

  function clearTeamForm() {
    ['apTeamName','apTeamCountry','apTeamRating','apTeamDesc'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const tier = document.getElementById('apTeamTier');
    if (tier) tier.value = '1';
    document.getElementById('apTeamEditId').value = '';
  }

  function saveTeam() {
    const name = document.getElementById('apTeamName')?.value.trim();
    if (!name) { showToast('Введите название команды', 'error'); return; }
    const teams = DB.get('pl_teams');
    const entry = {
      id: _editTeamId || Date.now(),
      name,
      tier: parseInt(document.getElementById('apTeamTier')?.value) || 1,
      country: document.getElementById('apTeamCountry')?.value.trim() || '',
      rating: parseInt(document.getElementById('apTeamRating')?.value) || 0,
      description: document.getElementById('apTeamDesc')?.value.trim() || '',
      logo: _editTeamId ? (teams.find(t => t.id === _editTeamId)?.logo || '') : ''
    };
    if (_editTeamId !== null) {
      const idx = teams.findIndex(t => t.id === _editTeamId);
      if (idx !== -1) teams[idx] = entry;
    } else {
      teams.push(entry);
    }
    DB.set('pl_teams', teams);
    toggleForm('apTeamForm', false);
    renderTeams();
    updateOverview();
    showToast(_editTeamId ? 'Команда обновлена' : 'Команда добавлена');
    // Discord уведомление только при создании новой команды
    if (!_editTeamId && window.notifyNewTeam) notifyNewTeam(entry);
  }

  window.apEditTeam = (id) => {
    const t = DB.get('pl_teams').find(x => x.id === id);
    if (!t) return;
    _editTeamId = id;
    const el = document.getElementById('apTeamFormTitle');
    if (el) el.textContent = 'Редактировать команду';
    document.getElementById('apTeamName').value    = t.name;
    document.getElementById('apTeamTier').value    = t.tier;
    document.getElementById('apTeamCountry').value = t.country || '';
    document.getElementById('apTeamRating').value  = t.rating || '';
    document.getElementById('apTeamDesc').value    = t.description || '';
    toggleForm('apTeamForm', true);
    document.getElementById('apTeamForm')?.scrollIntoView({ behavior:'smooth' });
  };

  window.apDeleteTeam = (id) => {
    if (!confirm('Удалить команду?')) return;
    DB.set('pl_teams', DB.get('pl_teams').filter(t => t.id !== id));
    renderTeams();
    updateOverview();
    showToast('Команда удалена', 'error');
  };

  // ══════════════════════════════════════════════════════════════
  // PLAYERS
  // ══════════════════════════════════════════════════════════════
  let _editPlayerId = null;
  let _playerSearchQuery = '';

  function renderPlayers() {
    const tbody = document.getElementById('apPlayersBody');
    if (!tbody) return;
    let players = DB.get('pl_players');

    // фильтрация по поиску
    if (_playerSearchQuery) {
      const q = _playerSearchQuery.toLowerCase();
      players = players.filter(p =>
        (p.nick || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.team || '').toLowerCase().includes(q) ||
        (p.role || '').toLowerCase().includes(q)
      );
    }

    if (!players.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="ap-empty">${_playerSearchQuery ? 'Ничего не найдено' : 'Нет игроков'}</td></tr>`;
      return;
    }
    tbody.innerHTML = players.map(p => `
      <tr>
        <td><strong>${esc(p.nick)}</strong></td>
        <td>${esc(p.name) || '—'}</td>
        <td>${esc(p.team) || '—'}</td>
        <td>${esc(p.role) || '—'}</td>
        <td>${(p.stats && p.stats.kd) ? p.stats.kd : '—'}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="apEditPlayer(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="apDeletePlayer(${p.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
  }

  function populatePlayerTeams(selectedTeam) {
    const sel = document.getElementById('apPlayerTeam');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Без команды —</option>';
    DB.get('pl_teams').forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      if (t.name === selectedTeam) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function wirePlayers() {
    // Поиск
    const searchInput = document.getElementById('apPlayerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        _playerSearchQuery = searchInput.value.trim();
        renderPlayers();
      });
    }

    document.getElementById('apAddPlayerBtn')?.addEventListener('click', () => {
      _editPlayerId = null;
      const el = document.getElementById('apPlayerFormTitle');
      if (el) el.textContent = 'Добавить игрока';
      clearPlayerForm();
      populatePlayerTeams('');
      toggleForm('apPlayerForm', true);
      document.getElementById('apPlayerForm')?.scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('apCancelPlayerBtn')?.addEventListener('click', () => toggleForm('apPlayerForm', false));
    document.getElementById('apSavePlayerBtn')?.addEventListener('click', savePlayer);
  }

  function clearPlayerForm() {
    ['apPlayerNick','apPlayerName','apPlayerCountry','apStatKD','apStatHS','apStatADR','apStatWins','apStatMatches'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const role = document.getElementById('apPlayerRole');
    if (role) role.value = '';
  }

  function savePlayer() {
    const nick = document.getElementById('apPlayerNick')?.value.trim();
    if (!nick) { showToast('Введите никнейм', 'error'); return; }
    const players = DB.get('pl_players');
    const existing = _editPlayerId ? players.find(p => p.id === _editPlayerId) : null;
    const entry = {
      id: _editPlayerId || Date.now(),
      nick,
      name:    document.getElementById('apPlayerName')?.value.trim() || '',
      team:    document.getElementById('apPlayerTeam')?.value || '',
      role:    document.getElementById('apPlayerRole')?.value || '',
      country: document.getElementById('apPlayerCountry')?.value.trim() || '',
      rating:  parseFloat(document.getElementById('apPlayerRating')?.value) || 0,
      photo:   existing?.photo || '',
      stats: {
        kd:      parseFloat(document.getElementById('apStatKD')?.value) || 0,
        hs:      parseInt(document.getElementById('apStatHS')?.value) || 0,
        adr:     parseFloat(document.getElementById('apStatADR')?.value) || 0,
        wins:    parseInt(document.getElementById('apStatWins')?.value) || 0,
        matches: parseInt(document.getElementById('apStatMatches')?.value) || 0,
      }
    };
    if (_editPlayerId !== null) {
      const idx = players.findIndex(p => p.id === _editPlayerId);
      if (idx !== -1) players[idx] = entry;
    } else {
      players.push(entry);
    }
    DB.set('pl_players', players);
    toggleForm('apPlayerForm', false);
    renderPlayers();
    updateOverview();
    showToast(_editPlayerId ? 'Игрок обновлён' : 'Игрок добавлен');
  }

  window.apEditPlayer = (id) => {
    const p = DB.get('pl_players').find(x => x.id === id);
    if (!p) return;
    _editPlayerId = id;
    const el = document.getElementById('apPlayerFormTitle');
    if (el) el.textContent = 'Редактировать игрока';
    populatePlayerTeams(p.team || '');
    document.getElementById('apPlayerNick').value    = p.nick;
    document.getElementById('apPlayerName').value    = p.name || '';
    document.getElementById('apPlayerRole').value    = p.role || '';
    document.getElementById('apPlayerCountry').value = p.country || '';
    if (p.stats) {
      document.getElementById('apStatKD').value      = p.stats.kd || '';
      document.getElementById('apStatHS').value      = p.stats.hs || '';
      document.getElementById('apStatADR').value     = p.stats.adr || '';
      document.getElementById('apStatWins').value    = p.stats.wins || '';
      document.getElementById('apStatMatches').value = p.stats.matches || '';
    }
    toggleForm('apPlayerForm', true);
    document.getElementById('apPlayerForm')?.scrollIntoView({ behavior:'smooth' });
  };

  window.apDeletePlayer = (id) => {
    if (!confirm('Удалить игрока?')) return;
    DB.set('pl_players', DB.get('pl_players').filter(p => p.id !== id));
    renderPlayers();
    updateOverview();
    showToast('Игрок удалён', 'error');
  };

  // ══════════════════════════════════════════════════════════════
  // NEWS
  // ══════════════════════════════════════════════════════════════
  let _editNewsId = null;
  const NEWS_CAT_LABELS = { general:'Общее', tournament:'Турниры', teams:'Команды', players:'Игроки' };

  function renderNews() {
    const tbody = document.getElementById('apNewsBody');
    if (!tbody) return;
    const list = DB.get('pl_news').slice().reverse();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="ap-empty">Нет новостей</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(n => `
      <tr>
        <td style="max-width:280px"><strong>${esc(n.title)}</strong></td>
        <td><span class="news-cat cat-${n.category}" style="position:static;display:inline-block;font-size:0.72rem">${NEWS_CAT_LABELS[n.category] || n.category}</span></td>
        <td>${fmtDate(n.date)}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="apEditNews(${n.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="apDeleteNews(${n.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
  }

  function wireNews() {
    document.getElementById('apAddNewsBtn')?.addEventListener('click', () => {
      _editNewsId = null;
      const el = document.getElementById('apNewsFormTitle');
      if (el) el.textContent = 'Добавить новость';
      clearNewsForm();
      toggleForm('apNewsForm', true);
      document.getElementById('apNewsForm')?.scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('apCancelNewsBtn')?.addEventListener('click', () => toggleForm('apNewsForm', false));
    document.getElementById('apSaveNewsBtn')?.addEventListener('click', saveNews);
  }

  function clearNewsForm() {
    ['apNewsTitle','apNewsExcerpt','apNewsContent'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cat = document.getElementById('apNewsCategory');
    if (cat) cat.value = 'general';
  }

  function saveNews() {
    const title   = document.getElementById('apNewsTitle')?.value.trim();
    const content = document.getElementById('apNewsContent')?.value.trim();
    if (!title || !content) { showToast('Заполните заголовок и текст', 'error'); return; }
    const list = DB.get('pl_news');
    const existing = _editNewsId ? list.find(n => n.id === _editNewsId) : null;
    const entry = {
      id: _editNewsId || Date.now(),
      title,
      excerpt:  document.getElementById('apNewsExcerpt')?.value.trim() || '',
      content,
      image:    existing?.image || '',
      category: document.getElementById('apNewsCategory')?.value || 'general',
      date:     existing ? existing.date : new Date().toISOString()
    };
    if (_editNewsId !== null) {
      const idx = list.findIndex(n => n.id === _editNewsId);
      if (idx !== -1) list[idx] = entry;
    } else {
      list.push(entry);
    }
    DB.set('pl_news', list);
    toggleForm('apNewsForm', false);
    renderNews();
    updateOverview();
    showToast(_editNewsId ? 'Новость обновлена' : 'Новость опубликована');
  }

  window.apEditNews = (id) => {
    const n = DB.get('pl_news').find(x => x.id === id);
    if (!n) return;
    _editNewsId = id;
    const el = document.getElementById('apNewsFormTitle');
    if (el) el.textContent = 'Редактировать новость';
    document.getElementById('apNewsTitle').value    = n.title;
    document.getElementById('apNewsExcerpt').value  = n.excerpt || '';
    document.getElementById('apNewsContent').value  = n.content || '';
    document.getElementById('apNewsCategory').value = n.category || 'general';
    toggleForm('apNewsForm', true);
    document.getElementById('apNewsForm')?.scrollIntoView({ behavior:'smooth' });
  };

  window.apDeleteNews = (id) => {
    if (!confirm('Удалить новость?')) return;
    DB.set('pl_news', DB.get('pl_news').filter(n => n.id !== id));
    renderNews();
    updateOverview();
    showToast('Новость удалена', 'error');
  };

  // ══════════════════════════════════════════════════════════════
  // TOURNAMENTS
  // ══════════════════════════════════════════════════════════════
  let _editTournId = null;
  let _tournImageData = '';
  const TOURN_STATUS_LABELS = { upcoming:'Предстоящий', ongoing:'Идёт', finished:'Завершён' };
  const TOURN_STATUS_COLORS = { upcoming:'#FFB300', ongoing:'var(--success)', finished:'var(--text-muted)' };

  function getTournaments() {
    try {
      const raw = localStorage.getItem('pl_tournaments');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }
  function setTournaments(list) {
    localStorage.setItem('pl_tournaments', JSON.stringify(list));
  }

  function renderTournaments() {
    const tbody = document.getElementById('apTournamentsBody');
    if (!tbody) return;
    const list = getTournaments();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="ap-empty">Нет турниров</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(t => `
      <tr>
        <td>${t.image
          ? `<img src="${t.image}" style="width:60px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--border)" />`
          : `<div style="width:60px;height:36px;border-radius:6px;background:var(--bg-secondary);border:1px solid var(--border);display:flex;align-items:center;justify-content:center"><i class="fas fa-trophy" style="color:var(--text-dim);font-size:0.85rem"></i></div>`
        }</td>
        <td><strong>${esc(t.name)}</strong></td>
        <td><span style="color:${TOURN_STATUS_COLORS[t.status] || 'var(--text-muted)'};font-weight:600;font-size:0.82rem">${TOURN_STATUS_LABELS[t.status] || t.status}</span></td>
        <td style="color:#FFB300;font-weight:600">${esc(t.prize) || '—'}</td>
        <td>${fmtDate(t.dateStart)}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="apEditTourn('${t.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="apDeleteTourn('${t.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
  }

  function wireTournaments() {
    document.getElementById('apAddTournBtn')?.addEventListener('click', () => {
      _editTournId = null;
      _tournImageData = '';
      const el = document.getElementById('apTournFormTitle');
      if (el) el.textContent = 'Добавить турнир';
      clearTournForm();
      toggleForm('apTournForm', true);
      document.getElementById('apTournForm')?.scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('apCancelTournBtn')?.addEventListener('click', () => toggleForm('apTournForm', false));
    document.getElementById('apSaveTournBtn')?.addEventListener('click', saveTourn);

    // Image upload
    const area     = document.getElementById('apTournImageArea');
    const input    = document.getElementById('apTournImage');
    const preview  = document.getElementById('apTournImagePreview');
    const imgEl    = document.getElementById('apTournImageImg');
    const removeBtn= document.getElementById('apRemoveTournImage');
    if (area && input) {
      area.addEventListener('click', () => input.click());
      area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--primary)'; });
      area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
      area.addEventListener('drop', e => {
        e.preventDefault(); area.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) readTournImg(file);
      });
      input.addEventListener('change', () => { if (input.files[0]) readTournImg(input.files[0]); });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        _tournImageData = '';
        if (preview) preview.style.display = 'none';
        if (imgEl)   imgEl.src = '';
        if (input)   input.value = '';
      });
    }
    function readTournImg(file) {
      // Превью сразу локально
      const reader = new FileReader();
      reader.onload = e => {
        if (imgEl)   imgEl.src = e.target.result;
        if (preview) preview.style.display = 'flex';
      };
      reader.readAsDataURL(file);
      // Загрузка на ImgBB
      if (imgEl) imgEl.style.opacity = '0.5';
      uploadFileToImgBB(file).then(url => {
        _tournImageData = url;
        if (imgEl) { imgEl.src = url; imgEl.style.opacity = '1'; }
        console.log('[IMGBB] ✅ Баннер турнира загружен:', url);
      }).catch(e => {
        if (imgEl) imgEl.style.opacity = '1';
        console.error('[IMGBB] ❌', e.message);
        showToast('Ошибка загрузки изображения', 'error');
        _tournImageData = '';
      });
    }
  }

  function clearTournForm() {
    ['apTournName','apTournPrize','apTournFormat','apTournTeams','apTournLocation','apTournDateStart','apTournDateEnd','apTournDesc'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const st = document.getElementById('apTournStatus');
    if (st) st.value = 'upcoming';
    document.getElementById('apTournEditId').value = '';
    _tournImageData = '';
    const preview = document.getElementById('apTournImagePreview');
    const imgEl   = document.getElementById('apTournImageImg');
    if (preview) preview.style.display = 'none';
    if (imgEl)   imgEl.src = '';
  }

  function saveTourn() {
    const name = document.getElementById('apTournName')?.value.trim();
    if (!name) { showToast('Введите название турнира', 'error'); return; }
    const list = getTournaments();
    const existing = _editTournId ? list.find(t => t.id === _editTournId) : null;
    const entry = {
      id:          _editTournId || ('t' + Date.now()),
      name,
      game:        'CS2',
      status:      document.getElementById('apTournStatus')?.value || 'upcoming',
      prize:       document.getElementById('apTournPrize')?.value.trim() || '—',
      format:      document.getElementById('apTournFormat')?.value.trim() || '—',
      teams:       parseInt(document.getElementById('apTournTeams')?.value) || 0,
      location:    document.getElementById('apTournLocation')?.value.trim() || 'Online',
      dateStart:   document.getElementById('apTournDateStart')?.value || '',
      dateEnd:     document.getElementById('apTournDateEnd')?.value || '',
      description: document.getElementById('apTournDesc')?.value.trim() || '',
      image:       _tournImageData || (existing ? existing.image : '')
    };
    if (_editTournId !== null) {
      const idx = list.findIndex(t => t.id === _editTournId);
      if (idx !== -1) list[idx] = entry;
    } else {
      list.push(entry);
    }
    setTournaments(list);
    toggleForm('apTournForm', false);
    renderTournaments();
    updateOverview();
    showToast(_editTournId ? 'Турнир обновлён' : 'Турнир добавлен');
  }

  window.apEditTourn = (id) => {
    const t = getTournaments().find(x => x.id === id);
    if (!t) return;
    _editTournId = id;
    const el = document.getElementById('apTournFormTitle');
    if (el) el.textContent = 'Редактировать турнир';
    document.getElementById('apTournName').value      = t.name;
    document.getElementById('apTournStatus').value    = t.status;
    document.getElementById('apTournPrize').value     = t.prize || '';
    document.getElementById('apTournFormat').value    = t.format || '';
    document.getElementById('apTournTeams').value     = t.teams || '';
    document.getElementById('apTournLocation').value  = t.location || '';
    document.getElementById('apTournDateStart').value = t.dateStart || '';
    document.getElementById('apTournDateEnd').value   = t.dateEnd || '';
    document.getElementById('apTournDesc').value      = t.description || '';
    // restore image
    _tournImageData = t.image || '';
    const imgEl  = document.getElementById('apTournImageImg');
    const preview= document.getElementById('apTournImagePreview');
    if (t.image && imgEl && preview) {
      imgEl.src = t.image;
      preview.style.display = 'flex';
    } else if (preview) {
      preview.style.display = 'none';
    }
    toggleForm('apTournForm', true);
    document.getElementById('apTournForm')?.scrollIntoView({ behavior:'smooth' });
  };

  window.apDeleteTourn = (id) => {
    if (!confirm('Удалить турнир?')) return;
    setTournaments(getTournaments().filter(t => t.id !== id));
    renderTournaments();
    updateOverview();
    showToast('Турнир удалён', 'error');
  };

  // ══════════════════════════════════════════════════════════════
  // MATCHES
  // ══════════════════════════════════════════════════════════════
  let _editMatchId = null;

  function renderMatches() {
    const tbody = document.getElementById('apMatchesBody');
    if (!tbody) return;
    const list = DB.get('pl_matches').slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="ap-empty">Матчей нет</td></tr>`;
      return;
    }
    const statusColors = { upcoming:'var(--accent)', finished:'var(--success)' };
    const statusLabels = { upcoming:'Предстоящий', finished:'Завершён' };
    tbody.innerHTML = list.map(m => `
      <tr>
        <td><strong>${esc(m.team1)}</strong></td>
        <td style="text-align:center;font-weight:700">${m.status === 'upcoming' ? '—' : `${m.score1} : ${m.score2}`}</td>
        <td><strong>${esc(m.team2)}</strong></td>
        <td style="font-size:0.82rem;max-width:160px">${esc(m.tournament)}</td>
        <td style="font-size:0.8rem">${fmtDate(m.date)}</td>
        <td><span style="color:${statusColors[m.status]||'var(--text-muted)'};font-weight:600;font-size:0.8rem">${statusLabels[m.status]||m.status}</span></td>
        <td><div class="action-btns">
          ${m.url ? `<a href="${m.url}" target="_blank" class="btn btn-sm btn-outline" title="xplay"><i class="fas fa-external-link-alt"></i></a>` : ''}
          <button class="btn btn-sm btn-outline" onclick="apEditMatch(${m.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="apDeleteMatch(${m.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('');
  }

  function populateMatchTeams() {
    const teams = DB.get('pl_teams');
    ['apMatchTeam1','apMatchTeam2'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">— Выберите —</option>';
      teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name; opt.textContent = t.name;
        sel.appendChild(opt);
      });
    });
  }

  function wireMatches() {
    document.getElementById('apAddMatchBtn')?.addEventListener('click', () => {
      _editMatchId = null;
      const el = document.getElementById('apMatchFormTitle');
      if (el) el.textContent = 'Добавить матч';
      clearMatchForm();
      populateMatchTeams();
      toggleForm('apMatchForm', true);
      document.getElementById('apMatchForm')?.scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('apCancelMatchBtn')?.addEventListener('click', () => toggleForm('apMatchForm', false));
    document.getElementById('apSaveMatchBtn')?.addEventListener('click', saveMatch);
  }

  function clearMatchForm() {
    document.getElementById('apMatchScore1').value    = '0';
    document.getElementById('apMatchScore2').value    = '0';
    document.getElementById('apMatchTournament').value = '';
    document.getElementById('apMatchDate').value       = '';
    document.getElementById('apMatchStatus').value     = 'upcoming';
    document.getElementById('apMatchUrl').value        = '';
    document.getElementById('apMatchEditId').value     = '';
  }

  function saveMatch() {
    const team1      = document.getElementById('apMatchTeam1')?.value;
    const team2      = document.getElementById('apMatchTeam2')?.value;
    const tournament = document.getElementById('apMatchTournament')?.value.trim();
    if (!team1 || !team2 || team1 === team2) { showToast('Выберите разные команды', 'error'); return; }
    if (!tournament) { showToast('Введите название турнира', 'error'); return; }
    const dateVal = document.getElementById('apMatchDate')?.value;
    const entry = {
      id:         _editMatchId || Date.now(),
      team1, team2,
      score1:     parseInt(document.getElementById('apMatchScore1')?.value) || 0,
      score2:     parseInt(document.getElementById('apMatchScore2')?.value) || 0,
      tournament,
      url:        document.getElementById('apMatchUrl')?.value.trim() || '',
      date:       dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
      status:     document.getElementById('apMatchStatus')?.value || 'upcoming'
    };
    const list = DB.get('pl_matches');
    if (_editMatchId !== null) {
      const idx = list.findIndex(m => m.id === _editMatchId);
      if (idx !== -1) list[idx] = entry;
    } else {
      list.push(entry);
    }
    DB.set('pl_matches', list);
    toggleForm('apMatchForm', false);
    renderMatches();
    updateOverview();
    showToast(_editMatchId ? 'Матч обновлён' : 'Матч добавлен');
  }

  window.apEditMatch = (id) => {
    const m = DB.get('pl_matches').find(x => x.id === id);
    if (!m) return;
    _editMatchId = id;
    const el = document.getElementById('apMatchFormTitle');
    if (el) el.textContent = 'Редактировать матч';
    clearMatchForm();
    populateMatchTeams();
    document.getElementById('apMatchTeam1').value    = m.team1;
    document.getElementById('apMatchTeam2').value    = m.team2;
    document.getElementById('apMatchScore1').value   = m.score1;
    document.getElementById('apMatchScore2').value   = m.score2;
    document.getElementById('apMatchTournament').value = m.tournament;
    document.getElementById('apMatchStatus').value   = m.status;
    document.getElementById('apMatchUrl').value      = m.url || '';
    if (m.date) {
      const d = new Date(m.date);
      const pad = n => String(n).padStart(2,'0');
      document.getElementById('apMatchDate').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    toggleForm('apMatchForm', true);
    document.getElementById('apMatchForm')?.scrollIntoView({ behavior:'smooth' });
  };

  window.apDeleteMatch = (id) => {
    if (!confirm('Удалить матч?')) return;
    DB.set('pl_matches', DB.get('pl_matches').filter(m => m.id !== id));
    renderMatches();
    updateOverview();
    showToast('Матч удалён', 'error');
  };

  // ══════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════
  // ── Boot ──────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Profile.js already ran; DOM is ready
    init();
  }
})();
