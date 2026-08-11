CREATE TABLE IF NOT EXISTS course_vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    practice_instructor_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (practice_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL
);
