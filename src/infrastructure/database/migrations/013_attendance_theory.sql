CREATE TABLE IF NOT EXISTS attendance_theory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    materia TEXT NOT NULL,
    fecha DATE NOT NULL,
    asistio INTEGER DEFAULT 0 CHECK(asistio IN (0, 1)),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
