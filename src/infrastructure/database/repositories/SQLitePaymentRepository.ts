import { SQLiteClient } from "../SQLiteClient";
import type { IPaymentRepository } from "@/domain/repositories/IPaymentRepository";
import type { PaymentProps } from "@/domain/entities/Payment";

export class SQLitePaymentRepository implements IPaymentRepository {
  private client = SQLiteClient.getInstance();

  private mapRowToProps(row: any): PaymentProps {
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      courseId: String(row.course_id),
      concept: row.concept,
      totalAmount: row.total_amount,
      paymentAmount: row.payment_amount,
      paymentMethod: row.payment_method,
      receiptNumber: row.receipt_number,
      receiptDate: row.receipt_date || new Date().toISOString().slice(0, 10),
      transferNumber: row.transfer_number || undefined,
      transferImagePath: row.transfer_image_path || undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  }

  public async create(payment: PaymentProps): Promise<PaymentProps> {
    const balance = payment.totalAmount - payment.paymentAmount;
    const sql = `
      INSERT INTO payments (
        student_id, course_id, concept, total_amount, payment_amount,
        balance, payment_method, receipt_number, receipt_date, transfer_number, transfer_image_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      payment.studentId,
      payment.courseId,
      payment.concept,
      payment.totalAmount,
      payment.paymentAmount,
      balance,
      payment.paymentMethod,
      payment.receiptNumber,
      payment.receiptDate || new Date().toISOString().slice(0, 10),
      payment.transferNumber || null,
      payment.transferImagePath || null,
    ];

    await this.client.execute(sql, params);
    const row = this.client.queryOne(`SELECT * FROM payments WHERE receipt_number = ? ORDER BY id DESC LIMIT 1`, [payment.receiptNumber]);
    return row ? this.mapRowToProps(row) : payment;
  }

  public async findById(id: string): Promise<PaymentProps | null> {
    const row = this.client.queryOne(`SELECT * FROM payments WHERE id = ?`, [id]);
    return row ? this.mapRowToProps(row) : null;
  }

  public async findByStudentId(studentId: string): Promise<PaymentProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM payments WHERE student_id = ? ORDER BY id DESC`, [studentId]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async findByCourseId(courseId: string): Promise<PaymentProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM payments WHERE course_id = ? ORDER BY id DESC`, [courseId]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async findAllToday(): Promise<PaymentProps[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = this.client.queryAll(`SELECT * FROM payments WHERE receipt_date = ? ORDER BY id DESC`, [today]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async findByDateRange(startDate: string, endDate: string): Promise<PaymentProps[]> {
    const rows = this.client.queryAll(`SELECT * FROM payments WHERE receipt_date BETWEEN ? AND ? ORDER BY id DESC`, [startDate, endDate]);
    return rows.map((r) => this.mapRowToProps(r));
  }

  public async update(id: string, updates: Partial<PaymentProps>): Promise<PaymentProps> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.concept !== undefined) { fields.push("concept = ?"); params.push(updates.concept); }
    if (updates.paymentAmount !== undefined) { fields.push("payment_amount = ?"); params.push(updates.paymentAmount); }
    if (updates.transferNumber !== undefined) { fields.push("transfer_number = ?"); params.push(updates.transferNumber || null); }

    if (fields.length > 0) {
      params.push(id);
      await this.client.execute(`UPDATE payments SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    const row = this.client.queryOne(`SELECT * FROM payments WHERE id = ?`, [id]);
    if (!row) throw new Error(`Pago con id ${id} no encontrado`);
    return this.mapRowToProps(row);
  }
}
