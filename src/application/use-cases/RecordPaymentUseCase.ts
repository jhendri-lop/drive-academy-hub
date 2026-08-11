import { Payment, type PaymentProps } from "@/domain/entities/Payment";
import type { IPaymentRepository } from "@/domain/repositories/IPaymentRepository";

export interface RecordPaymentDTO {
  studentId: string;
  courseId: string;
  concept: string;
  totalAmount: number;
  paymentAmount: number;
  paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta";
  receiptNumber: number;
  receiptDate?: string;
  transferNumber?: string;
  transferImagePath?: string;
}

export class RecordPaymentUseCase {
  constructor(private paymentRepo: IPaymentRepository) {}

  public async execute(dto: RecordPaymentDTO): Promise<PaymentProps> {
    const paymentEntity = new Payment({
      studentId: dto.studentId,
      courseId: dto.courseId,
      concept: dto.concept,
      totalAmount: dto.totalAmount,
      paymentAmount: dto.paymentAmount,
      paymentMethod: dto.paymentMethod,
      receiptNumber: dto.receiptNumber,
      receiptDate: dto.receiptDate || new Date().toISOString().slice(0, 10),
      transferNumber: dto.transferNumber,
      transferImagePath: dto.transferImagePath,
    });

    return await this.paymentRepo.create(paymentEntity.getProps());
  }
}
