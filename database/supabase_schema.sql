-- ══════════════════════════════════════════════════════════════
--  EFL League - Supabase Database Schema
--  Игроки = пользователи, зарегистрированные на сайте
-- ══════════════════════════════════════════════════════════════

-- ── Игроки (пользователи сайта) ──
-- Один аккаунт = один игрок. Все игровые данные хранятся здесь.
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    team TEXT DEFAULT NULL,
    team_id BIGINT DEFAULT NULL,
    team_deleted_at TIMESTAMPTZ DEFAULT NULL,
    avatar TEXT DEFAULT NULL,
    photo TEXT DEFAULT NULL,
    faceit_url TEXT DEFAULT NULL,
    steam_url TEXT DEFAULT NULL,
    country TEXT DEFAULT '',
    -- Игровая статистика
    kd DECIMAL(5,2) DEFAULT 0,
    hs INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    matches INTEGER DEFAULT 0,
    adr DECIMAL(5,1) DEFAULT 0,
    rating INTEGER DEFAULT 0,
    -- Игровая роль в команде
    player_role TEXT DEFAULT '',
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Команды ──
CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    tier INTEGER DEFAULT 3,
    country TEXT DEFAULT '',
    rating INTEGER DEFAULT 0,
    logo TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Новости ──
CREATE TABLE IF NOT EXISTS news (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT DEFAULT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    image TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Турниры ──
CREATE TABLE IF NOT EXISTS tournaments (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'upcoming',
    prize TEXT DEFAULT NULL,
    format TEXT DEFAULT NULL,
    teams_count INTEGER DEFAULT 0,
    location TEXT DEFAULT 'Online',
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    description TEXT DEFAULT NULL,
    banner TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Матчи ──
CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    tournament TEXT NOT NULL,
    match_date TIMESTAMPTZ DEFAULT NULL,
    status TEXT DEFAULT 'upcoming',
    match_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Вето карт ──
CREATE TABLE IF NOT EXISTS vetos (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    tournament TEXT NOT NULL,
    picks JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) - Публичный доступ
-- ══════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetos ENABLE ROW LEVEL SECURITY;

-- Разрешаем всем читать
CREATE POLICY "Public read users"       ON users       FOR SELECT USING (true);
CREATE POLICY "Public read teams"       ON teams       FOR SELECT USING (true);
CREATE POLICY "Public read news"        ON news        FOR SELECT USING (true);
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public read matches"     ON matches     FOR SELECT USING (true);
CREATE POLICY "Public read vetos"       ON vetos       FOR SELECT USING (true);

-- Разрешаем всем писать
CREATE POLICY "Public insert users"       ON users       FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users"       ON users       FOR UPDATE USING (true);
CREATE POLICY "Public delete users"       ON users       FOR DELETE USING (true);

CREATE POLICY "Public insert teams"       ON teams       FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update teams"       ON teams       FOR UPDATE USING (true);
CREATE POLICY "Public delete teams"       ON teams       FOR DELETE USING (true);

CREATE POLICY "Public insert news"        ON news        FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update news"        ON news        FOR UPDATE USING (true);
CREATE POLICY "Public delete news"        ON news        FOR DELETE USING (true);

CREATE POLICY "Public insert tournaments" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tournaments" ON tournaments FOR UPDATE USING (true);
CREATE POLICY "Public delete tournaments" ON tournaments FOR DELETE USING (true);

CREATE POLICY "Public insert matches"     ON matches     FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matches"     ON matches     FOR UPDATE USING (true);
CREATE POLICY "Public delete matches"     ON matches     FOR DELETE USING (true);

CREATE POLICY "Public insert vetos"       ON vetos       FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vetos"       ON vetos       FOR UPDATE USING (true);
CREATE POLICY "Public delete vetos"       ON vetos       FOR DELETE USING (true);

-- ══════════════════════════════════════════════════════════════
-- Создание Admin аккаунта
-- ══════════════════════════════════════════════════════════════

INSERT INTO users (id, username, email, password, role, joined_at)
VALUES (1, 'Admin', 'admin@efl-league.gg', 'admin123', 'admin', NOW())
ON CONFLICT (username) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
--  ✅ Готово! Таблица users = игроки. Таблица players удалена.
-- ══════════════════════════════════════════════════════════════
