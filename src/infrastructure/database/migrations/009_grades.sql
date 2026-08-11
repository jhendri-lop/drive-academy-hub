CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL UNIQUE,
    ed_vial REAL,
    mecanica REAL,
    primeros_auxilios REAL,
    psicologia REAL,
    promedio_teorico REAL,
    nota_practica REAL,
    condicion TEXT CHECK(condicion IN ('Aprobado', 'Reprobado')),
    examen_teorico_date DATE,
    examen_practico_date DATE,
    aprobacion_curso_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
