# EFL League — CS2 Tournament Site

Статический сайт для CS2 лиги. Бэкенд — Supabase.

## Деплой на Vercel

### 1. Загрузи проект на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_НИК/efl-league.git
git push -u origin main
```

### 2. Подключи к Vercel
1. Открой [vercel.com/new](https://vercel.com/new?teamSlug=eclips-projects1)
2. Нажми **"Import Git Repository"**
3. Выбери свой репозиторий
4. Настройки оставь по умолчанию (Framework: **Other**, Root Directory: **`./`**)
5. Нажми **Deploy**

### 3. Готово
Vercel автоматически подхватит `vercel.json` и всё заработает.

## Структура

```
/
├── index.html          — Главная
├── players.html        — Рейтинг игроков
├── teams.html          — Команды
├── news.html           — Новости
├── tournaments.html    — Турниры
├── profile.html        — Профиль игрока
├── admin.html          — Админ панель
├── login.html          — Вход
├── register.html       — Регистрация
├── veto.html           — Вето карт
├── css/style.css       — Стили
├── js/                 — Скрипты
├── videos/             — Хайлайты
└── vercel.json         — Конфиг Vercel
```

## Технологии

- **Frontend**: HTML, CSS, Vanilla JS
- **Database**: [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **Hosting**: [Vercel](https://vercel.com)
