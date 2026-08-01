import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, DollarSign, GraduationCap, Plus, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { Badge, Panel, PhaseButton, StatCard } from "@/components/ui-kit/Primitives";
import { CrearCursoModal } from "@/components/CrearCursoModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Drive Academy" },
      { name: "description", content: "Resumen de cursos activos, estudiantes, ingresos del día y exámenes próximos." },
      { property: "og:title", content: "Dashboard — Drive Academy" },
      { property: "og:description", content: "Resumen operativo de la escuela de conducción." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { cursos, estudiantes, recibos } = useApp();
  const [open, setOpen] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);
  const ingresosHoy = recibos.filter((r) => r.fecha === hoy).reduce((a, r) => a + r.monto, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[12px] text-muted-foreground">Resumen operativo de la escuela</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Cursos Activos" value={cursos.filter((c) => c.estado !== "Finalizado").length} hint={`${cursos.length} en total`} />
        <StatCard icon={Users} label="Estudiantes Totales" value={estudiantes.length} hint="Matriculados" />
        <StatCard icon={DollarSign} label="Ingresos Hoy" value={`$${ingresosHoy.toFixed(2)}`} hint={`${recibos.filter((r) => r.fecha === hoy).length} recibos`} />
        <StatCard icon={CalendarClock} label="Exámenes Próximos" value={cursos.filter((c) => c.faseActual >= 3).length} hint="Fase 3 o superior" />
      </div>

      <Panel className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-[14px] font-semibold">Cursos recientes</h2>
          <Link to="/cursos" className="text-[12px] font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y">
          {cursos.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-52">
                <p className="text-[13px] font-medium">{c.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  Licencia {c.tipoLicencia} · {c.inicioCurso} → {c.finCurso}
                </p>
              </div>
              <Badge tone={c.estado === "En curso" ? "success" : c.estado === "Matrículas" ? "warning" : "muted"}>{c.estado}</Badge>
              <Badge tone="primary">Fase {c.faseActual}</Badge>
              <span className="text-[12px] text-muted-foreground">
                {estudiantes.filter((e) => e.cursoId === c.id).length} alumnos
              </span>
              <Link
                to="/cursos/$cursoId"
                params={{ cursoId: c.id }}
                className="ml-auto text-[12px] font-medium text-primary hover:underline"
              >
                Ver estudiantes →
              </Link>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((f) => (
          <PhaseButton key={f} fase={f} estado="inactivo" />
        ))}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[13px] font-semibold text-primary-foreground shadow-panel transition-transform hover:scale-105"
      >
        <Plus size={16} /> Nuevo Curso
      </button>

      <CrearCursoModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
