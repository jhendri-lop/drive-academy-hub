CREATE TABLE IF NOT EXISTS sequentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL UNIQUE CHECK(type IN ('recibo', 'acta', 'oficio')),
    current_number INTEGER DEFAULT 1,
    year INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sequentials (type, current_number) VALUES
('recibo', 1001),
('acta', 200),
('oficio', 350)
ON CONFLICT (type) DO NOTHING;
