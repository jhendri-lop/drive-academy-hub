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

import { useApp } from "@/lib/store";

function AppLayout() {
  const [ready, setReady] = useState(false);
  const theme = useApp((s) => s.theme);
  const palette = useApp((s) => s.palette);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("zentriumph_theme", theme);
    localStorage.setItem("zentriumph_palette", palette);
  }, [theme, palette]);

  useEffect(() => {
    SQLiteClient.getInstance()
      .init()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Error al iniciar base de datos SQLite:", err);
        setReady(true); // Fallback para abrir UI incluso en modo desarrollo web
      });
  }, []);

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
