import type { CourseProps } from "../entities/Course";

export interface ICourseRepository {
  create(course: CourseProps): Promise<CourseProps>;
  findById(id: string): Promise<CourseProps | null>;
  findAll(): Promise<CourseProps[]>;
  update(id: string, course: Partial<CourseProps>): Promise<CourseProps>;
  delete(id: string): Promise<boolean>;
}
