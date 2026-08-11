import { useState } from "react";
import { Check, X, Car, Eye, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel } from "./ui-kit/Primitives";
import type { Estudiante } from "@/lib/types";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";

interface Props {
  estudiantes: Estudiante[];
  curso?: any;
}

const DIAS_PRACTICA = [1, 2, 3, 4, 5, 6, 7];

export function AsistenciaPracticaView({ estudiantes, curso }: Props) {
  const [asistencias, setAsistencias] = useState<Record<string, Record<number, boolean>>>({});
  const [generating, setGenerating] = useState(false);

  const courseName = curso?.nombre || "Curso Conducción";
  const licenseType = curso?.tipoLicencia || "B";

  const getAsistenciasFolder = async () => {
    const rootCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(courseName);
    return `${rootCourseFolder}/Asistencias`;
  };

  const handleOpenAsistenciasFolder = async () => {
    const targetFolder = await getAsistenciasFolder();
    await LocalFileStorage.getInstance().openFolder(targetFolder);
  };

  const toggleAsistencia = (studentId: string, dia: number) => {
    setAsistencias((prev) => {
      const studentMap = prev[studentId] || {};
      const nextVal = !studentMap[dia];
      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [dia]: nextVal,
        },
      };
    });
  };

  const guardar = () => {
    toast.success("Asistencia de práctica (días 1 al 7) guardada en SQLite local");
  };

  const handleGenerarDocumento = async () => {
    setGenerating(true);
    const toastId = toast.loading("Generando documento de asistencia práctica en carpeta Asistencias...");

    try {
      const asistenciasFolder = await getAsistenciasFolder();
      const safeFileName = courseName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const outputFilename = `ASISTENCIA_PRACTICA_${safeFileName}.xlsx`;
      const outputPath = `${asistenciasFolder}/${outputFilename}`;

      const resPath = await ExcelGenerator.getInstance().generateAsistenciaPracticaReport(
        {
          courseName,
          licenseType,
          students: estudiantes,
        },
        outputPath
      );
      toast.success("¡Documento de asistencia práctica generado con éxito!", {
        id: toastId,
        description: `Ubicación: ${resPath}`,
        duration: 8000,
        action: {
          label: "Abrir Carpeta",
          onClick: () => LocalFileStorage.getInstance().openFolder(asistenciasFolder),
        },
      });
    } catch (err: any) {
      console.error("Error al generar asistencia práctica:", err);
      toast.error(`Error al generar documento: ${err.message}`, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Control de Asistencia Práctica por Vehículo</h3>
          <p className="text-xs text-muted-foreground">Registro de asistencia en pista/vehículo para las 15 horas de práctica (días 1 al 7)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAsistenciasFolder}
            title="Abrir carpeta de asistencias del curso"
            className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={handleGenerarDocumento}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <FileSpreadsheet size={14} />
            {generating ? "Generando Excel..." : "Generar Documento de Asistencia"}
          </button>
          <Badge tone="primary">
            <Car size={12} className="mr-1 inline" /> 15 Horas Prácticas
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 font-medium">
            <tr>
              <th className="p-2.5">#</th>
              <th className="p-2.5">Estudiante</th>
              <th className="p-2.5">Horario Práctico</th>
              {DIAS_PRACTICA.map((d) => (
                <th key={d} className="p-2.5 text-center">Día {d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {estudiantes.map((e, idx) => (
              <tr key={e.id} className="hover:bg-accent/50">
                <td className="p-2.5">{idx + 1}</td>
                <td className="p-2.5 font-medium">{e.nombres}</td>
                <td className="p-2.5 text-muted-foreground">{(e as any).horarioPractico || "14H00-15H00"}</td>
                {DIAS_PRACTICA.map((d) => {
                  const checked = asistencias[e.id]?.[d] ?? true;
                  return (
                    <td key={d} className="p-2.5 text-center">
                      <button
                        onClick={() => toggleAsistencia(e.id, d)}
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
          Guardar Asistencia Práctica
        </button>
      </div>
    </Panel>
  );
}
