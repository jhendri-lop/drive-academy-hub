import { useState, useMemo } from "react";
import { Banknote, CreditCard, DollarSign, FileDown, Landmark, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel, StatCard } from "./ui-kit/Primitives";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import type { Recibo } from "@/lib/types";

interface Props {
  recibos: Recibo[];
}

export function CierreCajaReport({ recibos }: Props) {
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));

  const recibosDia = useMemo(() => {
    return recibos.filter((r) => r.fecha === fecha);
  }, [recibos, fecha]);

  const porConcepto = useMemo(() => {
    const map: Record<string, number> = {};
    recibosDia.forEach((r) => {
      const c = r.concepto || "Matrícula / Curso";
      map[c] = (map[c] || 0) + r.monto;
    });
    return map;
  }, [recibosDia]);

  const porMetodo = useMemo(() => {
    const map: Record<string, number> = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
    recibosDia.forEach((r) => {
      const m = r.metodo || "Efectivo";
      map[m] = (map[m] || 0) + r.monto;
    });
    return map;
  }, [recibosDia]);

  const totalDia = useMemo(() => {
    return recibosDia.reduce((sum, r) => sum + r.monto, 0);
  }, [recibosDia]);

  const generarReportePDF = async () => {
    try {
      const path = `Cierre_Caja_${fecha}.pdf`;
      await PDFGenerator.getInstance().generateRecibo(
        {
          receiptNumber: 9999,
          date: fecha,
          studentName: "Cierre Diario de Caja",
          cedula: "1791234567001",
          concept: `Total Ingresos del Día (${recibosDia.length} recibos)`,
          amount: totalDia,
          paymentMethod: `Efectivo: $${porMetodo.Efectivo?.toFixed(2)} | Transf: $${porMetodo.Transferencia?.toFixed(2)} | Tarjeta: $${porMetodo.Tarjeta?.toFixed(2)}`,
          courseName: "Consolidado Diario",
          schoolName: "Zentriumph-DriveOfice",
          schoolRuc: "1791234567001",
        },
        path
      );
      toast.success(`Reporte de Cierre de Caja generado: ${path}`);
    } catch (err: any) {
      toast.error(`Error al generar reporte de cierre: ${err.message}`);
    }
  };

  return (
    <Panel className="space-y-5">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Cierre de Caja Diario por Concepto</h3>
          <p className="text-xs text-muted-foreground">Resumen de ingresos filtrados por fecha y canal de cobro</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs">
            <Calendar size={13} className="text-muted-foreground" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-transparent text-xs outline-none"
            />
          </div>
          <button
            onClick={generarReportePDF}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <FileDown size={14} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total del Día" value={`$${totalDia.toFixed(2)}`} hint={`${recibosDia.length} transacciones`} />
        <StatCard icon={Banknote} label="Efectivo" value={`$${(porMetodo.Efectivo || 0).toFixed(2)}`} hint="Caja física" />
        <StatCard icon={Landmark} label="Transferencias" value={`$${(porMetodo.Transferencia || 0).toFixed(2)}`} hint="Banco" />
        <StatCard icon={CreditCard} label="Tarjetas" value={`$${(porMetodo.Tarjeta || 0).toFixed(2)}`} hint="Datafast / POS" />
      </div>

      <div className="grid grid-cols-2 gap-6 pt-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desglose por Concepto</h4>
          <div className="divide-y rounded-md border bg-background">
            {Object.keys(porConcepto).length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">No hay cobros registrados en esta fecha</div>
            ) : (
              Object.entries(porConcepto).map(([concepto, monto]) => (
                <div key={concepto} className="flex items-center justify-between p-3 text-xs">
                  <span className="font-medium">{concepto}</span>
                  <span className="font-bold text-primary">${monto.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desglose por Forma de Pago</h4>
          <div className="divide-y rounded-md border bg-background">
            {Object.entries(porMetodo).map(([metodo, monto]) => (
              <div key={metodo} className="flex items-center justify-between p-3 text-xs">
                <span className="font-medium">{metodo}</span>
                <span className="font-bold text-emerald-400">${monto.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
