CREATE TABLE IF NOT EXISTS logo_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_name TEXT NOT NULL UNIQUE,
    show_logo INTEGER DEFAULT 1,
    show_watermark INTEGER DEFAULT 0
);

INSERT INTO logo_documents (document_name, show_logo, show_watermark) VALUES
('recibo', 1, 0),
('oficio_autorizacion', 1, 0),
('oficio_compra', 1, 0),
('oficio_legalizacion', 1, 0),
('acuerdo_ensenanza', 0, 0),
('ficha_teorica', 0, 0),
('ficha_practica', 0, 0),
('acta_parte1', 0, 0),
('acta_parte2', 0, 0),
('titulo', 0, 0)
ON CONFLICT (document_name) DO NOTHING;
