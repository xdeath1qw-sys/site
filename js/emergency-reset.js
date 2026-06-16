// ══════════════════════════════════════════════════════════════
//  EMERGENCY RESET UTILITY - Аварийный сброс и восстановление
// ══════════════════════════════════════════════════════════════
//
// Используйте эти функции в консоли браузера (F12) для
// аварийного восстановления данных
//
// ══════════════════════════════════════════════════════════════

/**
 * Принудительно сохранить ВСЕ локальные данные в Supabase
 * Используйте СРАЗУ после изменения данных чтобы сохранить их
 */
async function emergencyBackupToSupabase() {
  console.log('🚨 АВАРИЙНОЕ СОХРАНЕНИЕ В SUPABASE');
  
  if (!window._dbReady || !window._supabase) {
    console.error('❌ Supabase не готов! Подождите несколько секунд.');
    return;
  }

  const keys = [
    'pl_users','pl_teams','pl_players','pl_matches','pl_news',
    'pl_invites','pl_tournaments','pl_tourn_regs','pl_vetos',
    'pl_highlights','pl_awards','pl_notifications'
  ];

  for (const key of keys) {
    try {
      const localRaw = localStorage.getItem(key);
      if (localRaw) {
        const localVal = JSON.parse(localRaw);
        await window._supabase.from('kv_store').upsert({ key, data: localVal });
        console.log('✅', key, '- сохранено');
      } else {
        console.log('⚪', key, '- пусто');
      }
    } catch(e) {
      console.error('❌', key, '- ошибка:', e.message);
    }
  }
  
  console.log('✅ СОХРАНЕНИЕ ЗАВЕРШЕНО');
  alert('✅ Все данные сохранены в Supabase!');
}

/**
 * Загрузить ВСЕ данные из Supabase в localStorage
 * ВНИМАНИЕ: Перезапишет локальные данные!
 */
async function emergencyRestoreFromSupabase() {
  const confirm = window.confirm(
    '⚠️ ВНИМАНИЕ!\n\n' +
    'Эта операция ПЕРЕЗАПИШЕТ все локальные данные данными из Supabase.\n\n' +
    'Используйте только если локальные данные потеряны!\n\n' +
    'Продолжить?'
  );
  
  if (!confirm) {
    console.log('❌ Операция отменена');
    return;
  }

  console.log('🚨 ВОССТАНОВЛЕНИЕ ИЗ SUPABASE');
  
  if (!window._dbReady || !window._supabase) {
    console.error('❌ Supabase не готов! Подождите несколько секунд.');
    return;
  }

  const keys = [
    'pl_users','pl_teams','pl_players','pl_matches','pl_news',
    'pl_invites','pl_tournaments','pl_tourn_regs','pl_vetos',
    'pl_highlights','pl_awards','pl_notifications'
  ];

  for (const key of keys) {
    try {
      const { data: row, error } = await window._supabase
        .from('kv_store')
        .select('data')
        .eq('key', key)
        .single();
        
      if (!error && row) {
        localStorage.setItem(key, JSON.stringify(row.data));
        console.log('✅', key, '- восстановлено');
      } else {
        console.log('⚪', key, '- нет в Supabase');
      }
    } catch(e) {
      console.error('❌', key, '- ошибка:', e.message);
    }
  }
  
  console.log('✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
  alert('✅ Данные восстановлены из Supabase! Перезагрузите страницу.');
}

/**
 * Показать текущее состояние данных
 */
function showDataStatus() {
  console.log('📊 СТАТУС ДАННЫХ:');
  console.log('================');
  
  const keys = [
    'pl_users','pl_teams','pl_players','pl_matches','pl_news',
    'pl_invites','pl_tournaments','pl_tourn_regs','pl_vetos',
    'pl_highlights','pl_awards','pl_notifications'
  ];
  
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      const val = JSON.parse(raw);
      const count = Array.isArray(val) ? val.length : (typeof val === 'object' ? Object.keys(val).length : '?');
      console.log(`📦 ${key}: ${count} записей`);
    } else {
      console.log(`⚪ ${key}: пусто`);
    }
  });
  
  console.log('================');
  console.log('👤 Текущая сессия:', Auth.current());
}

/**
 * Создать бэкап в виде JSON файла для скачивания
 */
function downloadBackup() {
  console.log('💾 Создание бэкапа...');
  
  const backup = {};
  const keys = [
    'pl_users','pl_teams','pl_players','pl_matches','pl_news',
    'pl_invites','pl_tournaments','pl_tourn_regs','pl_vetos',
    'pl_highlights','pl_awards','pl_notifications'
  ];
  
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      backup[key] = JSON.parse(raw);
    }
  });
  
  // Создаём ссылку для скачивания
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
 * Восстановить данные из JSON файла
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
          console.log('✅', key, '- восстановлено из файла');
        });
        
        console.log('✅ ДАННЫЕ ВОССТАНОВЛЕНЫ ИЗ ФАЙЛА');
        alert('✅ Данные восстановлены! Перезагрузите страницу.');
        
        // Автоматически сохраняем в Supabase
        if (window._dbReady) {
          emergencyBackupToSupabase();
        }
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
╚══════════════════════════════════════════════════════════╝

Доступные функции в консоли:

📤 emergencyBackupToSupabase()
   Принудительно сохранить ВСЕ данные в Supabase

📥 emergencyRestoreFromSupabase()
   Восстановить данные из Supabase (перезапишет локальные!)

📊 showDataStatus()
   Показать текущее состояние данных

💾 downloadBackup()
   Скачать бэкап в JSON файл

📂 uploadBackup()
   Восстановить из JSON файла

════════════════════════════════════════════════════════════

💡 РЕКОМЕНДУЕТСЯ:
   1. Сразу после изменений запускайте emergencyBackupToSupabase()
   2. Периодически делайте downloadBackup()
   3. Храните бэкапы в безопасном месте

════════════════════════════════════════════════════════════
`);

// Экспортируем функции в глобальную область для использования в консоли и других скриптах
window.syncUsersToPlayers = syncUsersToPlayers;
window.seedData = seedData;
window.emergencyBackupToSupabase = emergencyBackupToSupabase;
window.emergencyRestoreFromSupabase = emergencyRestoreFromSupabase;
window.showDataStatus = showDataStatus;
window.downloadBackup = downloadBackup;
window.uploadBackup = uploadBackup;
