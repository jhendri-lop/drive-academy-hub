import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui-kit/Modal";
import { ComboboxSelectField, DateField, FileUpload, FormSection, InputField, SelectField, TextAreaField } from "./ui-kit/Fields";
import { useApp } from "@/lib/store";
import { NACIONALIDADES, NIVELES, TIPOS_SANGRE, type Curso, type Estudiante, type FormaPago } from "@/lib/types";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";

const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

const HORARIOS_2H = [
  "06H00-08H00",
  "08H00-10H00",
  "10H00-12H00",
  "12H00-14H00",
  "14H00-16H00",
  "16H00-18H00",
  "18H00-20H00",
  "20H00-22H00",
];

const cleanTime = (val?: string) => (val || "").replace(/^lunes\s+a\s+viernes\s*/i, "").trim();

const getMatriculaOptions = (finMatriculasStr?: string): { value: string; label: string; isDefault: boolean }[] => {
  let baseDate: Date;
  if (!finMatriculasStr) {
    baseDate = new Date();
  } else {
    const str = String(finMatriculasStr).trim();
    if (str.includes("-")) {
      const parts = str.split("-").map(Number);
      baseDate = new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
    } else if (str.includes("/")) {
      const parts = str.split("/").map(Number);
      baseDate = new Date(parts[2] || 2026, (parts[1] || 1) - 1, parts[0] || 1);
    } else {
      baseDate = new Date();
    }
  }

  const options: { value: string; label: string; isDefault: boolean }[] = [];

  for (let i = 0; i <= 4; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const valISO = `${y}-${m}-${day}`;
    const formattedDMY = `${day}/${m}/${y}`;

    let suffix = "";
    if (i === 0) suffix = " (Fin de Matrículas)";
    else if (i === 1) suffix = " (1 día antes - Defecto)";
    else suffix = ` (${i} días antes)`;

    options.push({
      value: valISO,
      label: `${formattedDMY}${suffix}`,
      isDefault: i === 1,
    });
  }

  return options;
};

export function InscripcionModal({
  open,
  onClose,
  curso,
  estudianteAEditar,
}: {
  open: boolean;
  onClose: () => void;
  curso: Curso;
  estudianteAEditar?: Estudiante | null;
}) {
  const config = useApp((s) => s.config);
  const addEstudiante = useApp((s) => s.addEstudiante);
  const updateEstudiante = useApp((s) => s.updateEstudiante);

  const matriculaOptions = useMemo(() => getMatriculaOptions(curso.finMatriculas), [curso.finMatriculas]);
  const fechaDefaultMatricula = matriculaOptions.find((o) => o.isDefault)?.value || matriculaOptions[0]?.value || "";
  const hoyStr: string = new Date().toISOString().split("T")[0] || "2026-08-06";

  const theoryOptions = useMemo(() => {
    if (!curso?.horarioTeoria) return ["08H00-10H00", "20H00-22H00"];
    const parts = curso.horarioTeoria.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : ["08H00-10H00", "20H00-22H00"];
  }, [curso?.horarioTeoria]);

  const practicalOptions = useMemo(() => {
    if (!curso?.horarioPractica) return HORARIOS_2H;
    const parts = curso.horarioPractica.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : HORARIOS_2H;
  }, [curso?.horarioPractica]);

  const estudiantes = useApp((s) => s.estudiantes);

  const courseVehicles = useMemo(() => {
    if (curso.vehiculosIds && curso.vehiculosIds.length > 0) {
      return config.vehiculos.filter((v) => curso.vehiculosIds.includes(v.id));
    }
    return config.vehiculos;
  }, [config.vehiculos, curso.vehiculosIds]);

  const getInstructorForVehicle = useCallback(
    (vehId: string) => {
      if (!vehId) return "";
      const veh = config.vehiculos.find((v) => v.id === vehId);
      if (veh && veh.instructorId) {
        const found = config.instructores.find((i) => i.id === veh.instructorId);
        if (found) return found.id;
      }
      const vehIndex = config.vehiculos.findIndex((v) => v.id === vehId);
      if (vehIndex >= 0) {
        const practicals = config.instructores.filter((i) => i.tipo === "Práctico" || /prác/i.test(i.tipo || ""));
        const inst = practicals[vehIndex] || config.instructores[vehIndex] || config.instructores[0];
        return inst?.id || "";
      }
      return config.instructores[0]?.id || "";
    },
    [config.vehiculos, config.instructores]
  );

  const isVehiculoOccupiedInSlot = useCallback(
    (vId: string, schedule: string) => {
      if (!vId || !schedule) return false;
      return estudiantes.some(
        (e) =>
          e.cursoId === curso.id &&
          e.id !== estudianteAEditar?.id &&
          e.estado !== "Retirado" &&
          e.vehiculoId === vId &&
          e.horarioPractica === schedule
      );
    },
    [estudiantes, curso.id, estudianteAEditar?.id]
  );

  const initialVehId = useMemo(() => {
    const firstPractica = practicalOptions[0] || "14H00-16H00";
    const available = courseVehicles.find((v) => !isVehiculoOccupiedInSlot(v.id, firstPractica));
    return available?.id || curso.vehiculosIds[0] || config.vehiculos[0]?.id || "";
  }, [courseVehicles, practicalOptions, isVehiculoOccupiedInSlot, curso.vehiculosIds, config.vehiculos]);

  const [f, setF] = useState<{
    nombres: string;
    cedula: string;
    tipoDocumento: "Cédula" | "Pasaporte";
    nacionalidad: string;
    tipoSangre: string;
    sexo: string;
    fechaNacimiento: string;
    direccion: string;
    celular: string;
    correo: string;
    horarioTeoria: string;
    horarioPractica: string;
    vehiculoId: string;
    instructorPracticoId: string;
    concepto: string;
    valorTotal: number;
    abono: number;
    formaPago: FormaPago;
    comprobante: string;
    comprobanteImg: string;
    fotoUrl: string;
    nivelInstruccion: string;
    observaciones: string;
    lentes: string;
    fechaMatricula: string;
  }>({
    nombres: "",
    cedula: "",
    tipoDocumento: "Cédula",
    nacionalidad: "Ecuatoriana",
    tipoSangre: "O+",
    sexo: "Masculino",
    fechaNacimiento: "",
    direccion: "",
    celular: "",
    correo: "",
    horarioTeoria: theoryOptions[0] || "08H00-10H00",
    horarioPractica: practicalOptions[0] || "14H00-16H00",
    vehiculoId: initialVehId,
    instructorPracticoId: getInstructorForVehicle(initialVehId),
    concepto: `Curso Tipo ${curso.tipoLicencia}`,
    valorTotal: config.precios[curso.tipoLicencia] ?? 0,
    abono: 0,
    formaPago: "Efectivo" as FormaPago,
    comprobante: "",
    comprobanteImg: "",
    fotoUrl: "",
    nivelInstruccion: "",
    observaciones: "",
    lentes: "No",
    fechaMatricula: fechaDefaultMatricula,
  });

  useEffect(() => {
    if (estudianteAEditar) {
      const editVehId = estudianteAEditar.vehiculoId || initialVehId;
      const editInstId = estudianteAEditar.instructorPracticoId || getInstructorForVehicle(editVehId);
      setF({
        nombres: estudianteAEditar.nombres || "",
        cedula: estudianteAEditar.cedula || "",
        tipoDocumento: (estudianteAEditar.tipoDocumento as any) || "Cédula",
        nacionalidad: estudianteAEditar.nacionalidad || "Ecuatoriana",
        tipoSangre: estudianteAEditar.tipoSangre || "O+",
        sexo: estudianteAEditar.sexo || "Masculino",
        fechaNacimiento: estudianteAEditar.fechaNacimiento || "",
        direccion: estudianteAEditar.direccion || "",
        celular: estudianteAEditar.celular || "",
        correo: estudianteAEditar.correo || "",
        horarioTeoria: cleanTime(estudianteAEditar.horarioTeoria) || theoryOptions[0] || "08H00-10H00",
        horarioPractica: estudianteAEditar.horarioPractica || practicalOptions[0] || "14H00-16H00",
        vehiculoId: editVehId,
        instructorPracticoId: editInstId,
        concepto: estudianteAEditar.concepto || `Curso Tipo ${curso.tipoLicencia}`,
        valorTotal: estudianteAEditar.valorTotal ?? (config.precios[curso.tipoLicencia] || 150),
        abono: estudianteAEditar.abono ?? (estudianteAEditar.valorTotal || 150),
        formaPago: (estudianteAEditar.formaPago as FormaPago) || "Efectivo",
        comprobante: estudianteAEditar.comprobante || "",
        comprobanteImg: estudianteAEditar.comprobanteImg || "",
        fotoUrl: estudianteAEditar.fotoUrl || "",
        nivelInstruccion: estudianteAEditar.nivelInstruccion || "",
        observaciones: estudianteAEditar.observaciones || "",
        lentes: estudianteAEditar.lentes || "No",
        fechaMatricula: estudianteAEditar.fechaMatricula || fechaDefaultMatricula,
      });
    } else {
      setF({
        nombres: "",
        cedula: "",
        tipoDocumento: "Cédula",
        nacionalidad: "Ecuatoriana",
        tipoSangre: "O+",
        sexo: "Masculino",
        fechaNacimiento: "",
        direccion: "",
        celular: "",
        correo: "",
        horarioTeoria: theoryOptions[0] || "08H00-10H00",
        horarioPractica: practicalOptions[0] || "14H00-16H00",
        vehiculoId: initialVehId,
        instructorPracticoId: getInstructorForVehicle(initialVehId),
        concepto: `Curso Tipo ${curso.tipoLicencia}`,
        valorTotal: config.precios[curso.tipoLicencia] || 150,
        abono: config.precios[curso.tipoLicencia] || 150,
        formaPago: "Efectivo" as FormaPago,
        comprobante: "",
        comprobanteImg: "",
        fotoUrl: "",
        nivelInstruccion: "",
        observaciones: "",
        lentes: "No",
        fechaMatricula: fechaDefaultMatricula,
      });
    }
  }, [estudianteAEditar, open, curso, config, theoryOptions, practicalOptions, initialVehId, getInstructorForVehicle]);

  // Auto-saltar a vehículo disponible cuando el horario práctico cambia o se detecta ocupado
  useEffect(() => {
    if (!f.horarioPractica || courseVehicles.length === 0) return;
    const isOccupied = isVehiculoOccupiedInSlot(f.vehiculoId, f.horarioPractica);
    let targetVehId = f.vehiculoId;

    if (!targetVehId || isOccupied) {
      const avail = courseVehicles.find((v) => !isVehiculoOccupiedInSlot(v.id, f.horarioPractica));
      if (avail) {
        targetVehId = avail.id;
      }
    }

    const targetInstId = getInstructorForVehicle(targetVehId);

    setF((prev) => {
      if (prev.vehiculoId === targetVehId && prev.instructorPracticoId === targetInstId) return prev;
      return {
        ...prev,
        vehiculoId: targetVehId,
        instructorPracticoId: targetInstId,
      };
    });
  }, [f.horarioPractica, f.vehiculoId, courseVehicles, isVehiculoOccupiedInSlot, getInstructorForVehicle]);

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

  const guardar = async (imprimir: boolean) => {
    try {
      const e: Record<string, string> = {};
      if (!f.nombres.trim()) e["nombres"] = "Requerido";
      if (!f.cedula.trim()) e["cedula"] = "Requerido";
      if (!f.tipoSangre) e["tipoSangre"] = "Requerido";
      if (!f.fechaNacimiento) e["fechaNacimiento"] = "Requerido";
      if (!f.celular.trim()) e["celular"] = "Requerido";
      setErrors(e);
      if (Object.keys(e).length) {
        toast.error("Revise los campos obligatorios");
        return;
      }

      let est: Estudiante;

      if (estudianteAEditar) {
        updateEstudiante(estudianteAEditar.id, {
          nombres: f.nombres,
          cedula: f.cedula,
          tipoDocumento: f.tipoDocumento,
          nacionalidad: f.nacionalidad,
          tipoSangre: f.tipoSangre,
          rh,
          sexo: f.sexo,
          fechaNacimiento: f.fechaNacimiento,
          edad,
          direccion: f.direccion,
          celular: f.celular,
          correo: f.correo.toLowerCase(),
          horarioTeoria: f.horarioTeoria,
          horarioPractica: f.horarioPractica,
          vehiculoId: f.vehiculoId,
          instructorPracticoId: f.instructorPracticoId,
          concepto: f.concepto,
          valorTotal: Number(f.valorTotal),
          abono: Number(f.abono),
          saldo,
          formaPago: f.formaPago,
          comprobante: f.comprobante,
          comprobanteImg: f.comprobanteImg,
          fotoUrl: f.fotoUrl,
          nivelInstruccion: f.nivelInstruccion,
          observaciones: f.observaciones,
          lentes: f.lentes || "No",
          fechaMatricula: f.fechaMatricula,
        });
        est = {
          ...estudianteAEditar,
          ...f,
          lentes: f.lentes || "No",
          rh,
          edad,
          saldo,
          valorTotal: Number(f.valorTotal),
          abono: Number(f.abono),
          canton: config.escuela.canton || "Quito",
          estado: estudianteAEditar.estado || "Activo",
          reciboNumero: estudianteAEditar.reciboNumero || 1001,
          fecha: String(estudianteAEditar.fecha || new Date().toISOString().split("T")[0]),
        };
      } else {
        est = addEstudiante({
          cursoId: curso.id,
          nombres: f.nombres,
          cedula: f.cedula,
          tipoDocumento: f.tipoDocumento,
          nacionalidad: f.nacionalidad,
          tipoSangre: f.tipoSangre,
          rh,
          sexo: f.sexo,
          fechaNacimiento: f.fechaNacimiento,
          edad,
          direccion: f.direccion,
          canton: config.escuela.canton || "Quito",
          celular: f.celular,
          correo: f.correo.toLowerCase(),
          horarioTeoria: f.horarioTeoria,
          horarioPractica: f.horarioPractica,
          vehiculoId: f.vehiculoId,
          instructorPracticoId: f.instructorPracticoId,
          concepto: f.concepto,
          valorTotal: Number(f.valorTotal),
          abono: Number(f.abono),
          saldo,
          formaPago: f.formaPago,
          comprobante: f.comprobante,
          comprobanteImg: f.comprobanteImg,
          fotoUrl: f.fotoUrl,
          nivelInstruccion: f.nivelInstruccion,
          observaciones: f.observaciones,
          lentes: f.lentes || "No",
          fechaMatricula: f.fechaMatricula,
          estado: "Activo",
        });
      }

      if (imprimir) {
        try {
          const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(curso.nombre);
          const reciboPath = `${baseCourseFolder}/Recibos/Recibo_${est.reciboNumero || 1001}_${est.cedula}.pdf`;
          await PDFGenerator.getInstance().generateRecibo(
            {
              receiptNumber: est.reciboNumero || 1001,
              date: String(est.fecha || new Date().toISOString().split("T")[0]),
              studentName: est.nombres,
              cedula: est.cedula,
              concept: est.concepto,
              amount: est.abono,
              paymentMethod: est.formaPago,
              comprobanteImg: est.comprobanteImg,
              courseName: curso?.nombre ?? "—",
              schoolName: config.escuela.nombre,
              schoolRuc: config.escuela.ruc,
            },
            reciboPath
          );
          toast.success(`Recibo impreso en: ${reciboPath}`);
        } catch (pdfErr) {
          console.error("Error al generar recibo PDF:", pdfErr);
          toast.error("Error al generar el recibo PDF, pero los datos se guardaron.");
        }
      }

      toast.success(estudianteAEditar ? "Datos del alumno actualizados exitosamente" : "Alumno inscrito correctamente");
      onClose();
    } catch (err: any) {
      console.error("[InscripcionModal] Error al guardar estudiante:", err);
      toast.error(`Error al guardar: ${err?.message || "Intente nuevamente."}`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={estudianteAEditar ? `Editar Estudiante: ${estudianteAEditar.nombres}` : `Ficha de Inscripción — ${curso.nombre}`}
      footer={
        <div className="flex w-full justify-between gap-2">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-xs font-medium hover:border-primary hover:text-primary"
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => guardar(true)}
              className="rounded-md border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Guardar e Imprimir Recibo
            </button>
            <button
              onClick={() => guardar(false)}
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Guardar Estudiante
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <FormSection title="1. Datos Personales">
          <InputField
            label="Nombres y Apellidos completos"
            required
            value={f.nombres}
            onChange={(e) => set("nombres", e.target.value)}
            error={errors["nombres"]}
          />
          <SelectField
            label="Tipo de Documento"
            value={f.tipoDocumento}
            onChange={(v) => set("tipoDocumento", v as any)}
            options={opts(["Cédula", "Pasaporte"])}
          />
          <InputField
            label="Número de Cédula / Pasaporte"
            required
            value={f.cedula}
            onChange={(e) => set("cedula", e.target.value)}
            error={errors["cedula"]}
            maxLength={f.tipoDocumento === "Pasaporte" ? 20 : 10}
          />
          <SelectField
            label="Nacionalidad"
            value={f.nacionalidad}
            onChange={(v) => set("nacionalidad", v)}
            options={opts(NACIONALIDADES)}
          />
          <SelectField
            label="Tipo de Sangre"
            required
            value={f.tipoSangre}
            onChange={(v) => set("tipoSangre", v)}
            options={opts(TIPOS_SANGRE)}
            error={errors["tipoSangre"]}
          />
          <SelectField
            label="Sexo"
            value={f.sexo}
            onChange={(v) => set("sexo", v)}
            options={opts(["Masculino", "Femenino"])}
          />
          <DateField
            label="Fecha de Nacimiento"
            required
            value={f.fechaNacimiento}
            onChange={(v) => set("fechaNacimiento", v)}
            error={errors["fechaNacimiento"]}
          />
          <InputField label="Edad (calculada)" value={edad ? `${edad} años` : "—"} disabled readOnly />
          <SelectField
            label="Nivel de instrucción"
            value={f.nivelInstruccion}
            onChange={(v) => set("nivelInstruccion", v)}
            options={opts(NIVELES)}
          />
          <SelectField
            label="Lentes"
            value={f.lentes || "No"}
            onChange={(v) => set("lentes", v as any)}
            options={opts(["No", "Sí"])}
          />
        </FormSection>

        <FormSection title="2. Contacto y Ubicación">
          <InputField label="Dirección domiciliaria" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} colSpan={2} />
          <InputField label="Celular" required value={f.celular} onChange={(e) => set("celular", e.target.value)} error={errors["celular"]} />
          <InputField label="Correo electrónico" type="email" value={f.correo} onChange={(e) => set("correo", e.target.value)} />
        </FormSection>

        <FormSection title="3. Asignación del Curso">
          <SelectField
            label="Fecha de Matrícula"
            value={f.fechaMatricula}
            onChange={(v) => set("fechaMatricula", v)}
            options={matriculaOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
          <ComboboxSelectField
            label="Horario Teórico"
            value={f.horarioTeoria}
            onChange={(v) => set("horarioTeoria", v)}
            options={theoryOptions}
          />
          <ComboboxSelectField
            label="Horario Práctico"
            value={f.horarioPractica}
            onChange={(v) => set("horarioPractica", v)}
            options={practicalOptions}
          />
          <SelectField
            label="Vehículo Asignado"
            value={f.vehiculoId}
            onChange={(vId) => {
              const instId = getInstructorForVehicle(vId);
              setF((prev) => ({
                ...prev,
                vehiculoId: vId,
                instructorPracticoId: instId,
              }));
            }}
            options={courseVehicles.map((veh) => {
              const occupied = isVehiculoOccupiedInSlot(veh.id, f.horarioPractica);
              return {
                value: veh.id,
                label: `${veh.numero} — ${veh.placas} (${veh.modelo})${occupied ? " (Ocupado en este horario)" : ""}`,
                disabled: occupied,
              };
            })}
          />
          <SelectField
            label="Instructor Práctico"
            value={f.instructorPracticoId}
            onChange={(v) => set("instructorPracticoId", v)}
            options={config.instructores.map((i) => ({ value: i.id, label: i.nombre }))}
          />
        </FormSection>

        <FormSection title="4. Cobro y Pago en Caja">
          <InputField label="Concepto de Cobro" value={f.concepto} onChange={(e) => set("concepto", e.target.value)} colSpan={2} />
          <InputField
            label="Valor Total ($)"
            type="number"
            value={f.valorTotal}
            onChange={(e) => set("valorTotal", Number(e.target.value))}
          />
          <InputField label="Abono Inicial ($)" type="number" value={f.abono} onChange={(e) => set("abono", Number(e.target.value))} />
          <InputField label="Saldo Pendiente ($)" value={`$${saldo.toFixed(2)}`} disabled readOnly />
          <SelectField
            label="Forma de Pago"
            value={f.formaPago}
            onChange={(v) => set("formaPago", v as FormaPago)}
            options={opts(["Efectivo", "Transferencia", "Tarjeta"])}
          />
          {f.formaPago !== "Efectivo" && (
            <>
              <InputField label="N° Comprobante" value={f.comprobante} onChange={(e) => set("comprobante", e.target.value)} colSpan={2} />
              <div className="col-span-2">
                <FileUpload
                  label="Subir imagen del comprobante / váucher (9:16)"
                  value={f.comprobanteImg}
                  onChange={(dataUrl) => set("comprobanteImg", dataUrl)}
                  aspect="portrait"
                />
              </div>
            </>
          )}
          <FileUpload
            label="Subir foto del alumno (opcional)"
            value={f.fotoUrl}
            onChange={(dataUrl) => set("fotoUrl", dataUrl)}
          />
        </FormSection>

        <TextAreaField
          label="Observaciones adicionales"
          value={f.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          placeholder="Comentarios u observaciones médicas/administrativas"
        />
      </div>
    </Modal>
  );
}
