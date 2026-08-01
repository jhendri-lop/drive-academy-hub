import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Badge, Panel, PhaseButton } from "@/components/ui-kit/Primitives";
import { CrearCursoModal } from "@/components/CrearCursoModal";

export const Route = createFileRoute("/cursos/")({
  head: () => ({
    meta: [
      { title: "Cursos — Drive Academy" },
      { name: "description", content: "Listado de cursos de conducción con fases, cupos y estudiantes matriculados." },
      { property: "og:title", content: "Cursos — Drive Academy" },
      { property: "og:description", content: "Gestione cursos, fases y matrículas de la escuela." },
    ],
  }),
  component: CursosPage,
});

function CursosPage() {
  const { cursos, estudiantes, setFase } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-[12px] text-muted-foreground">{cursos.length} cursos registrados</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={14} /> Nuevo Curso
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cursos.map((c) => {
          const alumnos = estudiantes.filter((e) => e.cursoId === c.id).length;
          return (
            <Panel key={c.id} hover className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold">{c.nombre}</h2>
                  <p className="text-[11px] text-muted-foreground">Licencia tipo {c.tipoLicencia}</p>
                </div>
                <Badge tone={c.estado === "En curso" ? "success" : c.estado === "Matrículas" ? "warning" : "muted"}>{c.estado}</Badge>
              </div>

              <dl className="grid grid-cols-2 gap-y-1 text-[12px]">
                <dt className="text-muted-foreground">Matrículas</dt>
                <dd className="text-right">{c.inicioMatriculas || "—"} → {c.finMatriculas || "—"}</dd>
                <dt className="text-muted-foreground">Curso</dt>
                <dd className="text-right">{c.inicioCurso || "—"} → {c.finCurso || "—"}</dd>
                <dt className="text-muted-foreground">Cupo</dt>
                <dd className="text-right">{alumnos} / {c.vehiculosIds.length * 8}</dd>
              </dl>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((f) => (
                  <PhaseButton
                    key={f}
                    fase={f}
                    estado={f < c.faseActual ? "completado" : f === c.faseActual ? "activo" : "inactivo"}
                    onClick={() => {
                      setFase(c.id, f as 1 | 2 | 3 | 4);
                      toast.success(`Fase ${f} abierta para ${c.nombre}`);
                    }}
                  />
                ))}
              </div>

              <Link
                to="/cursos/$cursoId"
                params={{ cursoId: c.id }}
                className="mt-auto flex items-center justify-center gap-1.5 rounded-md border border-primary/40 py-2 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Users size={13} /> Ver estudiantes →
              </Link>
            </Panel>
          );
        })}
      </div>

      <CrearCursoModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
