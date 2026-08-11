import type { StudentProps } from "../entities/Student";

export interface IStudentRepository {
  create(student: StudentProps): Promise<StudentProps>;
  findById(id: string): Promise<StudentProps | null>;
  findByCourseId(courseId: string): Promise<StudentProps[]>;
  update(id: string, student: Partial<StudentProps>): Promise<StudentProps>;
  delete(id: string): Promise<boolean>;
}
