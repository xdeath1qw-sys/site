# 🗄️ Подключение Supabase (PostgreSQL)

## 📝 ШАГ 1: Создать проект (2 минуты)

1. Открой: https://supabase.com
2. Нажми **"Start your project"**
3. Войди через **GitHub** (или Email)
4. Нажми **"New project"**
5. Заполни:
   - **Name:** `efl-league`
   - **Database Password:** придумай пароль (сохрани!)
   - **Region:** выбери ближайший (Europe West)
6. Нажми **"Create new project"**
7. Подожди ~2 минуты (создание БД)

---

## 📝 ШАГ 2: Создать таблицы (1 минута)

1. В левом меню: **SQL Editor**
2. Нажми **"New query"**
3. Скопируй содержимое файла `database/supabase_schema.sql`
4. Вставь в редактор
5. Нажми **"Run"** (или Ctrl+Enter)
6. ✅ Таблицы созданы! Admin добавлен!

---

## 📝 ШАГ 3: Получить API ключи (30 секунд)

1. В левом меню: **Settings** (шестеренка)
2. Выбери **API**
3. Скопируй:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOi...` (длинный ключ)

---

## 📝 ШАГ 4: Настроить код (30 секунд)

Я настрою автоматически! Просто дай мне:
- **Project URL**
- **anon public key**

Или отредактируй сам `js/storage.js`:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_KEY = 'твой_anon_ключ';
```

---

## 📝 ШАГ 5: Загрузить на хостинг

Загрузи обновленный `js/storage.js` на Netlify/Vercel

---

## ✅ ГОТОВО!

Теперь:
- ✅ Все регистрации сохраняются в PostgreSQL
- ✅ Данные видны всем пользователям
- ✅ Ничего не удаляется
- ✅ Быстрая синхронизация
- ✅ Масштабируемость

---

## 🔑 Admin вход:

```
Username: Admin
Password: admin123
```

(Уже создан в БД автоматически!)

---

**Начни с шага 1!** 👉 https://supabase.com
