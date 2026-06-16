// ── Match Notifications System ──
// Система уведомлений о матчах за 10 минут до начала

(function() {
  // Инициализация при загрузке страницы
  const user = Auth.current();
  if (!user) return;

  // Проверяем уведомления каждые 30 секунд
  checkMatchNotifications();
  setInterval(checkMatchNotifications, 30000);

  function checkMatchNotifications() {
    const currentUser = Auth.current();
    if (!currentUser) return;

    // Получаем команду пользователя
    const userTeam = getUserTeam(currentUser);
    if (!userTeam) return;

    const matches = DB.get('pl_matches');
    const now = new Date();
    const notifiedMatches = getNotifiedMatches();

    matches.forEach(match => {
      // Пропускаем завершенные матчи
      if (match.status === 'finished') return;

      // Проверяем, участвует ли команда пользователя
      if (match.team1 !== userTeam && match.team2 !== userTeam) return;

      // Проверяем, есть ли дата матча
      if (!match.date) return;

      const matchDate = new Date(match.date);
      const timeDiff = matchDate - now;
      const minutesLeft = Math.floor(timeDiff / 60000);

      // Уведомляем за 10 минут (от 9 до 11 минут, чтобы не упустить момент)
      if (minutesLeft >= 9 && minutesLeft <= 11) {
        // Проверяем, не отправляли ли уже уведомление
        if (!notifiedMatches.includes(match.id)) {
          createMatchNotification(match, userTeam, minutesLeft);
          markMatchAsNotified(match.id);
        }
      }

      // Уведомляем за 1 минуту (бонус)
      if (minutesLeft >= 0 && minutesLeft <= 1) {
        const urgentKey = `urgent_${match.id}`;
        if (!notifiedMatches.includes(urgentKey)) {
          createUrgentMatchNotification(match, userTeam);
          markMatchAsNotified(urgentKey);
        }
      }
    });
  }

  function getUserTeam(user) {
    // Если пользователь IGL - проверяем его команду
    if (user.role === 'igl' && user.teamId) {
      const teams = DB.get('pl_teams');
      const team = teams.find(t => t.id === user.teamId);
      return team ? team.name : null;
    }

    // Если обычный игрок - ищем в pl_players
    const players = DB.get('pl_players');
    const player = players.find(p => p.nick.toLowerCase() === user.username.toLowerCase());
    return player ? player.team : null;
  }

  function createMatchNotification(match, userTeam, minutesLeft) {
    const opponent = match.team1 === userTeam ? match.team2 : match.team1;
    
    // Создаем уведомление в базе
    const notifications = DB.get('pl_notifications') || [];
    notifications.push({
      id: Date.now(),
      userId: Auth.current().id,
      type: 'match',
      matchId: match.id,
      title: '⚠️ Матч начинается скоро!',
      message: `Через ${minutesLeft} мин матч: ${userTeam} vs ${opponent}`,
      tournament: match.tournament,
      read: false,
      createdAt: new Date().toISOString()
    });
    DB.set('pl_notifications', notifications);

    // Показываем toast уведомление
    showMatchToast(`⚠️ Через ${minutesLeft} мин матч vs ${opponent}!`, 'warning', match);

    // Обновляем бейдж
    updateNotificationBadge();
  }

  function createUrgentMatchNotification(match, userTeam) {
    const opponent = match.team1 === userTeam ? match.team2 : match.team1;
    
    // Создаем срочное уведомление
    const notifications = DB.get('pl_notifications') || [];
    notifications.push({
      id: Date.now(),
      userId: Auth.current().id,
      type: 'match_urgent',
      matchId: match.id,
      title: '🚨 МАТЧ НАЧИНАЕТСЯ!',
      message: `Меньше минуты! ${userTeam} vs ${opponent}`,
      tournament: match.tournament,
      read: false,
      createdAt: new Date().toISOString()
    });
    DB.set('pl_notifications', notifications);

    // Показываем срочное toast уведомление
    showMatchToast(`🚨 Матч vs ${opponent} начинается ПРЯМО СЕЙЧАС!`, 'danger', match);

    // Обновляем бейдж
    updateNotificationBadge();
  }

  function showMatchToast(msg, type = 'warning', match) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-match`;
    toast.style.cssText = 'cursor:pointer;min-width:320px;max-width:400px';
    
    const icon = type === 'danger' ? 'fa-exclamation-triangle' : 'fa-clock';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <i class="fas ${icon}" style="font-size:1.3rem"></i>
        <div style="flex:1">
          <div style="font-weight:700;margin-bottom:4px">${msg}</div>
          ${match.tournament ? `<div style="font-size:0.75rem;opacity:0.9">${match.tournament}</div>` : ''}
          ${match.url ? `<div style="font-size:0.7rem;opacity:0.8;margin-top:4px">Нажмите для перехода →</div>` : ''}
        </div>
      </div>`;
    
    if (match.url) {
      toast.addEventListener('click', () => {
        window.open(match.url, '_blank');
        toast.remove();
      });
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  }

  function getNotifiedMatches() {
    try {
      return JSON.parse(localStorage.getItem('pl_notified_matches')) || [];
    } catch {
      return [];
    }
  }

  function markMatchAsNotified(matchId) {
    const notified = getNotifiedMatches();
    notified.push(matchId);
    // Храним только последние 100 записей
    if (notified.length > 100) notified.shift();
    localStorage.setItem('pl_notified_matches', JSON.stringify(notified));
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('navBellBadge');
    if (!badge) return;
    
    const currentUser = Auth.current();
    if (!currentUser) return;

    // Подсчитываем приглашения
    const invites = DB.get('pl_invites').filter(inv =>
      inv.status === 'pending' && (
        inv.targetUserId === currentUser.id ||
        inv.playerNick.toLowerCase() === currentUser.username.toLowerCase()
      )
    ).length;

    // Подсчитываем непрочитанные уведомления о матчах
    const notifications = (DB.get('pl_notifications') || []).filter(n =>
      n.userId === currentUser.id && !n.read
    ).length;

    const total = invites + notifications;
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
})();
