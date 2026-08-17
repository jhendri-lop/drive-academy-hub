import { LicenseValidator } from "./LicenseValidator";

export interface ResultadoLicencia {
  valida: boolean;
  mensaje: string;
  dias_restantes?: number;
  plan?: string;
  fechaExpiracion?: string;
}

export async function validarLicenciaOffline(
  escuelaId: string,
  escuelaData?: { estado: string; fechaExpiracion: string; plan: string }
): Promise<ResultadoLicencia> {
  const LAST_CHECK_KEY = "zentriumph_last_check";

  // Intentar recuperar datos guardados en localStorage si no vienen en la llamada
  if (!escuelaData) {
    const savedEscuela = localStorage.getItem("zentriumph_escuela_data");
    if (savedEscuela) {
      try {
        escuelaData = JSON.parse(savedEscuela);
      } catch (e) {
        console.warn("[Validar] Error leyendo escuela guardada:", e);
      }
    }
  }

  console.log("[DEBUG Validar] escuelaData recibido/recuperado:", escuelaData);

  // Si tenemos los datos de la escuela (desde LoginScreen/RPC o localStorage), validar directamente
  if (escuelaData && escuelaData.estado && escuelaData.fechaExpiracion) {
    const fechaExp = new Date(escuelaData.fechaExpiracion);
    const ahora = new Date();

    console.log("[DEBUG Validar] fechaExp:", fechaExp, "| ahora:", ahora);
    console.log("[DEBUG Validar] fechaExp < ahora?", fechaExp < ahora);
    console.log("[DEBUG Validar] estado:", escuelaData.estado, "| es activa?", escuelaData.estado === "activa");

    if (escuelaData.estado !== "activa") {
      return {
        valida: false,
        mensaje: "Licencia no activa. Estado actual: " + escuelaData.estado,
      };
    }

    if (fechaExp < ahora) {
      return {
        valida: false,
        mensaje: "Licencia expirada el " + fechaExp.toLocaleDateString(),
      };
    }

    const diasRestantes = Math.ceil((fechaExp.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

    localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

    return {
      valida: true,
      mensaje: "Licencia válida",
      plan: escuelaData.plan,
      dias_restantes: diasRestantes,
      fechaExpiracion: escuelaData.fechaExpiracion,
    };
  }

  // Si no hay datos de escuela disponibles, solicitar inicio de sesión en lugar de caer en error 404
  return {
    valida: false,
    mensaje: "No se encontraron datos de licencia. Inicia sesión de nuevo.",
  };
}
