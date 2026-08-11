import { supabase } from "@/lib/supabase";
import type { CourseProps } from "@/domain/entities/Course";
import type { ICourseRepository } from "@/domain/repositories/ICourseRepository";

export class SupabaseCourseRepository implements ICourseRepository {
  public async create(course: CourseProps): Promise<CourseProps> {
    const { data, error } = await supabase
      .from("courses")
      .insert([
        {
          course_name: course.courseName,
          license_type: course.licenseType,
          start_enrollment_date: course.startEnrollmentDate,
          end_enrollment_date: course.endEnrollmentDate,
          start_course_date: course.startCourseDate,
          end_course_date: course.endCourseDate,
          theory_schedule: course.theorySchedule,
          practice_schedule_range: course.practiceScheduleRange,
          psychology_schedule: course.psychologySchedule,
          theory_instructor_id: course.theoryInstructorId,
          oficio_prefix: course.oficioPrefix,
          oficio_year: course.oficioYear,
          oficio_start_number: course.oficioStartNumber,
          fase_actual: course.faseActual,
          status: course.status,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`[SupabaseCourseRepository] error: ${error.message}`);
    return this.mapToDomain(data);
  }

  public async findById(id: string): Promise<CourseProps | null> {
    const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  public async findAll(): Promise<CourseProps[]> {
    const { data, error } = await supabase.from("courses").select("*");
    if (error || !data) return [];
    return data.map((d) => this.mapToDomain(d));
  }

  public async update(id: string, course: Partial<CourseProps>): Promise<CourseProps> {
    const updateData: Record<string, unknown> = {};
    if (course.courseName) updateData.course_name = course.courseName;
    if (course.faseActual) updateData.fase_actual = course.faseActual;
    if (course.status) updateData.status = course.status;

    const { data, error } = await supabase.from("courses").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(`[SupabaseCourseRepository] error: ${error.message}`);
    return this.mapToDomain(data);
  }

  public async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    return !error;
  }

  private mapToDomain(db: Record<string, any>): CourseProps {
    return {
      id: db.id,
      courseName: db.course_name,
      licenseType: db.license_type,
      startEnrollmentDate: db.start_enrollment_date,
      endEnrollmentDate: db.end_enrollment_date,
      startCourseDate: db.start_course_date,
      endCourseDate: db.end_course_date,
      theorySchedule: db.theory_schedule,
      practiceScheduleRange: db.practice_schedule_range,
      psychologySchedule: db.psychology_schedule,
      theoryInstructorId: db.theory_instructor_id,
      oficioPrefix: db.oficio_prefix,
      oficioYear: db.oficio_year,
      oficioStartNumber: db.oficio_start_number,
      faseActual: db.fase_actual,
      status: db.status,
      createdAt: db.created_at,
    };
  }
}
