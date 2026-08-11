import { useState, useEffect } from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DateField, FormSection, InputField, SelectField } from "./ui-kit/Fields";
import { Panel } from "./ui-kit/Primitives";
import { useApp } from "@/lib/store";
import type { Curso, TipoLicencia } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";

const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

const DEFAULT_PRACTICAL_SCHEDULES = [
  "06H00-08H00",
  "08H00-10H00",
  "10H00-12H00",
  "12H00-14H00",
  "14H00-16H00",
  "16H00-18H00",
  "18H00-20H00",
  "20H00-22H00",
];

const parseScheduleList = (str?: string, defaultArr: string[] = []) => {
  if (!str || !str.trim()) return defaultArr;
  const parts = str.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : defaultArr;
};

export function ConfigCursoView({ curso }: { curso: Curso }) {
  const config = useApp((s) => s.config);
  const updateCurso = useApp((s) => s.updateCurso);

  const [horarioTeoriaList, setHorarioTeoriaList] = useState<string[]>(() =>
    parseScheduleList(curso.horarioTeoria, ["08H00-10H00", "20H00-22H00"])
  );
  const [horarioPracticaList, setHorarioPracticaList] = useState<string[]>(() =>
    parseScheduleList(curso.horarioPractica, DEFAULT_PRACTICAL_SCHEDULES)
  );

  const [f, setF] = useState({
    nombre: curso.nombre || "",
    tipoLicencia: (curso.tipoLicencia || "B") as TipoLicencia,
    inicioMatriculas: curso.inicioMatriculas || "",
    finMatriculas: curso.finMatriculas || "",
    inicioCurso: curso.inicioCurso || "",
    finCurso: curso.finCurso || "",
    horarioPsicologia: curso.horarioPsicologia || "Sábado 08H00-12H00",
    vehiculosIds: curso.vehiculosIds || [],
    customDocsRoot: curso.customDocsRoot || config.customDocsRoot || "",
  });

  useEffect(() => {
    setF({
      nombre: curso.nombre || "",
      tipoLicencia: (curso.tipoLicencia || "B") as TipoLicencia,
      inicioMatriculas: curso.inicioMatriculas || "",
      finMatriculas: curso.finMatriculas || "",
      inicioCurso: curso.inicioCurso || "",
      finCurso: curso.finCurso || "",
      horarioPsicologia: curso.horarioPsicologia || "Sábado 08H00-12H00",
      vehiculosIds: curso.vehiculosIds || [],
      customDocsRoot: curso.customDocsRoot || config.customDocsRoot || "",
    });
    setHorarioTeoriaList(parseScheduleList(curso.horarioTeoria, ["08H00-10H00", "20H00-22H00"]));
    setHorarioPracticaList(parseScheduleList(curso.horarioPractica, DEFAULT_PRACTICAL_SCHEDULES));
  }, [curso]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const guardar = () => {
    const e: Record<string, string> = {};
    if (!f.nombre.trim()) e["nombre"] = "Requerido";
    if (!f.inicioCurso) e["inicioCurso"] = "Requerido";
    if (f.vehiculosIds.length === 0) e["vehiculos"] = "Seleccione al menos un vehículo";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    if (f.customDocsRoot && typeof window !== "undefined") {
      (window as any).__LAST_CUSTOM_DOCS_ROOT__ = f.customDocsRoot;
    }

    const finalTeoria = horarioTeoriaList.map((s) => s.trim()).filter(Boolean).join(" | ");
    const finalPractica = horarioPracticaList.map((s) => s.trim()).filter(Boolean).join(" | ");

    updateCurso(curso.id, {
      ...f,
      horarioTeoria: finalTeoria || "Lunes a Viernes 18H00-20H00",
      horarioPractica: finalPractica || "14H00-16H00",
    });
    toast.success("Configuración del curso guardada exitosamente");
  };

  return (
    <Panel className="max-w-3xl space-y-5">
      <FormSection title="INFORMACIÓN GENERAL">
        <InputField
          label="Nombre del curso"
          required
          colSpan={2}
          value={f.nombre}
          error={errors["nombre"] ?? ""}
          onChange={(e) => set("nombre", e.target.value)}
        />
        <SelectField
          label="Tipo de Licencia"
          required
          value={f.tipoLicencia}
          onChange={(v) => set("tipoLicencia", v as TipoLicencia)}
          options={opts(["A", "A1", "B", "C", "C1", "D", "E", "F", "G"])}
        />
        <DateField label="Inicio Matrículas" value={f.inicioMatriculas} onChange={(v) => set("inicioMatriculas", v)} />
        <DateField label="Fin Matrículas" value={f.finMatriculas} onChange={(v) => set("finMatriculas", v)} />
        <DateField label="Inicio Curso" required value={f.inicioCurso} onChange={(v) => set("inicioCurso", v)} />
        <DateField label="Fin Curso" value={f.finCurso} onChange={(v) => set("finCurso", v)} />
      </FormSection>

      <FormSection title="HORARIOS DE CLASES">
        {/* Horarios de Teoría */}
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Horario(s) de Teoría
            </span>
            <button
              type="button"
              onClick={() => setHorarioTeoriaList((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Agregar horario de teoría
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {horarioTeoriaList.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ej. Lunes a Viernes 18H00-20H00 o Sábados 08H00-12H00"
                  value={t}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHorarioTeoriaList((prev) => prev.map((item, i) => (i === idx ? val : item)));
                  }}
                  className="flex-1 rounded-md border bg-background px-3 py-1.5 text-[12px] shadow-sm focus:border-primary focus:outline-none"
                />
                {horarioTeoriaList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setHorarioTeoriaList((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Eliminar este horario de teoría"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rangos de Práctica Predefinidos */}
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Rangos de Práctica (Predefinidos)
            </span>
            <button
              type="button"
              onClick={() => setHorarioPracticaList((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <Plus size={13} /> Agregar rango práctico
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {horarioPracticaList.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-[12px] shadow-sm">
                <input
                  type="text"
                  placeholder="08H00-10H00"
                  value={p}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHorarioPracticaList((prev) => prev.map((item, i) => (i === idx ? val : item)));
                  }}
                  className="flex-1 bg-transparent py-0.5 text-[12px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setHorarioPracticaList((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Eliminar este rango práctico"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <InputField label="Psicología y P. Auxilios" colSpan={3} value={f.horarioPsicologia} onChange={(e) => set("horarioPsicologia", e.target.value)} />
      </FormSection>

      <FormSection title="VEHÍCULOS ASIGNADOS">
        <div className="col-span-3">
          <span className="mb-2 block text-[11px] font-medium text-muted-foreground">
            Vehículos asignados <span className="text-destructive">*</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            {config.vehiculos.map((v) => {
              const checked = f.vehiculosIds.includes(v.id);
              return (
                <label
                  key={v.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[12px] transition-colors",
                    checked ? "border-primary bg-primary/10" : "hover:border-primary/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      set("vehiculosIds", checked ? f.vehiculosIds.filter((x) => x !== v.id) : [...f.vehiculosIds, v.id])
                    }
                  />
                  N° {v.numero} · {v.placas} · {v.modelo}
                </label>
              );
            })}
          </div>
          {errors["vehiculos"] && <span className="mt-1 block text-[11px] text-destructive">{errors["vehiculos"]}</span>}
        </div>
      </FormSection>

      <FormSection title="UBICACIÓN DE DOCUMENTOS">
        <div className="col-span-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Elegir Carpeta para guardar documentos
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Predeterminado del sistema (Documentos/ZentriumphDriveOfice)"
              value={f.customDocsRoot}
              onChange={(e) => set("customDocsRoot", e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-[12px] shadow-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                const folder = await LocalFileStorage.getInstance().selectDirectory();
                if (folder) {
                  set("customDocsRoot", folder);
                  if (typeof window !== "undefined") {
                    (window as any).__LAST_CUSTOM_DOCS_ROOT__ = folder;
                  }
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary/20 transition-all shrink-0"
            >
              <FolderOpen size={14} /> Examinar...
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Si ya eliges una carpeta, se mantendrá predeterminada para todos los siguientes cursos que vayas creando.
          </p>
        </div>
      </FormSection>

      <button
        onClick={guardar}
        className="rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Guardar cambios
      </button>
    </Panel>
  );
}
