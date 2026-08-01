import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui-kit/Modal";
import { DateField, FormSection, InputField, SelectField } from "./ui-kit/Fields";
import { useApp } from "@/lib/store";
import type { TipoLicencia } from "@/lib/types";

const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

export function CrearCursoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useApp((s) => s.config);
  const addCurso = useApp((s) => s.addCurso);

  const [f, setF] = useState({
    nombre: "",
    tipoLicencia: "B" as TipoLicencia,
    inicioMatriculas: "",
    finMatriculas: "",
    inicioCurso: "",
    finCurso: "",
    horarioTeoria: "",
    horarioPractica: "",
    horarioPsicologia: "Sábado 08H00-12H00",
    instructorTeoricoId: "",
    vehiculosIds: [] as string[],
    oficioInicial: config.secuenciales.oficios,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const crear = () => {
    const e: Record<string, string> = {};
    if (!f.nombre.trim()) e["nombre"] = "Requerido";
    if (!f.inicioCurso) e["inicioCurso"] = "Requerido";
    if (f.vehiculosIds.length === 0) e["vehiculos"] = "Seleccione al menos un vehículo";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    addCurso({ ...f, faseActual: 1, estado: "Matrículas" });
    toast.success(`Curso creado · cupo máximo ${f.vehiculosIds.length * 8} alumnos`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear Curso"
      subtitle="Máximo 8 alumnos por vehículo asignado"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-[12px] hover:bg-accent">
            Cancelar
          </button>
          <button onClick={crear} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
            Crear Curso
          </button>
        </>
      }
    >
      <FormSection title="Información general">
        <InputField label="Nombre del curso" required colSpan={2} value={f.nombre} error={errors["nombre"] ?? ""} onChange={(e) => set("nombre", e.target.value)} />
        <SelectField label="Tipo de Licencia" required value={f.tipoLicencia} onChange={(v) => set("tipoLicencia", v as TipoLicencia)} options={opts(["B", "C", "D", "E", "F"])} />
        <DateField label="Inicio Matrículas" value={f.inicioMatriculas} onChange={(v) => set("inicioMatriculas", v)} />
        <DateField label="Fin Matrículas" value={f.finMatriculas} onChange={(v) => set("finMatriculas", v)} />
        <DateField label="Inicio Curso" required value={f.inicioCurso} onChange={(v) => set("inicioCurso", v)} />
        <DateField label="Fin Curso" value={f.finCurso} onChange={(v) => set("finCurso", v)} />
      </FormSection>

      <FormSection title="Horarios e instructor">
        <InputField label="Horario Teoría" colSpan={2} placeholder="Lunes a Viernes 18H00-20H00" value={f.horarioTeoria} onChange={(e) => set("horarioTeoria", e.target.value)} />
        <InputField label="Rango Práctica" placeholder="14H00-16H00" value={f.horarioPractica} onChange={(e) => set("horarioPractica", e.target.value)} />
        <InputField label="Psicología y P. Auxilios" colSpan={2} value={f.horarioPsicologia} onChange={(e) => set("horarioPsicologia", e.target.value)} />
        <SelectField
          label="Instructor Teórico"
          value={f.instructorTeoricoId}
          onChange={(v) => set("instructorTeoricoId", v)}
          options={config.instructores.filter((i) => i.tipo === "Teórico").map((i) => ({ value: i.id, label: i.nombre }))}
        />
      </FormSection>

      <FormSection title="Vehículos y secuencial">
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
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[12px] transition-colors ${checked ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}
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
        <InputField label="N° inicial de Oficio" type="number" value={f.oficioInicial} onChange={(e) => set("oficioInicial", Number(e.target.value))} />
      </FormSection>
    </Modal>
  );
}
