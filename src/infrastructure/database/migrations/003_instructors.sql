CREATE TABLE IF NOT EXISTS instructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    cedula TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Teórico', 'Práctico', 'Ambos')),
    phone TEXT,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
