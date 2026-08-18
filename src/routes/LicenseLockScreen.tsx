import React from "react";
import { ShieldAlert, ExternalLink, LogOut } from "lucide-react";
import { useApp } from "@/lib/store";

interface LicenseLockScreenProps {
  mensaje?: string;
}

export const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({ mensaje }) => {
  const logout = useApp((s) => s.logout);

  const sesion = useApp((s) => s.sesion);

  const handleRenovar = () => {
    const email = sesion?.email || "";
    const baseUrl = "https://driveoffice.zentriumph.com/mi-cuenta";
    const url = email ? `${baseUrl}?email=${encodeURIComponent(email)}` : baseUrl;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCerrarSesion = () => {
    logout();
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-6 select-none font-sans"
      style={{ backgroundColor: "#1e3a5f" }}
    >
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-700/60 rounded-3xl shadow-2xl p-10 text-center backdrop-blur-xl">
        {/* Icono de Candado / Alerta */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500 mb-6 shadow-xl shadow-orange-500/20 animate-pulse">
          <ShieldAlert className="w-10 h-10 text-orange-500" />
        </div>

        {/* Títulos */}
        <h1 className="text-3xl font-extrabold text-orange-500 tracking-tight mb-2">
          Licencia Expirada
        </h1>
        <p className="text-slate-300 font-medium text-base mb-6">
          {mensaje || "Tu plan de uso ha vencido o no ha podido ser validado con el servidor."}
        </p>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Renueva ahora tu suscripción para continuar utilizando las herramientas administrativas de{" "}
          <strong className="text-white">Zentriumph Drive Academy</strong>.
        </p>

        {/* Botones de acción */}
        <div className="space-y-4">
          <button
            onClick={handleRenovar}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            <span>Renovar Ahora</span>
            <ExternalLink className="w-5 h-5" />
          </button>

          <button
            onClick={handleCerrarSesion}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Cerrar Sesión / Volver al Inicio</span>
          </button>
        </div>
      </div>

      <div className="mt-8 text-xs text-slate-400 font-mono">
        Zentriumph Systems • Soporte Licencias
      </div>
    </div>
  );
};
