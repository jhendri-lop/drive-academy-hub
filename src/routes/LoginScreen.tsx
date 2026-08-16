import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import { validarLicenciaOffline } from "@/infrastructure/auth/validarLicenciaOffline";
import { Lock, Mail, Key, ExternalLink, Loader2, AlertCircle } from "lucide-react";

interface LoginScreenProps {
  onSuccess?: () => void;
  onLicenseExpired?: (mensaje: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onLicenseExpired }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const setSesion = useApp((s) => s.setSesion);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Por favor ingrese su correo y contraseña.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Iniciar sesión con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error || !data.session) {
        setErrorMsg("Credenciales incorrectas o usuario no registrado.");
        setLoading(false);
        return;
      }

      // 2. Obtener escuela_id del usuario desde tabla escuelas o metadata
      let escuelaId = data.user.user_metadata?.escuela_id || data.user.id;
      try {
        const { data: escuelaData } = await supabase
          .from("escuelas")
          .select("id, plan, fecha_expiracion")
          .eq("email", email.trim())
          .maybeSingle();

        if (escuelaData?.id) {
          escuelaId = escuelaData.id;
        }
      } catch {
        // Usar fallback a ID de usuario
      }

      // 3. Validar Licencia
      const resultLicencia = await validarLicenciaOffline(escuelaId);

      if (!resultLicencia.valida) {
        if (onLicenseExpired) {
          onLicenseExpired(resultLicencia.mensaje);
        } else {
          setErrorMsg(resultLicencia.mensaje || "Licencia expirada o no encontrada.");
        }
        setLoading(false);
        return;
      }

      // 4. Guardar sesión en Zustand
      setSesion({
        email: data.user.email || email.trim(),
        escuelaId: escuelaId,
        nombre: data.user.user_metadata?.full_name || email.split("@")[0] || "Usuario",
        accessToken: data.session.access_token,
        plan: resultLicencia.plan || "Activo",
        fechaExpiracion: resultLicencia.fechaExpiracion || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("[LoginScreen] Error de autenticación:", err);
      setErrorMsg("Ocurrió un error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-6 select-none font-sans">
      <div className="w-full max-w-md my-auto bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4 shadow-lg shadow-blue-500/10">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Zentriumph Drive Academy</h1>
          <p className="text-sm text-slate-400 mt-1">Ingrese sus credenciales para acceder al sistema</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@escuela.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validando...
              </>
            ) : (
              "Ingresar al Sistema"
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <a
            href="https://zentriumph.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
          >
            ¿No tienes cuenta? Regístrate en zentriumph.com
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Versión */}
      <div className="text-xs text-slate-600 font-mono">
        Zentriumph Drive Academy • v1.0.0
      </div>
    </div>
  );
};
