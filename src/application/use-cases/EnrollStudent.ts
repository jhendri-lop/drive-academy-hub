import { Student, type StudentProps } from "@/domain/entities/Student";
import { Payment, type PaymentProps } from "@/domain/entities/Payment";
import type { IStudentRepository } from "@/domain/repositories/IStudentRepository";
import type { IPaymentRepository } from "@/domain/repositories/IPaymentRepository";

export interface EnrollStudentDTO {
  courseId: string;
  fullName: string;
  cedula: string;
  nationality: string;
  bloodType: string;
  sex: "M" | "F" | "Masculino" | "Femenino";
  birthDate: string;
  address: string;
  canton?: string;
  phone?: string;
  email?: string;
  educationLevel?: string;
  observations?: string;
  photoPath?: string;
  practiceSchedule?: string;
  vehicleId?: string;
  practiceInstructorId?: string;
  concept: string;
  totalAmount: number;
  paymentAmount: number;
  paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta";
  receiptNumber: number;
  transferNumber?: string;
}

export class EnrollStudentUseCase {
  constructor(
    private studentRepo: IStudentRepository,
    private paymentRepo: IPaymentRepository,
  ) {}

  public async execute(dto: EnrollStudentDTO): Promise<{ student: StudentProps; payment: PaymentProps }> {
    const studentEntity = new Student({
      courseId: dto.courseId,
      fullName: dto.fullName,
      cedula: dto.cedula,
      nationality: dto.nationality,
      bloodType: dto.bloodType,
      sex: dto.sex,
      birthDate: dto.birthDate,
      address: dto.address,
      canton: dto.canton,
      phone: dto.phone,
      email: dto.email,
      educationLevel: dto.educationLevel,
      observations: dto.observations,
      photoPath: dto.photoPath,
      practiceSchedule: dto.practiceSchedule,
      vehicleId: dto.vehicleId,
      practiceInstructorId: dto.practiceInstructorId,
      receiptNumber: dto.receiptNumber,
      status: "Inscrito",
    });

    const createdStudent = await this.studentRepo.create(studentEntity.getProps());

    const paymentEntity = new Payment({
      studentId: createdStudent.id || "",
      courseId: dto.courseId,
      concept: dto.concept,
      totalAmount: dto.totalAmount,
      paymentAmount: dto.paymentAmount,
      paymentMethod: dto.paymentMethod,
      receiptNumber: dto.receiptNumber,
      transferNumber: dto.transferNumber,
    });

    const createdPayment = await this.paymentRepo.create(paymentEntity.getProps());

    return { student: createdStudent, payment: createdPayment };
  }
}
