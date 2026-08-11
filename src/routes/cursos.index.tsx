import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Badge, Panel, PhaseButton } from "@/components/ui-kit/Primitives";
import { CrearCursoModal } from "@/components/CrearCursoModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { Curso } from "@/lib/types";

export default function CursosPage() {
  const { cursos, estudiantes, setFase, deleteCurso } = useApp();
  const [open, setOpen] = useState(false);
  const [cursoAEliminar, setCursoAEliminar] = useState<Curso | null>(null);

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
                <div className="flex items-center gap-2">
                  <Badge tone={c.estado === "En curso" ? "success" : c.estado === "Matrículas" ? "warning" : "muted"}>{c.estado}</Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCursoAEliminar(c);
                    }}
                    title="Eliminar curso"
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
                to={`/cursos/${c.id}`}
                className="btn-3d-secondary mt-auto flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-semibold"
              >
                <Users size={13} /> Ver estudiantes →
              </Link>
            </Panel>
          );
        })}
      </div>

      <CrearCursoModal open={open} onClose={() => setOpen(false)} />

      <ConfirmModal
        open={!!cursoAEliminar}
        title="¿Estás seguro que deseas eliminar este curso?"
        itemName={cursoAEliminar?.nombre}
        description={`Se eliminará el curso "${cursoAEliminar?.nombre}" y todos sus alumnos inscritos. Esta acción no afectará a los documentos ya guardados en disco.`}
        confirmText="Sí, Eliminar Curso"
        cancelText="Cancelar"
        onConfirm={() => {
          if (cursoAEliminar) {
            deleteCurso(cursoAEliminar.id);
            toast.success(`Curso "${cursoAEliminar.nombre}" eliminado exitosamente.`);
            setCursoAEliminar(null);
          }
        }}
        onClose={() => setCursoAEliminar(null)}
      />
    </div>
  );
}
