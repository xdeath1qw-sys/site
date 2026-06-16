// ── Migration: Supabase → MongoDB ──
// Запуск: node migrate.js

const SUPABASE_URL = 'https://yuitjgahybszbuheejbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1aXRqZ2FoeWJzemJ1aGVlamJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjI3NDAsImV4cCI6MjA5NzA5ODc0MH0.1Jhfe3uaLzxKeMqoHYmjDnjf3Vf1D9f2QfR5QlrRyy8';
const MONGO_API   = 'https://efl-league.vercel.app/api/data';

async function sbFetch(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

async function mongoInsert(col, doc) {
  const res = await fetch(`${MONGO_API}?col=${col}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc)
  });
  return res.json();
}

async function migrate() {
  const tables = ['users', 'players', 'teams', 'news', 'tournaments', 'matches'];

  for (const table of tables) {
    console.log(`\n📦 Мигрируем ${table}...`);
    const rows = await sbFetch(table);
    if (!Array.isArray(rows)) { console.log(`  ⚠️ Ошибка:`, rows); continue; }
    console.log(`  Найдено: ${rows.length} записей`);

    let ok = 0, err = 0;
    for (const row of rows) {
      // Убираем Supabase ID чтобы MongoDB сгенерировал свой
      const { id, ...data } = row;
      data.supabase_id = id; // сохраняем оригинальный ID для справки
      const result = await mongoInsert(table, data);
      if (result.error) { err++; console.log(`  ❌ ${row.id}:`, result.error); }
      else ok++;
    }
    console.log(`  ✅ Перенесено: ${ok}, ошибок: ${err}`);
  }

  console.log('\n🎉 Миграция завершена!');
}

migrate().catch(console.error);
