export type LicenseType = "B" | "C" | "D" | "E" | "F";

export interface CourseProps {
  id?: string;
  courseName: string;
  licenseType: LicenseType;
  startEnrollmentDate: string;
  endEnrollmentDate: string;
  startCourseDate: string;
  endCourseDate: string;
  theorySchedule: string;
  practiceScheduleRange?: string;
  psychologySchedule?: string;
  theoryInstructorId?: string;
  vehicleIds?: string[];
  oficioPrefix?: string;
  oficioYear?: number;
  oficioStartNumber?: number;
  permisoStartNumber?: string;
  faseActual?: 1 | 2 | 3 | 4;
  status?: "Activo" | "Matrículas" | "En curso" | "Cerrado" | "Graduado";
  folderPath?: string;
  createdAt?: string;
}

export class Course {
  private props: CourseProps;
  public static readonly MAX_STUDENTS_PER_VEHICLE = 8;

  constructor(props: CourseProps) {
    this.props = {
      ...props,
      psychologySchedule: props.psychologySchedule || "Sábado 08H00-12H00",
      oficioPrefix: props.oficioPrefix || "ALERTA",
      oficioYear: props.oficioYear || new Date().getFullYear(),
      oficioStartNumber: props.oficioStartNumber || 1,
      faseActual: props.faseActual || 1,
      status: props.status || "Matrículas",
      vehicleIds: props.vehicleIds || [],
    };
  }

  public getProps(): CourseProps {
    return { ...this.props };
  }

  public getMaxCapacity(): number {
    const vehicleCount = this.props.vehicleIds?.length || 1;
    return vehicleCount * Course.MAX_STUDENTS_PER_VEHICLE;
  }
}
