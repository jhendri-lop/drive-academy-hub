import initSqlJs, { type Database } from "sql.js";
import { invoke } from "@tauri-apps/api/core";

// Lista de las 17 migraciones en orden de ejecución
const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_school_config",
    sql: `
      CREATE TABLE IF NOT EXISTS school_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_name TEXT NOT NULL DEFAULT 'Zentriumph-DriveOfice',
        ruc TEXT NOT NULL DEFAULT '1791234567001',
        branch TEXT DEFAULT 'Matriz',
        address TEXT NOT NULL DEFAULT 'Av. Amazonas N34-120',
        city TEXT NOT NULL DEFAULT 'Quito',
        phone TEXT DEFAULT '02 250 4477',
        email TEXT DEFAULT 'info@zentriumph.ec',
        resolution_auth TEXT DEFAULT 'ANT-DE-2024-0187',
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
    `,
  },
  {
    id: "002_users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'Admin',
        status TEXT DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users (id, email, full_name, role)
      SELECT 1, 'admin@zentriumph.ec', 'Andrea Suárez', 'Admin'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);
    `,
  },
  {
    id: "003_instructors",
    sql: `
      CREATE TABLE IF NOT EXISTS instructors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        cedula TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Teórico', 'Práctico', 'Ambos')),
        phone TEXT,
        status TEXT DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    id: "004_vehicles",
    sql: `
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_number TEXT NOT NULL,
        plates TEXT NOT NULL UNIQUE,
        model TEXT NOT NULL,
        status TEXT DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    id: "005_courses",
    sql: `
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        license_type TEXT NOT NULL CHECK(license_type IN ('B', 'C', 'D', 'E', 'F')),
        start_enrollment_date DATE NOT NULL,
        end_enrollment_date DATE NOT NULL,
        start_course_date DATE NOT NULL,
        end_course_date DATE NOT NULL,
        theory_schedule TEXT NOT NULL,
        practice_schedule_range TEXT,
        psychology_schedule TEXT DEFAULT 'Sábado 08H00-12H00',
        theory_instructor_id INTEGER,
        oficio_prefix TEXT DEFAULT 'ALERTA',
        oficio_year INTEGER,
        oficio_start_number INTEGER DEFAULT 1,
        permiso_start_number TEXT,
        fase_actual INTEGER DEFAULT 1 CHECK(fase_actual BETWEEN 1 AND 4),
        status TEXT DEFAULT 'Activo' CHECK(status IN ('Activo', 'Matrículas', 'En curso', 'Cerrado', 'Graduado')),
        folder_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (theory_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL
      );
    `,
  },
  {
    id: "006_course_vehicles",
    sql: `
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
    `,
  },
  {
    id: "007_students",
    sql: `
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
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
        vehicle_id INTEGER,
        practice_instructor_id INTEGER,
        status TEXT DEFAULT 'Inscrito' CHECK(status IN ('Inscrito', 'Cursando', 'Aprobado', 'Graduado', 'Activo')),
        receipt_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        FOREIGN KEY (practice_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL
      );
    `,
  },
  {
    id: "008_payments",
    sql: `
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
    `,
  },
  {
    id: "009_grades",
    sql: `
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
    `,
  },
  {
    id: "010_permisos",
    sql: `
      CREATE TABLE IF NOT EXISTS permisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        numero_permiso TEXT,
        fecha_entrega DATE,
        firma_entrega TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: "011_logo_documents",
    sql: `
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
    `,
  },
  {
    id: "012_sequentials",
    sql: `
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
    `,
  },
  {
    id: "013_attendance_theory",
    sql: `
      CREATE TABLE IF NOT EXISTS attendance_theory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        materia TEXT NOT NULL,
        fecha DATE NOT NULL,
        asistio INTEGER DEFAULT 0 CHECK(asistio IN (0, 1)),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: "014_attendance_practice",
    sql: `
      CREATE TABLE IF NOT EXISTS attendance_practice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        fecha DATE NOT NULL,
        dia_numero INTEGER NOT NULL,
        asistio INTEGER DEFAULT 0 CHECK(asistio IN (0, 1)),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: "015_custom_fields",
    sql: `
      CREATE TABLE IF NOT EXISTS custom_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_name TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        show_in_documents TEXT
      );
      CREATE TABLE IF NOT EXISTS student_custom_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        custom_field_id INTEGER NOT NULL,
        value TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: "016_document_delivery",
    sql: `
      CREATE TABLE IF NOT EXISTS document_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        delivered_date DATE DEFAULT CURRENT_DATE,
        signature_path TEXT,
        notes TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `,
  },
  {
    id: "017_indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
      CREATE INDEX IF NOT EXISTS idx_students_cedula ON students(cedula);
      CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
      CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_permisos_student ON permisos(student_id);
    `,
  },
];

export class SQLiteClient {
  private static instance: SQLiteClient | null = null;
  private db: Database | null = null;
  private dbPath: string = "";

  private constructor() {}

  public static getInstance(): SQLiteClient {
    if (!SQLiteClient.instance) {
      SQLiteClient.instance = new SQLiteClient();
    }
    return SQLiteClient.instance;
  }

  public async init(): Promise<void> {
    if (this.db) return;

    try {
      const paths: any = await invoke("ensure_app_dirs");
      this.dbPath = paths.database_path;

      const SQL = await initSqlJs({
        locateFile: () => "/sql-wasm.wasm",
      });

      let dbBuffer: Uint8Array | null = null;

      try {
        const fileData: number[] = await invoke("read_binary_file", { path: this.dbPath });
        if (fileData && fileData.length > 0) {
          dbBuffer = new Uint8Array(fileData);
        }
      } catch {
        console.log("[SQLiteClient] No se encontró database.db previa. Creando nueva base de datos.");
      }

      this.db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database();

      await this.runMigrations();
    } catch (err: any) {
      console.error("[SQLiteClient] Error al inicializar SQLite WASM:", err);
      throw err;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let executed: string[] = [];
    try {
      const res = this.db.exec("SELECT name FROM __migrations");
      if (res.length > 0 && res[0]?.values) {
        executed = res[0].values.map((row) => String(row[0]));
      }
    } catch {
      executed = [];
    }

    let changed = false;

    for (const m of MIGRATIONS) {
      if (!executed.includes(m.id)) {
        console.log(`[SQLiteClient] Ejecutando migración: ${m.id}`);
        this.db.run(m.sql);
        this.db.run("INSERT INTO __migrations (name) VALUES (?)", [m.id]);
        changed = true;
      }
    }

    if (changed) {
      await this.saveToDisk();
    }
  }

  public async saveToDisk(): Promise<void> {
    if (!this.db || !this.dbPath) return;
    const binary = this.db.export();
    await invoke("save_binary_file", {
      path: this.dbPath,
      contents: Array.from(binary),
    });
  }

  public queryAll<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error("Base de datos SQLite no inicializada");
    const stmt = this.db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const list = this.queryAll<T>(sql, params);
    return list.length > 0 ? list[0] ?? null : null;
  }

  public async execute(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error("Base de datos SQLite no inicializada");
    this.db.run(sql, params);
    await this.saveToDisk();
  }
}
