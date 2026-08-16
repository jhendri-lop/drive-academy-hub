import { LicenseValidator } from "./LicenseValidator";

export interface ResultadoLicencia {
  valida: boolean;
  mensaje: string;
  dias_restantes?: number;
  plan?: string;
  fechaExpiracion?: string;
}

export async function validarLicenciaOffline(escuelaId: string): Promise<ResultadoLicencia> {
  const LAST_CHECK_KEY = "zentriumph_last_check";

  try {
    const validator = LicenseValidator.getInstance();
    const result = await validator.validateLicense(escuelaId);

    if (result.valid) {
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
      return {
        valida: true,
        mensaje: result.message,
        plan: result.token?.status || "Activo",
        fechaExpiracion: result.token?.validUntil,
      };
    } else {
      return {
        valida: false,
        mensaje: result.message,
      };
    }
  } catch {
    // Si falla la conexión a internet (Modo Offline)
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) {
      return {
        valida: false,
        mensaje: "Primera vez requiere conexión a internet para validar la licencia.",
      };
    }

    const lastCheckDate = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    const diffTime = Math.abs(now - lastCheckDate);
    const diasDesdeCheck = diffTime / (1000 * 60 * 60 * 24);

    if (diasDesdeCheck <= 7) {
      const diasRestantes = Math.max(0, Math.floor(7 - diasDesdeCheck));
      return {
        valida: true,
        mensaje: `Modo offline activo (${diasRestantes} días de gracia restantes).`,
        dias_restantes: diasRestantes,
      };
    }

    return {
      valida: false,
      mensaje: "Período de gracia sin conexión expirado (más de 7 días sin validar online). Conéctate a internet para continuar.",
    };
  }
}
