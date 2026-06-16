-- Вставляем Admin в Supabase
-- Запусти это в SQL Editor на supabase.com

INSERT INTO users (username, email, password, role, joined_at)
VALUES ('Admin', 'admin@efl-league.gg', 'admin123', 'admin', NOW())
ON CONFLICT (username) DO UPDATE SET role = 'admin', password = 'admin123';

INSERT INTO players (nick, name, role, country, rating, user_id)
VALUES ('Admin', 'Администратор', 'IGL', 'RU', 1000,
  (SELECT id FROM users WHERE username = 'Admin'))
ON CONFLICT (nick) DO NOTHING;

-- Проверка
SELECT id, username, email, role FROM users;
