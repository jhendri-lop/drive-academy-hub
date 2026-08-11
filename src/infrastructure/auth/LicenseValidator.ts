import { supabase } from "@/lib/supabase";

export interface LocalLicenseToken {
  licenseKey: string;
  schoolName: string;
  validUntil: string; // ISO date string
  lastValidatedAt: string; // ISO date string
  status: "Activa" | "Expirada" | "EnGracia";
}

const STORAGE_KEY = "zentriumph_license_token";
const GRACE_PERIOD_DAYS = 7;

export class LicenseValidator {
  private static instance: LicenseValidator | null = null;

  private constructor() {}

  public static getInstance(): LicenseValidator {
    if (!LicenseValidator.instance) {
      LicenseValidator.instance = new LicenseValidator();
    }
    return LicenseValidator.instance;
  }

  public getStoredToken(): LocalLicenseToken | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LocalLicenseToken) : null;
    } catch {
      return null;
    }
  }

  public async validateLicense(licenseKey: string): Promise<{ valid: boolean; message: string; token?: LocalLicenseToken }> {
    const now = new Date();

    // 1. Intentar validar online vía Supabase
    try {
      const { data, error } = await supabase
        .from("school_licenses")
        .select("*")
        .eq("license_key", licenseKey)
        .single();

      if (error || !data) {
        return { valid: false, message: "Licencia no válida o no encontrada en el servidor." };
      }

      const validUntil = new Date(data.valid_until);
      if (validUntil < now) {
        return { valid: false, message: "La licencia contratada ha expirado." };
      }

      const token: LocalLicenseToken = {
        licenseKey: data.license_key,
        schoolName: data.school_name || "Zentriumph-DriveOfice",
        validUntil: data.valid_until,
        lastValidatedAt: now.toISOString(),
        status: "Activa",
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
      return { valid: true, message: "Licencia validada exitosamente con el servidor.", token };
    } catch {
      // 2. Si falla la red (Modo Offline), verificar token local y gracia de 7 días
      const stored = this.getStoredToken();
      if (!stored || stored.licenseKey !== licenseKey) {
        return { valid: false, message: "Sin conexión a internet y no hay token local para esta clave." };
      }

      const lastValidated = new Date(stored.lastValidatedAt);
      const diffTime = Math.abs(now.getTime() - lastValidated.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= GRACE_PERIOD_DAYS) {
        const tokenInGrace: LocalLicenseToken = {
          ...stored,
          status: "EnGracia",
        };
        return {
          valid: true,
          message: `Modo Offline activo (Día ${diffDays} de ${GRACE_PERIOD_DAYS} del periodo de gracia).`,
          token: tokenInGrace,
        };
      }

      return { valid: false, message: "Período de gracia offline expirado (máx. 7 días sin conexión)." };
    }
  }
}
