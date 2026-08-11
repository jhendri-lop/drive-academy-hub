import { useEffect, useState } from "react";
import { Hash, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel } from "./ui-kit/Primitives";
import type { Estudiante } from "@/lib/types";
import { useApp } from "@/lib/store";

interface Props {
  estudiantes: Estudiante[];
}

export function RegistroPermisosView({ estudiantes }: Props) {
  const updateEstudiante = useApp((s) => s.updateEstudiante);
  const [primerNumero, setPrimerNumero] = useState<string>("10001");
  const [permisosMap, setPermisosMap] = useState<Record<string, { numero: string; fecha: string; entregado: boolean }>>({});

  useEffect(() => {
    const initialMap: Record<string, { numero: string; fecha: string; entregado: boolean }> = {};
    estudiantes.forEach((e) => {
      const existingPermiso = (e.numeroPermiso || "").replace(/^PERM-?/i, "").trim();
      initialMap[e.id] = {
        numero: existingPermiso,
        fecha: new Date().toISOString().slice(0, 10),
        entregado: Boolean(existingPermiso && existingPermiso !== "0"),
      };
    });
    setPermisosMap(initialMap);
  }, [estudiantes]);

  const autoAsignar = () => {
    const startNum = parseInt(primerNumero, 10) || 10001;
    const sorted = [...estudiantes].sort((a, b) => a.nombres.localeCompare(b.nombres));
    const nextMap: Record<string, { numero: string; fecha: string; entregado: boolean }> = { ...permisosMap };

    sorted.forEach((e, idx) => {
      const numStr = String(startNum + idx);
      nextMap[e.id] = {
        numero: numStr,
        fecha: new Date().toISOString().slice(0, 10),
        entregado: true,
      };
      updateEstudiante(e.id, { numeroPermiso: numStr });
    });

    setPermisosMap(nextMap);
    toast.success(`Se asignaron ${sorted.length} números de permisos numéricos correlativamente`);
  };

  const handleNumeroChange = (studentId: string, value: string) => {
    const cleanVal = value.replace(/^PERM-?/i, "").trim();
    setPermisosMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { fecha: new Date().toISOString().slice(0, 10), entregado: true }),
        numero: cleanVal,
      },
    }));
  };

  const guardarPermisos = () => {
    estudiantes.forEach((e) => {
      const num = permisosMap[e.id]?.numero?.trim() || "0";
      updateEstudiante(e.id, { numeroPermiso: num || "0" });
    });
    toast.success("Secuencia de permisos de aprendizaje guardada exitosamente");
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Registro y Asignación de Permisos de Aprendizaje</h3>
          <p className="text-xs text-muted-foreground">Asigne la numeración de los permisos autorizados por la ANT</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1">
            <Hash size={13} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="N° inicial..."
              value={primerNumero}
              onChange={(e) => setPrimerNumero(e.target.value)}
              className="w-24 bg-transparent text-xs outline-none"
            />
          </div>
          <button
            onClick={autoAsignar}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Sparkles size={13} /> Asignar automáticamente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 font-medium">
            <tr>
              <th className="p-2.5">#</th>
              <th className="p-2.5">Estudiante</th>
              <th className="p-2.5">Cédula</th>
              <th className="p-2.5">N° Permiso Asignado</th>
              <th className="p-2.5">Fecha Entrega</th>
              <th className="p-2.5">Estado Firma</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {estudiantes.map((e, idx) => {
              const data = permisosMap[e.id] || { numero: e.numeroPermiso || "", fecha: "", entregado: false };
              return (
                <tr key={e.id} className="hover:bg-accent/50">
                  <td className="p-2.5">{idx + 1}</td>
                  <td className="p-2.5 font-medium">{e.nombres}</td>
                  <td className="p-2.5 text-muted-foreground">{e.cedula}</td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      placeholder="10001"
                      value={data.numero}
                      onChange={(ev) => handleNumeroChange(e.id, ev.target.value)}
                      className="w-36 rounded border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5">{data.fecha || "—"}</td>
                  <td className="p-2.5">
                    <Badge tone={data.numero && data.numero !== "0" ? "success" : "muted"}>
                      {data.numero && data.numero !== "0" ? "Asignado" : "Pendiente"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={guardarPermisos} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Save size={14} /> Guardar Permisos
        </button>
      </div>
    </Panel>
  );
}
