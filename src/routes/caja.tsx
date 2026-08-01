import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, CreditCard, FileDown, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { StatCard } from "@/components/ui-kit/Primitives";
import { DataTable, type Column } from "@/components/ui-kit/DataTable";
import { Modal } from "@/components/ui-kit/Modal";
import { FileUpload, FormSection, InputField, SelectField } from "@/components/ui-kit/Fields";
import type { FormaPago, Recibo } from "@/lib/types";

export const Route = createFileRoute("/caja")({
  head: () => ({
    meta: [
      { title: "Caja — Drive Academy" },
      { name: "description", content: "Recibos del día, cobros psicosensométricos y cierre de caja de la escuela." },
      { property: "og:title", content: "Caja — Drive Academy" },
      { property: "og:description", content: "Control diario de ingresos por efectivo, transferencia y tarjeta." },
    ],
  }),
  component: CajaPage,
});

function CajaPage() {
  const recibos = useApp((s) => s.recibos);
  const addRecibo = useApp((s) => s.addRecibo);
  const precioPsico = useApp((s) => s.config.precios["Psicosensometrico"] ?? 35);
  const [open, setOpen] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const delDia = recibos.filter((r) => r.fecha === hoy);
  const suma = (m: FormaPago) => delDia.filter((r) => r.metodo === m).reduce((a, r) => a + r.monto, 0);
  const total = delDia.reduce((a, r) => a + r.monto, 0);

  const [f, setF] = useState({
    estudiante: "",
    cedula: "",
    concepto: "Examen Psicosensométrico",
    monto: precioPsico,
    metodo: "Efectivo" as FormaPago,
    comprobante: "",
    comprobanteImg: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const columns: Column<Recibo>[] = [
    { key: "numero", header: "N° Recibo" },
    { key: "estudiante", header: "Estudiante" },
    { key: "concepto", header: "Concepto" },
    { key: "monto", header: "Monto", render: (r) => `$${r.monto.toFixed(2)}` },
    { key: "metodo", header: "Método" },
    { key: "curso", header: "Curso" },
  ];

  const cobrar = () => {
    if (!f.estudiante.trim() || !f.cedula.trim()) {
      toast.error("Nombre y cédula son obligatorios");
      return;
    }
    addRecibo({
      estudiante: f.estudiante,
      cedula: f.cedula,
      concepto: f.concepto,
      monto: Number(f.monto),
      metodo: f.metodo,
      curso: "—",
      comprobante: f.comprobante,
    });
    toast.success("Cobro registrado");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Caja</h1>
          <p className="text-[12px] text-muted-foreground">Movimientos del {hoy}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Cobrar Psicosensométrico
          </button>
          <button
            onClick={() => toast.success(`Cierre de caja generado · $${total.toFixed(2)}`)}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium hover:border-primary hover:text-primary"
          >
            <FileDown size={14} /> Cierre de Caja
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Banknote} label="Efectivo" value={`$${suma("Efectivo").toFixed(2)}`} />
        <StatCard icon={Landmark} label="Transferencia" value={`$${suma("Transferencia").toFixed(2)}`} />
        <StatCard icon={CreditCard} label="Tarjeta" value={`$${suma("Tarjeta").toFixed(2)}`} />
        <StatCard icon={Wallet} label="Total Hoy" value={`$${total.toFixed(2)}`} hint={`${delDia.length} recibos`} />
      </div>

      <DataTable rows={delDia} columns={columns} empty="Sin movimientos hoy" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cobrar Psicosensométrico"
        size="sm"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="rounded-md border px-3 py-1.5 text-[12px] hover:bg-accent">
              Cancelar
            </button>
            <button onClick={cobrar} className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
              Registrar cobro
            </button>
          </>
        }
      >
        <FormSection title="Datos del cobro">
          <InputField label="Nombre" required colSpan={3} value={f.estudiante} onChange={(e) => set("estudiante", e.target.value)} />
          <InputField label="Cédula" required colSpan={3} value={f.cedula} onChange={(e) => set("cedula", e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <SelectField
            label="Concepto"
            colSpan={3}
            value={f.concepto}
            onChange={(v) => set("concepto", v)}
            options={["Examen Psicosensométrico", "Duplicado de certificado", "Recuperación"].map((v) => ({ value: v, label: v }))}
          />
          <InputField label="Monto" type="number" colSpan={3} value={f.monto} onChange={(e) => set("monto", Number(e.target.value))} />
          <SelectField
            label="Forma de Pago"
            colSpan={3}
            value={f.metodo}
            onChange={(v) => set("metodo", v as FormaPago)}
            options={["Efectivo", "Transferencia", "Tarjeta"].map((v) => ({ value: v, label: v }))}
          />
          {f.metodo !== "Efectivo" && (
            <>
              <InputField label="N° Comprobante" colSpan={3} value={f.comprobante} onChange={(e) => set("comprobante", e.target.value)} />
              <div className="col-span-3">
                <FileUpload label="Imagen del comprobante" aspect="wide" value={f.comprobanteImg} onChange={(v) => set("comprobanteImg", v)} />
              </div>
            </>
          )}
        </FormSection>
      </Modal>
    </div>
  );
}
