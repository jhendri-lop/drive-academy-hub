import { Money } from "../value-objects/Money";

export interface PaymentProps {
  id?: string;
  studentId: string;
  courseId: string;
  concept: string;
  totalAmount: number;
  paymentAmount: number;
  balance?: number;
  paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta";
  receiptNumber: number;
  receiptDate?: string;
  transferNumber?: string;
  transferImagePath?: string;
  createdAt?: string;
}

export class Payment {
  private props: PaymentProps;

  constructor(props: PaymentProps) {
    const total = new Money(props.totalAmount);
    const abono = new Money(props.paymentAmount);
    const saldo = total.subtract(abono);

    this.props = {
      ...props,
      balance: saldo.getAmount(),
      receiptDate: props.receiptDate || new Date().toISOString().slice(0, 10),
    };
  }

  public getProps(): PaymentProps {
    return { ...this.props };
  }

  public isFullyPaid(): boolean {
    return (this.props.balance ?? 0) === 0;
  }
}
