import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./styles.css";
import { TopNav } from "@/components/TopNav";
import Dashboard from "@/routes/index";
import CursosPage from "@/routes/cursos.index";
import CursoDetalle from "@/routes/cursos.$cursoId";
import CajaPage from "@/routes/caja";
import ConfiguracionPage from "@/routes/configuracion";

import { useEffect, useState } from "react";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { TemplateStorage } from "@/infrastructure/storage/TemplateStorage";
import { validarLicenciaOffline } from "@/infrastructure/auth/validarLicenciaOffline";
import { LoginScreen } from "@/routes/LoginScreen";
import { LicenseLockScreen } from "@/routes/LicenseLockScreen";
import { useApp } from "@/lib/store";

function AppLayout() {
  const [ready, setReady] = useState(false);
  const theme = useApp((s) => s.theme);
  const palette = useApp((s) => s.palette);
  const sesion = useApp((s) => s.sesion);

  const [licenseStatus, setLicenseStatus] = useState<{ checked: boolean; valid: boolean; message: string }>({
    checked: false,
    valid: true,
    message: "",
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("zentriumph_theme", theme);
    localStorage.setItem("zentriumph_palette", palette);
  }, [theme, palette]);

  useEffect(() => {
    // Inicializar SQLite DB y copiar plantillas editables por defecto
    Promise.all([
      SQLiteClient.getInstance().init(),
      TemplateStorage.getInstance().copyDefaultTemplates(),
    ])
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Error al iniciar recursos locales:", err);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (sesion?.escuelaId) {
      validarLicenciaOffline(sesion.escuelaId).then((res) => {
        setLicenseStatus({
          checked: true,
          valid: res.valida,
          message: res.mensaje,
        });
      });
    } else {
      setLicenseStatus({ checked: true, valid: false, message: "" });
    }
  }, [sesion]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium">Cargando Zentriumph-DriveOfice DB...</p>
        </div>
      </div>
    );
  }

  if (!sesion) {
    return (
      <LoginScreen
        onSuccess={() => {
          const currentSesion = useApp.getState().sesion;
          if (currentSesion?.escuelaId) {
            validarLicenciaOffline(currentSesion.escuelaId).then((res) => {
              setLicenseStatus({ checked: true, valid: res.valida, message: res.mensaje });
            });
          }
        }}
        onLicenseExpired={(msg) => setLicenseStatus({ checked: true, valid: false, message: msg })}
      />
    );
  }

  if (licenseStatus.checked && !licenseStatus.valid) {
    return <LicenseLockScreen mensaje={licenseStatus.message} />;
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <TopNav />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cursos" element={<CursosPage />} />
          <Route path="/cursos/:cursoId" element={<CursoDetalle />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Routes>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <AppLayout />
    </HashRouter>
  </React.StrictMode>,
);
