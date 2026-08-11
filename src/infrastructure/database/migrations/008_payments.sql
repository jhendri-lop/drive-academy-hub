CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    concept TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    payment_amount REAL NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta')),
    receipt_number INTEGER NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    transfer_number TEXT,
    transfer_image_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
