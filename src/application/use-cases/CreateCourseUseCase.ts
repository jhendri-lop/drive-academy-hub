import { Course, type CourseProps } from "@/domain/entities/Course";
import type { ICourseRepository } from "@/domain/repositories/ICourseRepository";

export interface CreateCourseDTO {
  courseName: string;
  licenseType: "B" | "C" | "D" | "E" | "F";
  startEnrollmentDate: string;
  endEnrollmentDate: string;
  startCourseDate: string;
  endCourseDate: string;
  theorySchedule: string;
  practiceScheduleRange?: string;
  psychologySchedule?: string;
  theoryInstructorId?: string;
  oficioPrefix?: string;
  oficioYear?: number;
  oficioStartNumber?: number;
  permisoStartNumber?: string;
  faseActual?: 1 | 2 | 3 | 4;
  status?: "Activo" | "Matrículas" | "En curso" | "Cerrado" | "Graduado";
  folderPath?: string;
}

export class CreateCourseUseCase {
  constructor(private courseRepo: ICourseRepository) {}

  public async execute(dto: CreateCourseDTO): Promise<CourseProps> {
    const courseEntity = new Course({
      courseName: dto.courseName,
      licenseType: dto.licenseType,
      startEnrollmentDate: dto.startEnrollmentDate,
      endEnrollmentDate: dto.endEnrollmentDate,
      startCourseDate: dto.startCourseDate,
      endCourseDate: dto.endCourseDate,
      theorySchedule: dto.theorySchedule,
      practiceScheduleRange: dto.practiceScheduleRange || "",
      psychologySchedule: dto.psychologySchedule || "Sábado 08H00-12H00",
      theoryInstructorId: dto.theoryInstructorId,
      oficioPrefix: dto.oficioPrefix || "ALERTA",
      oficioYear: dto.oficioYear || new Date().getFullYear(),
      oficioStartNumber: dto.oficioStartNumber || 1,
      permisoStartNumber: dto.permisoStartNumber || "",
      faseActual: dto.faseActual || 1,
      status: dto.status || "Activo",
      folderPath: dto.folderPath || "",
    });

    return await this.courseRepo.create(courseEntity.getProps());
  }
}
