import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui-kit/Modal";
import { DateField, FileUpload, FormSection, InputField, SelectField, TextAreaField } from "./ui-kit/Fields";
import { useApp } from "@/lib/store";
import { NACIONALIDADES, NIVELES, TIPOS_SANGRE, type Curso, type FormaPago } from "@/lib/types";

const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

export function InscripcionModal({
  open,
  onClose,
  curso,
}: {
  open: boolean;
  onClose: () => void;
  curso: Curso;
}) {
  const config = useApp((s) => s.config);
  const addEstudiante = useApp((s) => s.addEstudiante);

  const [f, setF] = useState({
    nombres: "",
    cedula: "",
    nacionalidad: "Ecuatoriana",
    tipoSangre: "",
    sexo: "",
    fechaNacimiento: "",
    direccion: "",
    celular: "",
    correo: "",
    horarioPractica: curso.horarioPractica,
    vehiculoId: curso.vehiculosIds[0] ?? "",
    instructorPracticoId: "",
    concepto: `Curso Tipo ${curso.tipoLicencia}`,
    valorTotal: config.precios[curso.tipoLicencia] ?? 0,
    abono: 0,
    formaPago: "Efectivo" as FormaPago,
    comprobante: "",
    comprobanteImg: "",
    fotoUrl: "",
    nivelInstruccion: "",
    observaciones: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const edad = useMemo(() => {
    if (!f.fechaNacimiento) return 0;
    const d = new Date(f.fechaNacimiento);
    const diff = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diff / 31557600000));
  }, [f.fechaNacimiento]);

  const rh = f.tipoSangre ? (f.tipoSangre.endsWith("+") ? "Positivo" : "Negativo") : "";
  const saldo = Number(f.valorTotal) - Number(f.abono);

  const guardar = (imprimir: boolean) => {
    const e: Record<string, string> = {};
    if (!f.nombres.trim()) e["nombres"] = "Requerido";
    if (!/^\d{10}$/.test(f.cedula)) e["cedula"] = "Cédula de 10 dígitos";
    if (!f.tipoSangre) e["tipoSangre"] = "Requerido";
    if (!f.fechaNacimiento) e["fechaNacimiento"] = "Requerido";
    if (!f.celular.trim()) e["celular"] = "Requerido";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Revise los campos obligatorios");
      return;
    }
    addEstudiante({
      cursoId: curso.id,
      nombres: f.nombres,
      cedula: f.cedula,
      nacionalidad: f.nacionalidad,
      tipoSangre: f.tipoSangre,
      rh,
      sexo: f.sexo,
      fechaNacimiento: f.fechaNacimiento,
      edad,
      direccion: f.direccion,
      canton: config.escuela.canton,
      celular: f.celular,
      correo: f.correo.toLowerCase(),
      horarioPractica: f.horarioPractica,
      vehiculoId: f.vehiculoId,
      instructorPracticoId: f.instructorPracticoId,
      concepto: f.concepto,
      valorTotal: Number(f.valorTotal),
      abono: Number(f.abono),
      saldo,
      formaPago: f.formaPago,
      comprobante: f.comprobante,
      fotoUrl: f.fotoUrl,
      nivelInstruccion: f.nivelInstruccion,
      observaciones: f.observaciones,
      estado: "Activo",
    });
    toast.success(imprimir ? "Alumno inscrito · recibo enviado a impresión" : "Alumno inscrito correctamente");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inscribir Alumno"
      subtitle={`${curso.nombre} · Licencia tipo ${curso.tipoLicencia}`}
      footer={
        <>
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-[12px] hover:bg-accent">
            Cancelar
          </button>
          <button
            onClick={() => guardar(false)}
            className="rounded-md border border-primary px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10"
          >
            Guardar
          </button>
          <button
            onClick={() => guardar(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
          >
            Guardar e Imprimir Recibo
          </button>
        </>
      }
    >
      <FormSection title="Datos Personales">
        <InputField label="Nombres completos" required colSpan={2} value={f.nombres} error={errors["nombres"] ?? ""} onChange={(e) => set("nombres", e.target.value)} />
        <InputField label="Cédula" required value={f.cedula} error={errors["cedula"] ?? ""} onChange={(e) => set("cedula", e.target.value.replace(/\D/g, "").slice(0, 10))} />
        <SelectField label="Nacionalidad" allowOther value={f.nacionalidad} onChange={(v) => set("nacionalidad", v)} options={opts(NACIONALIDADES)} />
        <SelectField label="Tipo de Sangre" required error={errors["tipoSangre"] ?? ""} value={f.tipoSangre} onChange={(v) => set("tipoSangre", v)} options={opts(TIPOS_SANGRE)} />
        <InputField label="Factor RH (auto)" value={rh} readOnly />
        <SelectField label="Sexo" value={f.sexo} onChange={(v) => set("sexo", v)} options={opts(["Masculino", "Femenino"])} />
        <DateField label="Fecha de Nacimiento" required value={f.fechaNacimiento} onChange={(v) => set("fechaNacimiento", v)} />
        <InputField label="Edad (auto)" value={edad || ""} readOnly />
        <InputField label="Dirección" colSpan={2} value={f.direccion} onChange={(e) => set("direccion", e.target.value)} />
        <InputField label="Cantón (auto)" value={config.escuela.canton} readOnly />
        <InputField label="Celular" required value={f.celular} error={errors["celular"] ?? ""} onChange={(e) => set("celular", e.target.value)} />
        <InputField label="Correo" type="email" value={f.correo} onChange={(e) => set("correo", e.target.value.toLowerCase())} />
        <SelectField label="Nivel de Instrucción" allowOther value={f.nivelInstruccion} onChange={(v) => set("nivelInstruccion", v)} options={opts(NIVELES)} />
      </FormSection>

      <FormSection title="Datos del Curso">
        <InputField label="Curso" value={curso.nombre} readOnly />
        <InputField label="Tipo de licencia" value={curso.tipoLicencia} readOnly />
        <InputField label="Fechas" value={`${curso.inicioCurso} → ${curso.finCurso}`} readOnly />
        <InputField label="Horario teoría" value={curso.horarioTeoria} readOnly />
        <InputField label="Horario práctica" value={f.horarioPractica} onChange={(e) => set("horarioPractica", e.target.value)} placeholder="14H00-16H00" />
        <SelectField
          label="Vehículo"
          value={f.vehiculoId}
          onChange={(v) => set("vehiculoId", v)}
          options={config.vehiculos
            .filter((v) => curso.vehiculosIds.includes(v.id))
            .map((v) => ({ value: v.id, label: `N° ${v.numero} · ${v.placas} · ${v.modelo}` }))}
        />
        <SelectField
          label="Instructor práctico"
          value={f.instructorPracticoId}
          onChange={(v) => set("instructorPracticoId", v)}
          options={config.instructores.filter((i) => i.tipo === "Práctico").map((i) => ({ value: i.id, label: i.nombre }))}
        />
      </FormSection>

      <FormSection title="Pago">
        <SelectField
          label="Concepto"
          value={f.concepto}
          onChange={(v) => set("concepto", v)}
          options={opts(["Curso Tipo B", "Curso Tipo C", "Curso Tipo D", "Curso Tipo E", "Curso Tipo F", "Examen Psicosensométrico"])}
        />
        <InputField label="Valor Total" type="number" value={f.valorTotal} onChange={(e) => set("valorTotal", Number(e.target.value))} />
        <InputField label="Abono" type="number" value={f.abono} onChange={(e) => set("abono", Number(e.target.value))} />
        <InputField label="Saldo (auto)" value={saldo.toFixed(2)} readOnly />
        <SelectField label="Forma de Pago" value={f.formaPago} onChange={(v) => set("formaPago", v as FormaPago)} options={opts(["Efectivo", "Transferencia", "Tarjeta"])} />
        {f.formaPago !== "Efectivo" && (
          <>
            <InputField label="N° Comprobante" value={f.comprobante} onChange={(e) => set("comprobante", e.target.value)} />
            <div className="col-span-3">
              <FileUpload label="Imagen del comprobante" aspect="wide" value={f.comprobanteImg} onChange={(v) => set("comprobanteImg", v)} />
            </div>
          </>
        )}
      </FormSection>

      <FormSection title="Foto y Observaciones">
        <div className="col-span-2">
          <FileUpload label="Foto 3x4" value={f.fotoUrl} onChange={(v) => set("fotoUrl", v)} />
        </div>
        <TextAreaField label="Observaciones" colSpan={3} value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
      </FormSection>
    </Modal>
  );
}
