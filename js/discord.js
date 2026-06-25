// ══════════════════════════════════════════════════════════════
//  EFL League — Discord Webhook Notifications
// ══════════════════════════════════════════════════════════════

// ⬇️ ВСТАВЬ СЮДА ТВОЙ DISCORD WEBHOOK URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1516382352505438329/C3zj8iDX1Hu0xtGf4_3sHY-voAmEF-4nnw9SwQXKB9f6xK6PAcm65yFPJDuTwvpEgj9w';

// ── Отправка сообщения в Discord ──────────────────────────────
async function sendDiscordNotification(embed) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_WEBHOOK_URL_HERE') {
    console.warn('[DISCORD] Webhook URL не настроен!');
    return;
  }

  // Таймаут 4 сек — если Discord заблокирован, не подвешиваем сайт
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        username: 'EFL League Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [embed]
      })
    });
    console.log('[DISCORD] ✅ Уведомление отправлено');
  } catch(e) {
    if (e.name === 'AbortError') {
      console.warn('[DISCORD] ⏱ Таймаут — Discord недоступен');
    } else {
      console.warn('[DISCORD] ⚠️ Ошибка отправки:', e.message);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ── Уведомление: Новая команда — ОТКЛЮЧЕНО ───────────────────
window.notifyNewTeam = async function(team) {
  // Уведомления о командах отключены
};

// ── Уведомление: Новый пользователь ───────────────────────────
const _notifiedUsers = new Set();
window.notifyNewUser = async function(user) {
  // Защита от дублей — один раз на никнейм за сессию
  const key = (user.username || '') + (user.email || '');
  if (_notifiedUsers.has(key)) return;
  _notifiedUsers.add(key);

  const embed = {
    title: '\u{1F464} \u041D\u043E\u0432\u0430\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F!',
    color: 0x22c55e,
    fields: [
      { name: '\u{1F3AE} \u041D\u0438\u043A\u043D\u0435\u0439\u043C', value: user.username || '\u2014', inline: true },
      { name: '\u{1F4E7} Email', value: user.email || '\u2014', inline: true },
      { name: '\u{1F4C5} \u0414\u0430\u0442\u0430', value: new Date().toLocaleString('ru-RU'), inline: false }
    ],
    footer: { text: 'EFL League' }
  };
  await sendDiscordNotification(embed);
};

// ── Уведомление: Новый турнир ──────────────────────────────────
window.notifyNewTournament = async function(tournament) {
  const statusMap = { upcoming: '\u{1F4C5} \u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0439', ongoing: '\u{1F534} \u0418\u0434\u0451\u0442', finished: '\u2705 \u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D' };
  const embed = {
    title: '\u{1F3C6} \u041D\u043E\u0432\u044B\u0439 \u0442\u0443\u0440\u043D\u0438\u0440!',
    color: 0xf59e0b,
    fields: [
      { name: '\u{1F4DB} \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435', value: tournament.name || '\u2014', inline: false },
      { name: '\u{1F4B0} \u041F\u0440\u0438\u0437\u043E\u0432\u043E\u0439', value: tournament.prize || '\u2014', inline: true },
      { name: '\u{1F4CD} \u041F\u043B\u043E\u0449\u0430\u0434\u043A\u0430', value: tournament.location || 'Online', inline: true },
      { name: '\u{1F4CA} \u0421\u0442\u0430\u0442\u0443\u0441', value: statusMap[tournament.status] || '\u2014', inline: true },
      { name: '\u{1F5D3}\uFE0F \u041D\u0430\u0447\u0430\u043B\u043E', value: tournament.dateStart || '\u2014', inline: true },
      { name: '\u{1F5D3}\uFE0F \u041A\u043E\u043D\u0435\u0446', value: tournament.dateEnd || '\u2014', inline: true }
    ],
    footer: { text: 'EFL League \u2022 ' + new Date().toLocaleString('ru-RU') }
  };
  await sendDiscordNotification(embed);
};

// ── Уведомление: Сброс пароля ─────────────────────────────────
window.notifyPasswordReset = async function(user, newPassword) {
  const embed = {
    title: '\u{1F511} \u0417\u0430\u043F\u0440\u043E\u0441 \u0441\u0431\u0440\u043E\u0441\u0430 \u043F\u0430\u0440\u043E\u043B\u044F!',
    color: 0xef4444,
    fields: [
      { name: '\u{1F3AE} \u041D\u0438\u043A\u043D\u0435\u0439\u043C', value: user.username || '\u2014', inline: true },
      { name: '\u{1F4E7} Email', value: user.email || '\u2014', inline: true },
      { name: '<:discord:> Discord', value: user.discordUsername ? `@${user.discordUsername}` : '\u2014', inline: true },
      { name: '\u{1F510} \u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C', value: `\`${newPassword}\``, inline: false },
      { name: '\u26A0\uFE0F \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435', value: `\u041D\u0430\u043F\u0438\u0448\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u0432 \u041B\u0421 \u0432 Discord: ${user.discordUsername ? `**@${user.discordUsername}**` : '\u2014'}`, inline: false }
    ],
    footer: { text: 'EFL League \u2022 ' + new Date().toLocaleString('ru-RU') }
  };
  await sendDiscordNotification(embed);
};

// ── Уведомление: Новая новость ────────────────────────────────
window.notifyNewNews = async function(news) {
  const embed = {
    title: '\u{1F4F0} \u041D\u043E\u0432\u0430\u044F \u043D\u043E\u0432\u043E\u0441\u0442\u044C!',
    color: 0x3b82f6,
    fields: [
      { name: '\u{1F4CC} \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A', value: news.title || '\u2014', inline: false },
      { name: '\u{1F3F7}\uFE0F \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F', value: news.category || '\u2014', inline: true },
      { name: '\u{1F4DD} \u0410\u043D\u043E\u043D\u0441', value: news.excerpt || (news.content || '').substring(0, 100) + '...' || '\u2014', inline: false }
    ],
    footer: { text: 'EFL League \u2022 ' + new Date().toLocaleString('ru-RU') }
  };
  await sendDiscordNotification(embed);
};
