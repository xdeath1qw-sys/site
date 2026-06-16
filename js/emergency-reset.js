// ══════════════════════════════════════════════════════════════
//  EMERGENCY RESET UTILITY — Аварийный сброс и восстановление
//  (MongoDB edition)
// ══════════════════════════════════════════════════════════════
//
// Используйте эти функции в консоли браузера (F12) для
// аварийного восстановления данных
//
// ══════════════════════════════════════════════════════════════

const EMERGENCY_KEYS = [
  'pl_users', 'pl_teams', 'pl_players', 'pl_matches', 'pl_news',
  'pl_invites', 'pl_tournaments', 'pl_tourn_regs', 'pl_vetos',
  'pl_highlights', 'pl_awards', 'pl_notifications'
];

/**
 * Показать текущее состояние данных в localStorage
 */
function showDataStatus() {
  console.log('📊 СТАТУС ДАННЫХ:');
  console.log('================');
  EMERGENCY_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const val = JSON.parse(raw);
        const count = Array.isArray(val) ? val.length : (typeof val === 'object' ? Object.keys(val).length : '?');
        console.log(`📦 ${key}: ${count} записей`);
      } catch(_) {
        console.log(`⚠️ ${key}: ошибка парсинга`);
      }
    } else {
      console.log(`⚪ ${key}: пусто`);
    }
  });
  console.log('================');
  if (typeof Auth !== 'undefined') {
    console.log('👤 Текущая сессия:', Auth.current());
  }
}

/**
 * Принудительно перезагрузить ВСЕ данные из MongoDB
 * Используйте если localStorage устарел или повреждён
 */
async function emergencyRestoreFromMongo() {
  const ok = window.confirm(
    '⚠️ ВНИМАНИЕ!\n\n' +
    'Эта операция ПЕРЕЗАПИШЕТ все локальные данные данными из MongoDB.\n\n' +
    'Используйте только если локальные данные потеряны!\n\n' +
    'Продолжить?'
  );
  if (!ok) { console.log('❌ Операция отменена'); return; }

  console.log('🚨 ВОССТАНОВЛЕНИЕ ИЗ MONGODB...');

  const cols = ['users', 'players', 'teams', 'news', 'tournaments', 'matches', 'vetos'];
  const keyMap = {
    users: 'pl_users', players: 'pl_players', teams: 'pl_teams',
    news: 'pl_news', tournaments: 'pl_tournaments', matches: 'pl_matches', vetos: 'pl_vetos'
  };

  for (const col of cols) {
    try {
      const res = await fetch(`/api/data?col=${col}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      localStorage.setItem(keyMap[col], JSON.stringify(data));
      console.log(`✅ ${keyMap[col]}: восстановлено (${data.length} записей)`);
    } catch(e) {
      console.error(`❌ ${col}: ошибка — ${e.message}`);
    }
  }

  console.log('✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
  alert('✅ Данные восстановлены из MongoDB!\nПерезагрузите страницу.');
}

/**
 * Создать бэкап в виде JSON файла для скачивания
 */
function downloadBackup() {
  console.log('💾 Создание бэкапа...');
  const backup = {};
  EMERGENCY_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { backup[key] = JSON.parse(raw); } catch(_) {}
    }
  });

  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `efl-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  console.log('✅ Бэкап скачан!');
}

/**
 * Восстановить данные из JSON файла в localStorage
 */
function uploadBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        Object.keys(backup).forEach(key => {
          localStorage.setItem(key, JSON.stringify(backup[key]));
          console.log(`✅ ${key} — восстановлено из файла`);
        });
        console.log('✅ ДАННЫЕ ВОССТАНОВЛЕНЫ ИЗ ФАЙЛА');
        alert('✅ Данные восстановлены!\nПерезагрузите страницу.');
      } catch(e) {
        console.error('❌ Ошибка чтения файла:', e);
        alert('❌ Ошибка чтения файла!');
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

// Показываем справку при загрузке
console.log(`
╔══════════════════════════════════════════════════════════╗
║         🚨 АВАРИЙНЫЕ ФУНКЦИИ ВОССТАНОВЛЕНИЯ 🚨           ║
║                  (MongoDB edition)                       ║
╚══════════════════════════════════════════════════════════╝

Доступные функции в консоли:

📥 emergencyRestoreFromMongo()
   Восстановить данные из MongoDB (перезапишет локальные!)

📊 showDataStatus()
   Показать текущее состояние данных

💾 downloadBackup()
   Скачать бэкап в JSON файл

📂 uploadBackup()
   Восстановить из JSON файла

════════════════════════════════════════════════════════════
`);

window.emergencyRestoreFromMongo = emergencyRestoreFromMongo;
window.showDataStatus = showDataStatus;
window.downloadBackup = downloadBackup;
window.uploadBackup = uploadBackup;
