import { useState } from "react";
import {
  Building2,
  Car,
  DollarSign,
  Hash,
  Image as ImageIcon,
  Palette,
  PenLine,
  Users,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Panel } from "@/components/ui-kit/Primitives";
import { FileUpload, FormSection, InputField, SelectField } from "@/components/ui-kit/Fields";
import { DataTable, type Column } from "@/components/ui-kit/DataTable";
import { Modal } from "@/components/ui-kit/Modal";
import { ColorPicker, ThemeToggle } from "@/components/ui-kit/Theme";
import type { Instructor, Vehiculo } from "@/lib/types";
import { cn } from "@/lib/utils";

import { CustomFieldsView } from "@/components/CustomFieldsView";
import { TemplateCommandsView } from "@/components/TemplateCommandsView";
import { DirectivaConfig } from "@/components/DirectivaConfig";
import { Sliders } from "lucide-react";

import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";

type Seccion =
  | "Datos Escuela"
  | "Directiva"
  | "Instructores"
  | "Vehículos"
  | "Precios"
  | "Secuenciales"
  | "Campos Personalizados"
  | "Comandos y Etiquetas"
  | "Tema y Colores";

const CARDS: { id: Seccion; icon: typeof Building2; desc: string }[] = [
  { id: "Datos Escuela", icon: Building2, desc: "Nombre, RUC, dirección y logo" },
  { id: "Directiva", icon: PenLine, desc: "Directivos, autoridades y firmas" },
  { id: "Instructores", icon: Users, desc: "Teóricos y prácticos con asignación de materias" },
  { id: "Vehículos", icon: Car, desc: "Flota de práctica" },
  { id: "Precios", icon: DollarSign, desc: "Valores por tipo de licencia" },
  { id: "Secuenciales", icon: Hash, desc: "Recibos, actas y oficios" },
  { id: "Campos Personalizados", icon: Sliders, desc: "Atributos adicionales editables" },
  { id: "Comandos y Etiquetas", icon: Terminal, desc: "Copia rápida de marcadores Word y Excel" },
  { id: "Tema y Colores", icon: Palette, desc: "Modo y paleta del sistema" },
];

export default function ConfiguracionPage() {
  const config = useApp((s) => s.config);
  const updateConfig = useApp((s) => s.updateConfig);
  const [abierta, setAbierta] = useState<Seccion | null>(null);

  const guardar = async () => {
    toast.success("Configuración guardada");
    setAbierta(null);
  };

  const instructorCols: Column<Instructor>[] = [
    { key: "nombre", header: "Nombre" },
    { key: "cedula", header: "Cédula" },
    { key: "tipo", header: "Tipo" },
    {
      key: "materiaTeorica",
      header: "Materia / Clase",
      value: (r) => (r.tipo === "Teórico" ? r.materiaTeorica || "Educación Vial" : "-"),
    },
    { key: "telefono", header: "Teléfono" },
    {
      key: "acciones",
      header: "",
      value: () => "",
      render: (r) => (
        <button
          onClick={() => updateConfig({ instructores: config.instructores.filter((i) => i.id !== r.id) })}
          className="text-[12px] text-destructive hover:underline"
        >
          Eliminar
        </button>
      ),
    },
  ];

  const vehiculoCols: Column<Vehiculo>[] = [
    { key: "numero", header: "Número" },
    { key: "placas", header: "Placas" },
    { key: "modelo", header: "Modelo" },
    {
      key: "instructorId",
      header: "Profesor asignado",
      render: (r) => {
        const instructores = config.instructores || [];
        const practicos = instructores.filter((i) => i.tipo === "Práctico" || /prác/i.test(i.tipo || ""));
        const listaInst = practicos.length > 0 ? practicos : instructores;
        return (
          <select
            value={r.instructorId || ""}
            onChange={(e) => {
              const selectedInstId = e.target.value;
              const found = instructores.find((inst) => inst.id === selectedInstId);
              const updated = config.vehiculos.map((v) =>
                v.id === r.id
                  ? {
                      ...v,
                      instructorId: selectedInstId,
                      instructorNombre: found ? found.nombre : "",
                    }
                  : v
              );
              updateConfig({ vehiculos: updated });
            }}
            className="h-8 w-full min-w-[140px] rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Sin asignar --</option>
            {listaInst.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.nombre}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "acciones",
      header: "",
      value: () => "",
      render: (r) => (
        <button
          onClick={() => updateConfig({ vehiculos: config.vehiculos.filter((v) => v.id !== r.id) })}
          className="text-[12px] text-destructive hover:underline"
        >
          Eliminar
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-[12px] text-muted-foreground">Parámetros generales del sistema</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {CARDS.map(({ id, icon: Icon, desc }) => (
          <button key={id} onClick={() => setAbierta(id)} className="text-left">
            <Panel hover className="h-full">
              <span className="mb-3 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
                <Icon size={17} />
              </span>
              <h2 className="text-[13px] font-semibold">{id}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
            </Panel>
          </button>
        ))}
      </div>

      <Modal
        open={abierta !== null}
        onClose={() => setAbierta(null)}
        title={abierta ?? ""}
        size={abierta === "Instructores" ? "md" : "lg"}
        footer={
          <>
            <button onClick={() => setAbierta(null)} className="rounded-md border px-3 py-1.5 text-[12px] hover:bg-accent">
              Cerrar
            </button>
            <button onClick={guardar} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
              Guardar
            </button>
          </>
        }
      >
        {abierta === "Datos Escuela" && (
          <FormSection title="Información de la escuela">
            {(
              [
                ["nombre", "Nombre"],
                ["ruc", "RUC"],
                ["sucursal", "Sucursal"],
                ["direccion", "Dirección"],
                ["ciudad", "Ciudad"],
                ["canton", "Cantón"],
                ["telefono", "Teléfono"],
                ["correo", "Correo"],
                ["resolucion", "Resolución ANT"],
              ] as const
            ).map(([k, label]) => (
              <InputField
                key={k}
                label={label}
                value={config.escuela[k]}
                onChange={(e) => updateConfig({ escuela: { ...config.escuela, [k]: e.target.value } })}
              />
            ))}
            <div className="col-span-3">
              <FileUpload
                label="Logo de la escuela"
                aspect="wide"
                value={config.escuela.logoUrl}
                onChange={(v) => updateConfig({ escuela: { ...config.escuela, logoUrl: v } })}
              />
            </div>
          </FormSection>
        )}

        {abierta === "Directiva" && (
          <DirectivaConfig />
        )}

        {abierta === "Instructores" && (
          <CrudInstructores cols={instructorCols} />
        )}

        {abierta === "Vehículos" && <CrudVehiculos cols={vehiculoCols} />}

        {abierta === "Precios" && (
          <FormSection title="VALORES EN USD">
            {(["A", "A1", "B", "C", "C1", "D", "E", "F", "G", "Psicosensometrico"] as const).map((k) => (
              <InputField
                key={k}
                label={k === "Psicosensometrico" ? "Psicosensométrico" : `Licencia tipo ${k}`}
                type="number"
                value={config.precios[k] ?? (k === "A" ? 250 : k === "A1" ? 300 : k === "B" ? 420 : k === "C" ? 560 : k === "C1" ? 600 : k === "D" ? 680 : k === "E" ? 780 : k === "F" ? 500 : k === "G" ? 550 : 35)}
                onChange={(e) => updateConfig({ precios: { ...config.precios, [k]: Number(e.target.value) } })}
              />
            ))}
          </FormSection>
        )}

        {abierta === "Secuenciales" && (
          <FormSection title="Numeración inicial">
            {(["recibos", "actas", "oficios"] as const).map((k) => (
              <InputField
                key={k}
                label={k[0]!.toUpperCase() + k.slice(1)}
                type="number"
                value={config.secuenciales[k]}
                onChange={(e) => updateConfig({ secuenciales: { ...config.secuenciales, [k]: Number(e.target.value) } })}
              />
            ))}
          </FormSection>
        )}

        {abierta === "Campos Personalizados" && (
          <CustomFieldsView />
        )}

        {abierta === "Comandos y Etiquetas" && (
          <TemplateCommandsView />
        )}

        {abierta === "Tema y Colores" && (
          <div className="space-y-5">
            <div>
              <span className="label-xs mb-2 block">Modo</span>
              <ThemeToggle />
            </div>
            <div>
              <span className="label-xs mb-2 block">Paleta de color</span>
              <ColorPicker />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CrudInstructores({ cols }: { cols: Column<Instructor>[] }) {
  const config = useApp((s) => s.config);
  const updateConfig = useApp((s) => s.updateConfig);
  const [n, setN] = useState({
    nombre: "",
    cedula: "",
    tipo: "Teórico",
    materiaTeorica: "Educación Vial",
    telefono: "",
  });

  return (
    <div className="space-y-4">
      <DataTable rows={config.instructores} columns={cols} pageSize={5} />
      <FormSection title="Agregar instructor">
        <InputField label="Nombre" value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} />
        <InputField label="Cédula" value={n.cedula} onChange={(e) => setN({ ...n, cedula: e.target.value })} />
        <InputField label="Teléfono" value={n.telefono} onChange={(e) => setN({ ...n, telefono: e.target.value })} />
        <SelectField
          label="Tipo"
          value={n.tipo}
          onChange={(v) => setN({ ...n, tipo: v })}
          options={[
            { value: "Teórico", label: "Teórico" },
            { value: "Práctico", label: "Práctico" },
          ]}
        />
        {n.tipo === "Teórico" && (
          <SelectField
            label="Materia / Clase"
            value={n.materiaTeorica}
            onChange={(v) => setN({ ...n, materiaTeorica: v })}
            options={[
              { value: "Educación Vial", label: "Educación Vial" },
              { value: "Mecánica Básica", label: "Mecánica Básica" },
              { value: "Primeros Auxilios", label: "Primeros Auxilios" },
              { value: "Psicología", label: "Psicología" },
            ]}
          />
        )}
        <div className="col-span-2 flex items-end">
          <button
            onClick={() => {
              if (!n.nombre.trim()) {
                toast.error("Ingrese el nombre");
                return;
              }
              updateConfig({
                instructores: [
                  ...config.instructores,
                  {
                    ...n,
                    tipo: n.tipo as Instructor["tipo"],
                    materiaTeorica: n.tipo === "Teórico" ? n.materiaTeorica : undefined,
                    id: crypto.randomUUID(),
                  },
                ],
              });
              setN({ nombre: "", cedula: "", tipo: "Teórico", materiaTeorica: "Educación Vial", telefono: "" });
            }}
            className="h-9 rounded-md bg-primary px-3 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Agregar
          </button>
        </div>
      </FormSection>
    </div>
  );
}

function CrudVehiculos({ cols }: { cols: Column<Vehiculo>[] }) {
  const config = useApp((s) => s.config);
  const updateConfig = useApp((s) => s.updateConfig);
  const [n, setN] = useState({ numero: "", placas: "", modelo: "", instructorId: "" });

  const instructores = config.instructores || [];
  const practicos = instructores.filter((i) => i.tipo === "Práctico" || /prác/i.test(i.tipo || ""));
  const listaInst = practicos.length > 0 ? practicos : instructores;

  return (
    <div className="space-y-4">
      <DataTable rows={config.vehiculos} columns={cols} pageSize={5} />
      <FormSection title="Agregar vehículo">
        <InputField label="Número" value={n.numero} onChange={(e) => setN({ ...n, numero: e.target.value })} />
        <InputField label="Placas" value={n.placas} onChange={(e) => setN({ ...n, placas: e.target.value.toUpperCase() })} />
        <InputField label="Modelo" value={n.modelo} onChange={(e) => setN({ ...n, modelo: e.target.value })} />
        <SelectField
          label="Profesor asignado"
          value={n.instructorId}
          onChange={(e: any) => {
            const val = typeof e === "string" ? e : e?.target?.value || "";
            setN({ ...n, instructorId: val });
          }}
          options={[
            { label: "-- Sin asignar --", value: "" },
            ...listaInst.map((inst) => ({ label: inst.nombre, value: inst.id })),
          ]}
        />
        <div className="col-span-3">
          <button
            onClick={() => {
              if (!n.placas.trim()) {
                toast.error("Ingrese las placas");
                return;
              }
              const found = instructores.find((inst) => inst.id === n.instructorId);
              updateConfig({
                vehiculos: [
                  ...config.vehiculos,
                  {
                    ...n,
                    id: crypto.randomUUID(),
                    instructorNombre: found ? found.nombre : "",
                  },
                ],
              });
              setN({ numero: "", placas: "", modelo: "", instructorId: "" });
            }}
            className="h-9 rounded-md bg-primary px-3 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Agregar
          </button>
        </div>
      </FormSection>
    </div>
  );
}
