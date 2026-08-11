import type { PaymentProps } from "../entities/Payment";

export interface IPaymentRepository {
  create(payment: PaymentProps): Promise<PaymentProps>;
  findById(id: string): Promise<PaymentProps | null>;
  findByStudentId(studentId: string): Promise<PaymentProps[]>;
  findByCourseId(courseId: string): Promise<PaymentProps[]>;
  findAllToday(): Promise<PaymentProps[]>;
}
