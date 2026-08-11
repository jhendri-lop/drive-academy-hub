export class Money {
  private readonly amount: number;

  constructor(amount: number) {
    if (isNaN(amount) || amount < 0) {
      throw new Error(`Monto financiero inválido: ${amount}`);
    }
    this.amount = Math.round(amount * 100) / 100;
  }

  public getAmount(): number {
    return this.amount;
  }

  public add(other: Money): Money {
    return new Money(this.amount + other.getAmount());
  }

  public subtract(other: Money): Money {
    const result = this.amount - other.getAmount();
    return new Money(result < 0 ? 0 : result);
  }

  public formatFormatted(): string {
    return `$${this.amount.toFixed(2)}`;
  }
}
