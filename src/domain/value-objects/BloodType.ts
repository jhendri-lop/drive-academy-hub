export type TipoSangreSimple = "O+" | "A+" | "B+" | "AB+" | "O-" | "A-" | "B-" | "AB-";

export class BloodType {
  private readonly raw: string;
  private readonly rh: string;

  constructor(raw: string) {
    this.raw = raw.trim().toUpperCase();
    this.rh = this.raw.endsWith("-") ? "Negativo" : "Positivo";
  }

  public getRaw(): string {
    return this.raw;
  }

  public getRh(): string {
    return this.rh;
  }

  /**
   * Formato completo requerido por normativas ANT (ej. ORH+, ARH+, etc.)
   */
  public getFullAntFormat(): string {
    const grupo = this.raw.replace(/[-+]/g, "");
    const signo = this.raw.includes("-") ? "-" : "+";
    return `${grupo}RH${signo}`;
  }
}
