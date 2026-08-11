import { SQLiteClient } from "../SQLiteClient";
import type { IStudentRepository } from "@/domain/repositories/IStudentRepository";
import type { StudentProps } from "@/domain/entities/Student";

export class SQLiteStudentRepository implements IStudentRepository {
  private client = SQLiteClient.getInstance();

  private mapRowToProps(row: any): StudentProps {
    return {
      id: String(row.id),
      courseId: String(row.course_id),
      fullName: row.full_name,
      cedula: row.cedula,
      nationality: row.nationality || "Ecuatoriana",
      bloodType: row.blood_type,
      sex: row.sex,
      birthDate: row.birth_date,
      age: row.age,
      address: row.address,
      canton: row.canton || "Quito",
      phone: row.phone || "",
      email: row.email || "",
      educationLevel: row.education_level || "",
      observations: row.observations || "",
      photoPath: row.photo_path || "",
      practiceSchedule: row.practice_schedule || "",
      vehicleId: row.vehicle_id ? String(row.vehicle_id) : undefined,
      practiceInstructorId: row.practice_instructor_id ? String(row.practice_instructor_id) : undefined,
      status: row.status,
      receiptNumber: row.receipt_number,
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  }

  public async create(student: StudentProps): Promise<StudentProps> {
    const sql = `
      INSERT INTO students (
        course_id, full_name, cedula, nationality, blood_type, sex, birth_date,
        age, address, canton, phone, email, education_level, observations,
        photo_path, practice_schedule, vehicle_id, practice_instructor_id,
        status, receipt_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      student.courseId,
      student.fullName,
      student.cedula,
      student.nationality || "Ecuatoriana",
      student.bloodType,
      student.sex,
      student.birthDate,
      student.age || null,
      student.address,
      student.canton || "Quito",
      student.phone || "",
      student.email || "",
      student.educationLevel || "",
      student.observations || "",
      student.photoPath || "",
      student.practiceSchedule || "",
      student.vehicleId || null,
      student.practiceInstructorId || null,
      student.status || "Inscrito",
      student.receiptNumber || null,
    ];

    await this.client.execute(sql, params);
    const row = this.client.queryOne(`SELECT * FROM students WHERE cedula = ? ORDER BY id DESC LIMIT 1`, [student.cedula]);
    return row ? this.mapRowToProps(row) : student;
  }

  public async findById(id: string): Promise<StudentProps | null> {
    const row = this.client.queryOne(`SELECT * FROM students WHERE id = ?`, [id]);
    return row ? this.mapRowToProps(row) : null;
  }

  public async findAll(): Promise<StudentProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM students ORDER BY id DESC`);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async findByCourseId(courseId: string): Promise<StudentProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM students WHERE course_id = ? ORDER BY id DESC`, [courseId]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async update(id: string, updates: Partial<StudentProps>): Promise<StudentProps> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.fullName !== undefined) { fields.push("full_name = ?"); params.push(updates.fullName); }
    if (updates.cedula !== undefined) { fields.push("cedula = ?"); params.push(updates.cedula); }
    if (updates.bloodType !== undefined) { fields.push("blood_type = ?"); params.push(updates.bloodType); }
    if (updates.phone !== undefined) { fields.push("phone = ?"); params.push(updates.phone); }
    if (updates.email !== undefined) { fields.push("email = ?"); params.push(updates.email); }
    if (updates.status !== undefined) { fields.push("status = ?"); params.push(updates.status); }
    if (updates.practiceSchedule !== undefined) { fields.push("practice_schedule = ?"); params.push(updates.practiceSchedule); }
    if (updates.vehicleId !== undefined) { fields.push("vehicle_id = ?"); params.push(updates.vehicleId || null); }
    if (updates.practiceInstructorId !== undefined) { fields.push("practice_instructor_id = ?"); params.push(updates.practiceInstructorId || null); }

    if (fields.length > 0) {
      params.push(id);
      await this.client.execute(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Estudiante con id ${id} no encontrado`);
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    await this.client.execute(`DELETE FROM students WHERE id = ?`, [id]);
    return true;
  }
}
