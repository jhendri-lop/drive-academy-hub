import { supabase } from "@/lib/supabase";
import type { StudentProps } from "@/domain/entities/Student";
import type { IStudentRepository } from "@/domain/repositories/IStudentRepository";

export class SupabaseStudentRepository implements IStudentRepository {
  public async create(student: StudentProps): Promise<StudentProps> {
    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          course_id: student.courseId,
          full_name: student.fullName,
          cedula: student.cedula,
          nationality: student.nationality,
          blood_type: student.bloodType,
          sex: student.sex,
          birth_date: student.birthDate,
          age: student.age,
          address: student.address,
          canton: student.canton,
          phone: student.phone,
          email: student.email,
          education_level: student.educationLevel,
          observations: student.observations,
          photo_path: student.photoPath,
          practice_schedule: student.practiceSchedule,
          vehicle_id: student.vehicleId,
          practice_instructor_id: student.practiceInstructorId,
          status: student.status,
          receipt_number: student.receiptNumber,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`[SupabaseStudentRepository] error: ${error.message}`);
    return this.mapToDomain(data);
  }

  public async findById(id: string): Promise<StudentProps | null> {
    const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  public async findByCourseId(courseId: string): Promise<StudentProps[]> {
    const { data, error } = await supabase.from("students").select("*").eq("course_id", courseId);
    if (error || !data) return [];
    return data.map((d) => this.mapToDomain(d));
  }

  public async update(id: string, student: Partial<StudentProps>): Promise<StudentProps> {
    const updateData: Record<string, unknown> = {};
    if (student.fullName) updateData.full_name = student.fullName;
    if (student.cedula) updateData.cedula = student.cedula;
    if (student.status) updateData.status = student.status;

    const { data, error } = await supabase.from("students").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(`[SupabaseStudentRepository] error: ${error.message}`);
    return this.mapToDomain(data);
  }

  public async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("students").delete().eq("id", id);
    return !error;
  }

  private mapToDomain(db: Record<string, any>): StudentProps {
    return {
      id: db.id,
      courseId: db.course_id,
      fullName: db.full_name,
      cedula: db.cedula,
      nationality: db.nationality,
      bloodType: db.blood_type,
      sex: db.sex,
      birthDate: db.birth_date,
      age: db.age,
      address: db.address,
      canton: db.canton,
      phone: db.phone,
      email: db.email,
      educationLevel: db.education_level,
      observations: db.observations,
      photoPath: db.photo_path,
      practiceSchedule: db.practice_schedule,
      vehicleId: db.vehicle_id,
      practiceInstructorId: db.practice_instructor_id,
      status: db.status,
      receiptNumber: db.receipt_number,
      createdAt: db.created_at,
    };
  }
}
