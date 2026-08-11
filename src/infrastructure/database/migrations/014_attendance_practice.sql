CREATE TABLE IF NOT EXISTS attendance_practice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    dia_numero INTEGER NOT NULL,
    asistio INTEGER DEFAULT 0 CHECK(asistio IN (0, 1)),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
