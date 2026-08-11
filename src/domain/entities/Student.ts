import { BloodType } from "../value-objects/BloodType";
import { Money } from "../value-objects/Money";

export interface StudentProps {
  id?: string;
  courseId: string;
  fullName: string;
  cedula: string;
  nationality: string;
  bloodType: string;
  sex: "M" | "F" | "Masculino" | "Femenino";
  birthDate: string; // YYYY-MM-DD
  age?: number;
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
  status?: "Inscrito" | "Cursando" | "Aprobado" | "Graduado" | "Activo";
  receiptNumber?: number;
  numeroPermiso?: string;
  createdAt?: string;
}

export class Student {
  private props: StudentProps;

  constructor(props: StudentProps) {
    this.props = {
      ...props,
      nationality: props.nationality || "Ecuatoriana",
      canton: props.canton || "Quito",
      status: props.status || "Inscrito",
      email: props.email ? props.email.toLowerCase() : "",
      age: props.age ?? Student.calculateAge(props.birthDate),
    };
  }

  public getProps(): StudentProps {
    return { ...this.props };
  }

  public static calculateAge(birthDateStr: string): number {
    if (!birthDateStr) return 0;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  }

  public getFullBloodType(): string {
    return new BloodType(this.props.bloodType).getFullAntFormat();
  }
}
