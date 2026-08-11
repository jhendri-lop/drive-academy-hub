-- ============================================================
-- ZENTRIUMPH-DRIVEOFICE — ESQUEMA DE BASE DE DATOS PARA SUPABASE (POSTGRESQL)
-- Compatible con Cloudflare Workers / Pages & Supabase Client
-- ============================================================

-- Configuración de la Escuela (Registro único)
CREATE TABLE IF NOT EXISTS school_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    price_type_b NUMERIC(10,2) DEFAULT 420.00,
    price_type_c NUMERIC(10,2) DEFAULT 560.00,
    price_type_d NUMERIC(10,2) DEFAULT 680.00,
    price_type_e NUMERIC(10,2) DEFAULT 780.00,
    price_type_f NUMERIC(10,2) DEFAULT 500.00,
    price_psicosensometrico NUMERIC(10,2) DEFAULT 35.00,
    theme_mode TEXT DEFAULT 'dark',
    theme_color TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehículos
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number TEXT NOT NULL,
    plates TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instructores
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    cedula TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Teórico', 'Práctico', 'Ambos')),
    phone TEXT,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cursos
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL,
    license_type TEXT NOT NULL CHECK(license_type IN ('B', 'C', 'D', 'E', 'F')),
    start_enrollment_date DATE NOT NULL,
    end_enrollment_date DATE NOT NULL,
    start_course_date DATE NOT NULL,
    end_course_date DATE NOT NULL,
    theory_schedule TEXT NOT NULL,
    practice_schedule_range TEXT,
    psychology_schedule TEXT DEFAULT 'Sábado 08H00-12H00',
    theory_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    oficio_prefix TEXT DEFAULT 'ALERTA',
    oficio_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    oficio_start_number INTEGER DEFAULT 1,
    permiso_start_number TEXT,
    fase_actual INTEGER DEFAULT 1 CHECK(fase_actual BETWEEN 1 AND 4),
    status TEXT DEFAULT 'Activo' CHECK(status IN ('Activo', 'Matrículas', 'En curso', 'Cerrado', 'Graduado')),
    folder_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehículos asignados a curso
CREATE TABLE IF NOT EXISTS course_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    practice_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estudiantes
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cedula TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT 'Ecuatoriana',
    blood_type TEXT NOT NULL,
    sex TEXT NOT NULL CHECK(sex IN ('M', 'F', 'Masculino', 'Femenino')),
    birth_date DATE NOT NULL,
    age INTEGER,
    address TEXT NOT NULL,
    canton TEXT DEFAULT 'Quito',
    phone TEXT,
    email TEXT,
    education_level TEXT,
    observations TEXT,
    photo_path TEXT,
    practice_schedule TEXT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    practice_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Inscrito' CHECK(status IN ('Inscrito', 'Cursando', 'Aprobado', 'Graduado', 'Activo')),
    receipt_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta')),
    receipt_number INTEGER NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    transfer_number TEXT,
    transfer_image_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calificaciones
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    ed_vial NUMERIC(4,2),
    mecanica NUMERIC(4,2),
    primeros_auxilios NUMERIC(4,2),
    psicologia NUMERIC(4,2),
    promedio_teorico NUMERIC(4,2),
    nota_practica NUMERIC(4,2),
    condicion TEXT CHECK(condicion IN ('Aprobado', 'Reprobado')),
    examen_teorico_date DATE,
    examen_practico_date DATE,
    aprobacion_curso_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permisos de Aprendizaje
CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    numero_permiso TEXT,
    fecha_entrega DATE,
    firma_entrega TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de logo en documentos
CREATE TABLE IF NOT EXISTS logo_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name TEXT NOT NULL UNIQUE,
    show_logo BOOLEAN DEFAULT TRUE,
    show_watermark BOOLEAN DEFAULT FALSE
);

-- Insertar documentos por defecto si no existen
INSERT INTO logo_documents (document_name, show_logo, show_watermark) VALUES
('recibo', TRUE, FALSE),
('oficio_autorizacion', TRUE, FALSE),
('oficio_compra', TRUE, FALSE),
('oficio_legalizacion', TRUE, FALSE),
('acuerdo_ensenanza', FALSE, FALSE),
('ficha_teorica', FALSE, FALSE),
('ficha_practica', FALSE, FALSE),
('acta_parte1', FALSE, FALSE),
('acta_parte2', FALSE, FALSE),
('titulo', FALSE, FALSE)
ON CONFLICT (document_name) DO NOTHING;

-- Secuenciales (tracking)
CREATE TABLE IF NOT EXISTS sequentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE CHECK(type IN ('recibo', 'acta', 'oficio')),
    current_number INTEGER DEFAULT 1,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_cedula ON students(cedula);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
