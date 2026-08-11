CREATE TABLE IF NOT EXISTS document_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    delivered_date DATE DEFAULT CURRENT_DATE,
    signature_path TEXT,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
