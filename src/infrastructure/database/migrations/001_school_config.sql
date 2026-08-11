CREATE TABLE IF NOT EXISTS school_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT NOT NULL DEFAULT 'Zentriumph-DriveOfice',
    ruc TEXT NOT NULL DEFAULT '1791234567001',
    branch TEXT DEFAULT 'Matriz',
    address TEXT NOT NULL DEFAULT 'Av. Amazonas N34-120',
    city TEXT NOT NULL DEFAULT 'Quito',
    phone TEXT DEFAULT '02 250 4477',
    email TEXT DEFAULT 'info@zentriumph.ec',
    resolution_auth TEXT DEFAULT '018-DE-DCTS-ANT-2013',
    logo_path TEXT DEFAULT '',
    director_name TEXT DEFAULT 'Ing. Marco Villacís',
    director_title TEXT DEFAULT 'Director de Escuelas',
    secretary_name TEXT DEFAULT 'Lcda. Andrea Suárez',
    secretary_title TEXT DEFAULT 'Secretaria Académica',
    ant_director_name TEXT DEFAULT 'Dr. Luis Paredes',
    ant_director_title TEXT DEFAULT 'Director Provincial',
    legal_rep_name TEXT DEFAULT 'Sr. Jorge Bastidas',
    legal_rep_title TEXT DEFAULT 'Representante Legal',
    receipt_start_number INTEGER DEFAULT 1001,
    acta_start_number INTEGER DEFAULT 200,
    oficio_start_number INTEGER DEFAULT 350,
    price_type_b REAL DEFAULT 420.00,
    price_type_c REAL DEFAULT 560.00,
    price_type_d REAL DEFAULT 680.00,
    price_type_e REAL DEFAULT 780.00,
    price_type_f REAL DEFAULT 500.00,
    price_psicosensometrico REAL DEFAULT 35.00,
    theme_mode TEXT DEFAULT 'dark',
    theme_color TEXT DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO school_config (id, school_name, ruc, address)
SELECT 1, 'Zentriumph-DriveOfice', '1791234567001', 'Av. Amazonas N34-120'
WHERE NOT EXISTS (SELECT 1 FROM school_config WHERE id = 1);
