/**
 * Objeto de Valor para Cédula de Identidad Ecuatoriana (Módulo 10)
 */
export class Cedula {
  private readonly value: string;

  constructor(value: string) {
    const cleaned = value.trim();
    if (!Cedula.isValid(cleaned)) {
      throw new Error(`Cédula ecuatoriana inválida: ${value}`);
    }
    this.value = cleaned;
  }

  public getValue(): string {
    return this.value;
  }

  public static isValid(cedula: string): boolean {
    if (!/^\d{10}$/.test(cedula)) return false;
    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    const digitoTercero = parseInt(cedula.substring(2, 3), 10);
    if (digitoTercero >= 6) return false;

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const verificador = parseInt(cedula.substring(9, 10), 10);
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula.charAt(i), 10) * (coeficientes[i] ?? 1);
      if (valor > 9) valor -= 9;
      suma += valor;
    }

    const residuo = suma % 10;
    const resultado = residuo === 0 ? 0 : 10 - residuo;

    return resultado === verificador;
  }
}
