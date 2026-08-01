import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Drive Academy" },
      { name: "description", content: "Datos de la escuela, firmas, instructores, vehículos, precios, secuenciales y tema." },
      { property: "og:title", content: "Configuración — Drive Academy" },
      { property: "og:description", content: "Parametrice su escuela de conducción y la documentación generada." },
    ],
  }),
  component: ConfiguracionPage,
});

type Seccion =
  | "Datos Escuela"
  | "Firmas"
  | "Instructores"
  | "Vehículos"
  | "Precios"
  | "Secuenciales"
  | "Logo en Documentos"
  | "Tema y Colores";

const CARDS: { id: Seccion; icon: typeof Building2; desc: string }[] = [
  { id: "Datos Escuela", icon: Building2, desc: "Nombre, RUC, dirección y logo" },
  { id: "Firmas", icon: PenLine, desc: "Responsables de los documentos" },
  { id: "Instructores", icon: Users, desc: "Teóricos y prácticos" },
  { id: "Vehículos", icon: Car, desc: "Flota de práctica" },
  { id: "Precios", icon: DollarSign, desc: "Valores por tipo de licencia" },
  { id: "Secuenciales", icon: Hash, desc: "Recibos, actas y oficios" },
  { id: "Logo en Documentos", icon: ImageIcon, desc: "Dónde imprimir el logo" },
  { id: "Tema y Colores", icon: Palette, desc: "Modo y paleta del sistema" },
];

export default function noop() {}

function ConfiguracionPage() {
  const config = useApp((s) => s.config);
  const updateConfig = useApp((s) => s.updateConfig);
  const [abierta, setAbierta] = useState<Seccion | null>(null);

  const guardar = () => {
    toast.success("Configuración guardada");
    setAbierta(null);
  };

  const instructorCols: Column<Instructor>[] = [
    { key: "nombre", header: "Nombre" },
    { key: "cedula", header: "Cédula" },
    { key: "tipo", header: "Tipo" },
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
        size={abierta === "Instructores" || abierta === "Vehículos" ? "md" : "lg"}
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

        {abierta === "Firmas" && (
          <FormSection title="Responsables">
            {(
              [
                ["director", "Director"],
                ["secretaria", "Secretaria"],
                ["directorAnt", "Director ANT"],
                ["representante", "Representante Legal"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="col-span-3 grid grid-cols-2 gap-4">
                <InputField
                  label={`${label} — Nombre`}
                  value={config.firmas[k].nombre}
                  onChange={(e) => updateConfig({ firmas: { ...config.firmas, [k]: { ...config.firmas[k], nombre: e.target.value } } })}
                />
                <InputField
                  label={`${label} — Cargo`}
                  value={config.firmas[k].cargo}
                  onChange={(e) => updateConfig({ firmas: { ...config.firmas, [k]: { ...config.firmas[k], cargo: e.target.value } } })}
                />
              </div>
            ))}
          </FormSection>
        )}

        {abierta === "Instructores" && (
          <CrudInstructores cols={instructorCols} />
        )}

        {abierta === "Vehículos" && <CrudVehiculos cols={vehiculoCols} />}

        {abierta === "Precios" && (
          <FormSection title="Valores en USD">
            {Object.entries(config.precios).map(([k, v]) => (
              <InputField
                key={k}
                label={k === "Psicosensometrico" ? "Psicosensométrico" : `Licencia tipo ${k}`}
                type="number"
                value={v}
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

        {abierta === "Logo en Documentos" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(config.logoDocs).map(([k, v]) => (
                <label
                  key={k}
                  className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[12px] capitalize", v && "border-primary bg-primary/10")}
                >
                  <input
                    type="checkbox"
                    checked={v}
                    onChange={() => updateConfig({ logoDocs: { ...config.logoDocs, [k]: !v } })}
                  />
                  {k}
                </label>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <input type="checkbox" checked={config.watermark} onChange={() => updateConfig({ watermark: !config.watermark })} />
              Usar logo como marca de agua
            </label>
          </div>
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
  const [n, setN] = useState({ nombre: "", cedula: "", tipo: "Práctico", telefono: "" });

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
        <div className="col-span-2 flex items-end">
          <button
            onClick={() => {
              if (!n.nombre.trim()) return toast.error("Ingrese el nombre");
              updateConfig({
                instructores: [
                  ...config.instructores,
                  { ...n, tipo: n.tipo as Instructor["tipo"], id: crypto.randomUUID() },
                ],
              });
              setN({ nombre: "", cedula: "", tipo: "Práctico", telefono: "" });
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
  const [n, setN] = useState({ numero: "", placas: "", modelo: "" });

  return (
    <div className="space-y-4">
      <DataTable rows={config.vehiculos} columns={cols} pageSize={5} />
      <FormSection title="Agregar vehículo">
        <InputField label="Número" value={n.numero} onChange={(e) => setN({ ...n, numero: e.target.value })} />
        <InputField label="Placas" value={n.placas} onChange={(e) => setN({ ...n, placas: e.target.value.toUpperCase() })} />
        <InputField label="Modelo" value={n.modelo} onChange={(e) => setN({ ...n, modelo: e.target.value })} />
        <div className="col-span-3">
          <button
            onClick={() => {
              if (!n.placas.trim()) return toast.error("Ingrese las placas");
              updateConfig({ vehiculos: [...config.vehiculos, { ...n, id: crypto.randomUUID() }] });
              setN({ numero: "", placas: "", modelo: "" });
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
