// ══════════════════════════════════════════
//  VETO SYSTEM — veto.js
// ══════════════════════════════════════════

(function () {

  // ── Карты: изображения + fallback градиенты ──
  const MAP_IMAGES = {
    'Dust2':    'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_dust2.png',
    'Mirage':   'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_mirage.png',
    'Nuke':     'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_nuke.png',
    'Ancient':  'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_ancient.png',
    'Inferno':  'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_inferno.png',
    'Overpass': 'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_overpass.png',
    'Anubis':   'https://cdn.jsdelivr.net/gh/ghostcap-gaming/cs2-map-images@main/cs2/de_anubis.png',
  };

  const MAP_GRADIENTS = {
    'Dust2':    'linear-gradient(160deg, #c8a96e, #8b6914)',
    'Mirage':   'linear-gradient(160deg, #e8d5a3, #9c7c3a)',
    'Nuke':     'linear-gradient(160deg, #6b9b6b, #3a6b3a)',
    'Ancient':  'linear-gradient(160deg, #9b6b4a, #6b3a1a)',
    'Inferno':  'linear-gradient(160deg, #e87c3e, #9c3a10)',
    'Overpass': 'linear-gradient(160deg, #6b8b9b, #2a5a6b)',
    'Anubis':   'linear-gradient(160deg, #9b8b6b, #5a4a2a)',
  };

  function getMapBg(name) {
    const img = MAP_IMAGES[name];
    const grad = MAP_GRADIENTS[name] || 'linear-gradient(160deg, #333, #111)';
    if (img) return `url('${img}') center/cover, ${grad}`;
    return grad;
  }

  // ── Шаги по форматам ──
  function generateSteps(format) {
    if (format === 'bo1') {
      return [
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        { turn: 'team1', action: 'ban' },
        { turn: 'team2', action: 'ban' },
        // 7-я карта — авто-пик (decider)
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
        // 7-я карта — decider
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
        // 7-я карта — decider
      ];
    }
    return [];
  }

  // ── URL param ──
  const params = new URLSearchParams(window.location.search);
  const vetoIdRaw = params.get('id');
  const vetoId = vetoIdRaw ? Number(vetoIdRaw) : null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!vetoId) {
      showNotFound();
      return;
    }

    // Ждём загрузки данных из Supabase
    const tryInit = () => {
      const veto = getVeto();
      if (veto) {
        init();
        return;
      }
      // Если _dbReady — данные загружены но вето нет
      if (window._dbReady) {
        showNotFound();
        return;
      }
      // Ещё не загрузились — ждём
      setTimeout(tryInit, 200);
    };

    tryInit();
  });

  // ── Состояние ──
  let lastStep = -1;
  let pollInterval = null;

  // ── Таймер хода ──
  const TURN_TIME = 10; // секунд
  let timerInterval = null;
  let timerSecondsLeft = TURN_TIME;
  let timerForStep = -1; // шаг для которого запущен таймер

  function startTurnTimer(veto) {
    // Не запускаем таймер если вето не активно или уже завершено
    if (veto.status !== 'active') { stopTimer(); return; }
    // Если таймер уже идёт для этого шага — не перезапускаем
    if (timerForStep === veto.currentStep) return;

    stopTimer();
    timerForStep = veto.currentStep;
    timerSecondsLeft = TURN_TIME;
    updateTimerUI();

    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      updateTimerUI();

      if (timerSecondsLeft <= 0) {
        stopTimer();
        autoban();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function updateTimerUI() {
    const el = document.getElementById('vetoTimerCount');
    const ring = document.getElementById('vetoTimerRing');
    if (!el) return;
    el.textContent = timerSecondsLeft;
    // Цвет: зелёный → жёлтый → красный
    if (timerSecondsLeft > 6) {
      el.style.color = 'var(--success, #22c55e)';
      if (ring) ring.style.stroke = 'var(--success, #22c55e)';
    } else if (timerSecondsLeft > 3) {
      el.style.color = '#f59e0b';
      if (ring) ring.style.stroke = '#f59e0b';
    } else {
      el.style.color = 'var(--danger, #ef4444)';
      if (ring) ring.style.stroke = 'var(--danger, #ef4444)';
      // Пульсация при последних секундах
      el.style.animation = 'vetoTimerPulse 0.5s ease infinite alternate';
    }
    // dashoffset для кольца (52 = circumference круга r=8.3)
    if (ring) {
      const pct = timerSecondsLeft / TURN_TIME;
      ring.style.strokeDashoffset = 52 * (1 - pct);
    }
  }

  function autoban() {
    // Авто-бан случайной доступной карты если ход не сделан
    const vetos = DB.get('pl_vetos');
    const idx = vetos.findIndex(v => Number(v.id) === Number(vetoId));
    if (idx === -1) return;
    const veto = vetos[idx];
    if (veto.status !== 'active') return;

    const available = veto.maps.filter(m => m.status === 'available');
    if (!available.length) return;
    const randomMap = available[Math.floor(Math.random() * available.length)];

    // Выполняем ход (та же логика что в vetoMakeMove)
    applyMove(vetos, idx, veto, randomMap.name, true);
  }

  function init() {
    const veto = getVeto();
    if (!veto) { showNotFound(); return; }
    renderVeto(veto);
    startPolling();
  }

  // ── Получить вето из localStorage ──
  function getVeto() {
    const vetos = DB.get('pl_vetos');
    // Ищем по ID или по числовому ID из Supabase
    return vetos.find(v => Number(v.id) === Number(vetoId)) || null;
  }

  // ── Polling ──
  function startPolling() {
    pollInterval = setInterval(() => {
      const veto = getVeto();
      if (!veto) return;
      if (veto.currentStep !== lastStep || veto.status !== getLastStatus()) {
        renderVeto(veto);
      }
    }, 2000);
  }

  let _lastStatus = '';
  function getLastStatus() { return _lastStatus; }

  // ── Определяем роль текущего пользователя ──
  function getMyRole(veto) {
    const user = Auth.current();
    if (!user) return null;
    if (user.role === 'admin') return 'admin';
    if (user.id === veto.team1CaptainId) return 'team1';
    if (user.id === veto.team2CaptainId) return 'team2';
    return null;
  }

  // ── Главная функция рендера ──
  function renderVeto(veto) {
    lastStep = veto.currentStep;
    _lastStatus = veto.status;

    document.getElementById('vetoLoading').style.display = 'none';
    document.getElementById('vetoNotFound').style.display = 'none';
    document.getElementById('vetoContent').style.display = 'block';

    const myRole = getMyRole(veto);

    // Шапка
    document.getElementById('vhTeam1').textContent = veto.team1;
    document.getElementById('vhTeam2').textContent = veto.team2;
    document.getElementById('vhFormat').textContent = veto.format.toUpperCase();
    document.getElementById('vhTournament').textContent = veto.tournament || '';

    const statusLabels = { waiting: 'Ожидание', active: 'Идёт вето', done: 'Завершено' };
    const statusEl = document.getElementById('vhStatus');
    statusEl.textContent = statusLabels[veto.status] || veto.status;
    statusEl.className = 'veto-status-badge status-' + veto.status;

    // Кнопка старта для admin
    const startWrap = document.getElementById('adminStartWrap');
    const startWrapWaiting = document.getElementById('adminStartWrapWaiting');
    if (myRole === 'admin' && veto.status === 'waiting') {
      startWrap.style.display = 'block';
      startWrapWaiting.style.display = 'block';
      document.getElementById('startVetoBtn').onclick = () => startVeto();
      document.getElementById('startVetoBtnWaiting').onclick = () => startVeto();
    } else {
      startWrap.style.display = 'none';
      startWrapWaiting.style.display = 'none';
    }

    // Кнопка копирования
    document.getElementById('copyVetoLink').onclick = () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Ссылка скопирована');
      });
    };

    if (veto.status === 'waiting') {
      document.getElementById('vetoWaiting').style.display = 'flex';
      document.getElementById('vetoMain').style.display = 'none';
      return;
    }

    document.getElementById('vetoWaiting').style.display = 'none';
    document.getElementById('vetoMain').style.display = 'grid';

    // Игроки по колонкам
    if (window.renderVetoPlayers) window.renderVetoPlayers(veto.team1, veto.team2);

    // Индикатор хода
    renderTurnIndicator(veto, myRole);

    // Таймер
    if (veto.status === 'active') startTurnTimer(veto);

    // Карты
    renderMaps(veto, myRole);

    // Лог
    renderLog(veto);

    // Результат
    if (veto.status === 'done') {
      renderResult(veto);
    } else {
      document.getElementById('vetoResult').style.display = 'none';
    }
  }

  // ── Индикатор хода ──
  function renderTurnIndicator(veto, myRole) {
    const el = document.getElementById('vtiInner');
    const textEl = document.getElementById('vtiText');

    if (veto.status === 'done') {
      stopTimer();
      el.className = 'vti-inner vti-done';
      textEl.innerHTML = '<i class="fas fa-flag-checkered"></i> Вето завершено';
      // Скрываем таймер
      const tw = document.getElementById('vetoTimerWrap');
      if (tw) tw.style.display = 'none';
      return;
    }

    const isMyTurn = myRole === veto.currentTurn;
    const actionLabel = veto.action === 'ban' ? 'бана' : 'пика';
    const teamLabel = veto.currentTurn === 'team1' ? veto.team1 : veto.team2;

    el.className = 'vti-inner ' + (isMyTurn ? 'vti-my-turn' : 'vti-opponent-turn');
    textEl.innerHTML = isMyTurn
      ? `<i class="fas fa-hand-pointer"></i> Ваш ход — выберите карту для <strong>${actionLabel}</strong>`
      : `<i class="fas fa-hourglass-half"></i> <strong>${teamLabel}</strong> ${veto.action === 'ban' ? 'банит' : 'пикает'}...`;

    // Таймер
    const tw = document.getElementById('vetoTimerWrap');
    if (tw) tw.style.display = 'flex';
  }

  // ── Карточки карт ──
  function renderMaps(veto, myRole) {
    const grid = document.getElementById('vetoMapsGrid');
    const isMyTurn = myRole === veto.currentTurn && veto.status === 'active';

    grid.innerHTML = veto.maps.map((m) => {
      const imgUrl  = MAP_IMAGES[m.name] || '';
      const grad    = MAP_GRADIENTS[m.name] || 'linear-gradient(160deg,#333,#111)';
      const thumbBg = imgUrl ? `url('${imgUrl}') center/cover` : grad;

      const canClick = isMyTurn && m.status === 'available';

      // Статус справа
      let statusHtml = '';
      if (m.status === 'banned') {
        const bn = veto.bannedMaps.find(b => b.map === m.name);
        const by = bn ? (bn.bannedBy === 'team1' ? veto.team1 : veto.team2) : '';
        statusHtml = `<span class="vmc-status ban">БАН${by ? ' · ' + by : ''}</span>`;
      } else if (m.status === 'picked') {
        const pk = veto.pickedMaps.find(p => p.map === m.name);
        const by = pk
          ? (pk.pickedBy === 'team1' ? veto.team1 : pk.pickedBy === 'team2' ? veto.team2 : 'Decider')
          : '';
        statusHtml = `<span class="vmc-status pick">ПИК${by ? ' · ' + by : ''}</span>`;
      } else if (canClick) {
        statusHtml = `<span class="vmc-status hint">${veto.action === 'ban' ? 'БАН?' : 'ПИК?'}</span>`;
      }

      return `<div class="veto-map-card ${m.status}${canClick ? ' active-turn' : ''}"
        ${canClick ? `onclick="vetoMakeMove('${m.name}')" role="button" tabindex="0"` : ''}>
        <div class="vmc-thumb" style="background:${thumbBg};width:88px;height:56px;flex-shrink:0;background-size:cover;background-position:center;"></div>
        <div class="vmc-name">${m.name}</div>
        ${statusHtml}
      </div>`;
    }).join('');
  }

  // ── Лог ──
  function renderLog(veto) {
    const list = document.getElementById('vetoLogList');
    if (!veto.log || !veto.log.length) {
      list.innerHTML = '<div class="veto-log-empty">Действий ещё нет</div>';
      return;
    }
    const actionLabel = { ban: '<span class="log-ban">БАН</span>', pick: '<span class="log-pick">ПИК</span>' };
    list.innerHTML = veto.log.slice().reverse().map(entry => {
      const teamName = entry.team === 'team1' ? veto.team1 : (entry.team === 'team2' ? veto.team2 : 'Decider');
      const time = new Date(entry.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="veto-log-entry">
          <span class="log-time">${time}</span>
          <span class="log-team">${teamName}</span>
          ${actionLabel[entry.action] || entry.action}
          <span class="log-map">${entry.map}</span>
        </div>`;
    }).join('');
  }

  // ── Результат ──
  function renderResult(veto) {
    const el = document.getElementById('vetoResult');
    el.style.display = 'block';
    const mapsEl = document.getElementById('vetoResultMaps');
    mapsEl.innerHTML = veto.pickedMaps.map(p => {
      const img = MAP_IMAGES[p.map] || '';
      const byName = p.pickedBy === 'team1' ? veto.team1 : (p.pickedBy === 'team2' ? veto.team2 : 'Decider');
      const isDecider = p.pickedBy === 'decider';
      return `
        <div class="veto-result-row">
          <div class="vrr-num">#${p.order}</div>
          <div class="vrr-img" style="${img ? `background:url('${img}') center/cover` : `background:${MAP_GRADIENTS[p.map]||'#333'}`}"></div>
          <div class="vrr-name">${p.map.toUpperCase()}</div>
          <div class="vrr-badge ${isDecider ? 'vrr-decider' : 'vrr-pick'}">${isDecider ? 'DECIDER' : 'ПИК'}</div>
          <div class="vrr-by">${byName}</div>
        </div>`;
    }).join('');
  }

  // ── Начать вето (Admin only) ──
  function startVeto() {
    const vetos = DB.get('pl_vetos');
    const idx = vetos.findIndex(v => v.id === vetoId);
    if (idx === -1) return;
    const veto = vetos[idx];
    if (veto.status !== 'waiting') return;

    veto.status = 'active';
    veto.startedAt = new Date().toISOString();
    const firstStep = veto.steps[0];
    veto.currentTurn = firstStep.turn;
    veto.action = firstStep.action;

    vetos[idx] = veto;
    DB.set('pl_vetos', vetos);
    renderVeto(veto);
    showToast('Вето началось!', 'success');
  }

  // ── Выполнение хода (глобальная функция для onclick) ──
  window.vetoMakeMove = function (mapName) {
    const user = Auth.current();
    if (!user) { showToast('Необходимо войти', 'error'); return; }

    const vetos = DB.get('pl_vetos');
    const idx = vetos.findIndex(v => Number(v.id) === Number(vetoId));
    if (idx === -1) return;
    const veto = vetos[idx];

    if (veto.status !== 'active') return;

    const myRole = getMyRole(veto);
    if (myRole !== veto.currentTurn) {
      showToast('Сейчас не ваш ход', 'error');
      return;
    }

    const mapIdx = veto.maps.findIndex(m => m.name === mapName);
    if (mapIdx === -1 || veto.maps[mapIdx].status !== 'available') {
      showToast('Карта недоступна', 'error');
      return;
    }

    stopTimer();
    applyMove(vetos, idx, veto, mapName, false);
  };

  // ── Общая логика применения хода ──
  function applyMove(vetos, idx, veto, mapName, isAutoban) {
    const step = veto.steps[veto.currentStep];
    if (!step) return;
    const action = step.action;

    const mapIdx = veto.maps.findIndex(m => m.name === mapName);
    if (mapIdx === -1) return;

    veto.maps[mapIdx].status = action === 'ban' ? 'banned' : 'picked';

    if (action === 'ban') {
      veto.bannedMaps.push({ map: mapName, bannedBy: veto.currentTurn, auto: isAutoban });
    } else {
      veto.pickedMaps.push({
        map: mapName,
        pickedBy: veto.currentTurn,
        order: veto.pickedMaps.length + 1
      });
    }

    veto.log.push({
      team: veto.currentTurn,
      action,
      map: mapName,
      auto: isAutoban,
      time: new Date().toISOString()
    });

    veto.currentStep++;

    if (veto.currentStep >= veto.steps.length) {
      const lastMap = veto.maps.find(m => m.status === 'available');
      if (lastMap) {
        lastMap.status = 'picked';
        veto.pickedMaps.push({ map: lastMap.name, pickedBy: 'decider', order: veto.pickedMaps.length + 1 });
        veto.log.push({ team: 'decider', action: 'pick', map: lastMap.name, time: new Date().toISOString() });
      }
      veto.status = 'done';
      veto.finishedAt = new Date().toISOString();
    } else {
      const nextStep = veto.steps[veto.currentStep];
      veto.currentTurn = nextStep.turn;
      veto.action = nextStep.action;
    }

    vetos[idx] = veto;
    DB.set('pl_vetos', vetos);

    // Сбрасываем таймер для нового шага
    timerForStep = -1;

    if (veto.status === 'done') {
      // Редирект на страницу завершения с названием финальной карты и ID вето
      const deciderMap = veto.pickedMaps.find(p => p.pickedBy === 'decider') || veto.pickedMaps[veto.pickedMaps.length - 1];
      const mapName = deciderMap ? encodeURIComponent(deciderMap.map) : '';
      setTimeout(() => {
        window.location.href = `veto-done.html?map=${mapName}&vetoId=${vetoId}`;
      }, 1500);
    }

    renderVeto(veto);

    if (isAutoban) showToast(`Время вышло! Авто-бан: ${mapName}`, 'error');
  }

  // ── Показать «не найдено» ──
  function showNotFound() {
    document.getElementById('vetoLoading').style.display = 'none';
    document.getElementById('vetoNotFound').style.display = 'flex';
  }

  // ── Экспортируем generateSteps для admin.js ──
  window.generateVetoSteps = generateSteps;

})();
