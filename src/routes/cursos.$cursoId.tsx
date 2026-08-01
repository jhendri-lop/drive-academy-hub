import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText, Images, Printer, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Badge, Panel } from "@/components/ui-kit/Primitives";
import { DataTable, type Column } from "@/components/ui-kit/DataTable";
import { InscripcionModal } from "@/components/InscripcionModal";
import { InputField, SelectField } from "@/components/ui-kit/Fields";
import type { Estudiante } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cursos/$cursoId")({
  head: () => ({
    meta: [
      { title: "Detalle del curso — Drive Academy" },
      { name: "description", content: "Estudiantes, documentos y configuración de un curso de conducción." },
      { property: "og:title", content: "Detalle del curso — Drive Academy" },
      { property: "og:description", content: "Administre estudiantes, documentos y ajustes del curso." },
    ],
  }),
  component: CursoDetalle,
});

const TABS = ["Estudiantes", "Documentos", "Config Curso"] as const;

function CursoDetalle() {
  const { cursoId } = Route.useParams();
  const curso = useApp((s) => s.cursos.find((c) => c.id === cursoId));
  const estudiantes = useApp((s) => s.estudiantes.filter((e) => e.cursoId === cursoId));
  const config = useApp((s) => s.config);
  const setFase = useApp((s) => s.setFase);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Estudiantes");
  const [open, setOpen] = useState(false);

  if (!curso) throw notFound();

  const columns: Column<Estudiante>[] = [
    { key: "nombres", header: "Nombre" },
    { key: "cedula", header: "Cédula" },
    { key: "celular", header: "Celular" },
    { key: "saldo", header: "Saldo", render: (r) => `$${r.saldo.toFixed(2)}` },
    {
      key: "estado",
      header: "Estado",
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "muted"}>{r.estado}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      value: () => "",
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => toast.info(`Editar ${r.nombres}`)} className="text-[12px] font-medium text-primary hover:underline">
            Editar
          </button>
          <button
            onClick={() => toast.success(`Recibo N° ${r.reciboNumero} enviado a impresión`)}
            className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-primary"
          >
            <Printer size={12} /> Imprimir Recibo
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link to="/cursos" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> Volver a cursos
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{curso.nombre}</h1>
          <p className="text-[12px] text-muted-foreground">
            Licencia {curso.tipoLicencia} · Fase {curso.faseActual} · {estudiantes.length} de {curso.vehiculosIds.length * 8} cupos
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <UserPlus size={14} /> Inscribir Alumno
        </button>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Estudiantes" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => toast.success("Generando PDF de fotos 3x4…")}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium hover:border-primary hover:text-primary"
            >
              <Images size={14} /> Generar PDF Fotos 3x4
            </button>
            <button
              onClick={() => toast.success("Generando recibos en PDF…")}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium hover:border-primary hover:text-primary"
            >
              <FileText size={14} /> Generar Recibos PDF
            </button>
          </div>
          <DataTable rows={estudiantes} columns={columns} empty="Aún no hay alumnos inscritos" />
        </div>
      )}

      {tab === "Documentos" && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { fase: 1, docs: ["Oficio de apertura", "Ficha de matrícula", "Listado de alumnos"] },
            { fase: 2, docs: ["Acta de inicio", "Registro de asistencia teórica"] },
            { fase: 3, docs: ["Oficio de exámenes", "Acta de exámenes"] },
            { fase: 4, docs: ["Acta de graduación", "Certificados"] },
          ].map((g) => (
            <Panel key={g.fase} hover className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Fase {g.fase}</h3>
                <Badge tone={g.fase <= curso.faseActual ? "primary" : "muted"}>
                  {g.fase < curso.faseActual ? "Completada" : g.fase === curso.faseActual ? "Actual" : "Pendiente"}
                </Badge>
              </div>
              {g.docs.map((d) => (
                <button
                  key={d}
                  disabled={g.fase > curso.faseActual}
                  onClick={() => toast.success(`Generando: ${d}`)}
                  className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-[12px] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileText size={13} /> {d}
                </button>
              ))}
              {g.fase > curso.faseActual && (
                <button onClick={() => setFase(curso.id, g.fase as 1 | 2 | 3 | 4)} className="text-[11px] text-primary hover:underline">
                  Avanzar a esta fase
                </button>
              )}
            </Panel>
          ))}
        </div>
      )}

      {tab === "Config Curso" && (
        <Panel className="max-w-3xl space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <InputField label="Horario Teoría" defaultValue={curso.horarioTeoria} colSpan={2} />
            <InputField label="Rango Práctica" defaultValue={curso.horarioPractica} />
            <InputField label="Psicología y P. Auxilios" defaultValue={curso.horarioPsicologia} colSpan={2} />
            <SelectField
              label="Instructor Teórico"
              value={curso.instructorTeoricoId}
              onChange={() => undefined}
              options={config.instructores.map((i) => ({ value: i.id, label: i.nombre }))}
            />
          </div>
          <div>
            <span className="label-xs mb-2 block">Vehículos del curso</span>
            <div className="grid grid-cols-2 gap-2">
              {config.vehiculos.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]",
                    curso.vehiculosIds.includes(v.id) && "border-primary bg-primary/10",
                  )}
                >
                  <input type="checkbox" defaultChecked={curso.vehiculosIds.includes(v.id)} />
                  N° {v.numero} · {v.placas} · {v.modelo}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={() => toast.success("Configuración del curso guardada")}
            className="rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Guardar cambios
          </button>
        </Panel>
      )}

      <InscripcionModal open={open} onClose={() => setOpen(false)} curso={curso} />
    </div>
  );
}
