CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'Admin',
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, email, full_name, role)
SELECT 1, 'admin@zentriumph.ec', 'Andrea Suárez', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);
