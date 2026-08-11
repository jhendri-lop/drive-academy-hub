import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel } from "./ui-kit/Primitives";
import type { Estudiante } from "@/lib/types";

interface Props {
  estudiantes: Estudiante[];
}

const MATERIAS = ["Educación Vial", "Mecánica Básica", "Primeros Auxilios", "Psicología"] as const;
const CLASES = [1, 2, 3, 4, 5];

export function AsistenciaTeoricaView({ estudiantes }: Props) {
  const [materia, setMateria] = useState<(typeof MATERIAS)[number]>("Educación Vial");
  const [asistencias, setAsistencias] = useState<Record<string, Record<number, boolean>>>({});

  const toggleAsistencia = (studentId: string, clase: number) => {
    setAsistencias((prev) => {
      const studentMap = prev[studentId] || {};
      const nextVal = !studentMap[clase];
      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [clase]: nextVal,
        },
      };
    });
  };

  const guardar = () => {
    toast.success(`Asistencia de ${materia} guardada en SQLite local`);
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Control de Asistencia Teórica</h3>
          <p className="text-xs text-muted-foreground">Registre la presencia diaria por asignatura teórica</p>
        </div>
        <div className="flex gap-2">
          {MATERIAS.map((m) => (
            <button
              key={m}
              onClick={() => setMateria(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                materia === m ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 font-medium">
            <tr>
              <th className="p-2.5">#</th>
              <th className="p-2.5">Estudiante</th>
              <th className="p-2.5">Cédula</th>
              {CLASES.map((c) => (
                <th key={c} className="p-2.5 text-center">Clase {c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {estudiantes.map((e, idx) => (
              <tr key={e.id} className="hover:bg-accent/50">
                <td className="p-2.5">{idx + 1}</td>
                <td className="p-2.5 font-medium">{e.nombres}</td>
                <td className="p-2.5 text-muted-foreground">{e.cedula}</td>
                {CLASES.map((c) => {
                  const checked = asistencias[e.id]?.[c] ?? true;
                  return (
                    <td key={c} className="p-2.5 text-center">
                      <button
                        onClick={() => toggleAsistencia(e.id, c)}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
                          checked ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        }`}
                      >
                        {checked ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={guardar} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
          Guardar Asistencia Teórica
        </button>
      </div>
    </Panel>
  );
}
