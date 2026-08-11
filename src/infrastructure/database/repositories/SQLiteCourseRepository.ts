import { SQLiteClient } from "../SQLiteClient";
import type { ICourseRepository } from "@/domain/repositories/ICourseRepository";
import type { CourseProps } from "@/domain/entities/Course";

export class SQLiteCourseRepository implements ICourseRepository {
  private client = SQLiteClient.getInstance();

  private mapRowToProps(row: any): CourseProps {
    return {
      id: String(row.id),
      courseName: row.course_name,
      licenseType: row.license_type,
      startEnrollmentDate: row.start_enrollment_date,
      endEnrollmentDate: row.end_enrollment_date,
      startCourseDate: row.start_course_date,
      endCourseDate: row.end_course_date,
      theorySchedule: row.theory_schedule,
      practiceScheduleRange: row.practice_schedule_range || "",
      psychologySchedule: row.psychology_schedule || "Sábado 08H00-12H00",
      theoryInstructorId: row.theory_instructor_id ? String(row.theory_instructor_id) : undefined,
      oficioPrefix: row.oficio_prefix || "ALERTA",
      oficioYear: row.oficio_year || new Date().getFullYear(),
      oficioStartNumber: row.oficio_start_number || 1,
      permisoStartNumber: row.permiso_start_number || "",
      faseActual: row.fase_actual || 1,
      status: row.status || "Activo",
      folderPath: row.folder_path || "",
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  }

  public async create(course: CourseProps): Promise<CourseProps> {
    const sql = `
      INSERT INTO courses (
        course_name, license_type, start_enrollment_date, end_enrollment_date,
        start_course_date, end_course_date, theory_schedule, practice_schedule_range,
        psychology_schedule, theory_instructor_id, oficio_prefix, oficio_year,
        oficio_start_number, permiso_start_number, fase_actual, status, folder_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      course.courseName,
      course.licenseType,
      course.startEnrollmentDate,
      course.endEnrollmentDate,
      course.startCourseDate,
      course.endCourseDate,
      course.theorySchedule,
      course.practiceScheduleRange || "",
      course.psychologySchedule || "Sábado 08H00-12H00",
      course.theoryInstructorId || null,
      course.oficioPrefix || "ALERTA",
      course.oficioYear || new Date().getFullYear(),
      course.oficioStartNumber || 1,
      course.permisoStartNumber || "",
      course.faseActual || 1,
      course.status || "Activo",
      course.folderPath || "",
    ];

    await this.client.execute(sql, params);
    const row = this.client.queryOne(`SELECT * FROM courses WHERE course_name = ? ORDER BY id DESC LIMIT 1`, [course.courseName]);
    return row ? this.mapRowToProps(row) : course;
  }

  public async findById(id: string): Promise<CourseProps | null> {
    const row = this.client.queryOne(`SELECT * FROM courses WHERE id = ?`, [id]);
    return row ? this.mapRowToProps(row) : null;
  }

  public async findAll(): Promise<CourseProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM courses ORDER BY id DESC`);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async findByStatus(status: string): Promise<CourseProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM courses WHERE status = ? ORDER BY id DESC`, [status]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async update(id: string, updates: Partial<CourseProps>): Promise<CourseProps> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.courseName !== undefined) { fields.push("course_name = ?"); params.push(updates.courseName); }
    if (updates.faseActual !== undefined) { fields.push("fase_actual = ?"); params.push(updates.faseActual); }
    if (updates.status !== undefined) { fields.push("status = ?"); params.push(updates.status); }
    if (updates.theorySchedule !== undefined) { fields.push("theory_schedule = ?"); params.push(updates.theorySchedule); }

    if (fields.length > 0) {
      params.push(id);
      await this.client.execute(`UPDATE courses SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Curso con id ${id} no encontrado`);
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    await this.client.execute(`DELETE FROM courses WHERE id = ?`, [id]);
    return true;
  }
}
