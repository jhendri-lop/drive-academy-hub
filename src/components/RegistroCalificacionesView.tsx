import { useState, useEffect } from "react";
import { Award, Save, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel } from "./ui-kit/Primitives";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { useApp } from "@/lib/store";
import type { Estudiante } from "@/lib/types";

interface Props {
  estudiantes: Estudiante[];
}

export interface StudentGrade {
  studentId: string;
  edVial: number;
  mecanica: number;
  primerosAuxilios: number;
  psicologia: number;
  promedioTeorico: number;
  notaPractica: number;
  condicion: "Aprobado" | "Reprobado";
  examenTeoricoDate: string;
  examenPracticoDate: string;
  aprobacionCursoDate: string;
}

export function RegistroCalificacionesView({ estudiantes }: Props) {
  const [gradesMap, setGradesMap] = useState<Record<string, StudentGrade>>(() => {
    let savedLocal: Record<string, any> = {};
    try {
      const raw = localStorage.getItem("zentriumph_student_grades");
      if (raw) savedLocal = JSON.parse(raw) || {};
    } catch (e) {
      console.warn("[RegistroCalificacionesView] Error leyendo localStorage:", e);
    }

    const initial: Record<string, StudentGrade> = {};
    const today = new Date().toISOString().slice(0, 10);
    estudiantes.forEach((e) => {
      const saved = savedLocal[e.id] || (e as any);
      initial[e.id] = {
        studentId: e.id,
        edVial: saved.edVial ?? saved.ed_vial ?? 20,
        mecanica: saved.mecanica ?? 20,
        primerosAuxilios: saved.primerosAuxilios ?? saved.primeros_auxilios ?? 20,
        psicologia: saved.psicologia ?? 20,
        promedioTeorico: saved.promedioTeorico ?? saved.promedio_teorico ?? 20,
        notaPractica: saved.notaPractica ?? saved.nota_practica ?? 20,
        condicion: saved.condicion || "Aprobado",
        examenTeoricoDate: saved.examenTeoricoDate || saved.examen_teorico_date || today,
        examenPracticoDate: saved.examenPracticoDate || saved.examen_practico_date || today,
        aprobacionCursoDate: saved.aprobacionCursoDate || saved.aprobacion_curso_date || today,
      };
    });
    return initial;
  });

  useEffect(() => {
    let isMounted = true;
    async function loadFromDB() {
      if (!estudiantes || estudiantes.length === 0) return;
      try {
        const client = SQLiteClient.getInstance();
        const sql = `SELECT * FROM grades WHERE student_id IN (${estudiantes.map(() => "?").join(",") || "0"})`;
        const rows = client.queryAll<any>(sql, estudiantes.map((e) => e.id));
        if (rows && rows.length > 0 && isMounted) {
          setGradesMap((prev) => {
            const next = { ...prev };
            rows.forEach((r: any) => {
              const sid = String(r.student_id);
              next[sid] = {
                studentId: sid,
                edVial: r.ed_vial ?? next[sid]?.edVial ?? 20,
                mecanica: r.mecanica ?? next[sid]?.mecanica ?? 20,
                primerosAuxilios: r.primeros_auxilios ?? next[sid]?.primerosAuxilios ?? 20,
                psicologia: r.psicologia ?? next[sid]?.psicologia ?? 20,
                promedioTeorico: r.promedio_teorico ?? next[sid]?.promedioTeorico ?? 20,
                notaPractica: r.nota_practica ?? next[sid]?.notaPractica ?? 20,
                condicion: r.condicion || next[sid]?.condicion || "Aprobado",
                examenTeoricoDate: r.examen_teorico_date || next[sid]?.examenTeoricoDate || new Date().toISOString().slice(0, 10),
                examenPracticoDate: r.examen_practico_date || next[sid]?.examenPracticoDate || new Date().toISOString().slice(0, 10),
                aprobacionCursoDate: r.aprobacion_curso_date || next[sid]?.aprobacionCursoDate || new Date().toISOString().slice(0, 10),
              };
            });
            return next;
          });
        }
      } catch (err) {
        console.warn("[RegistroCalificacionesView] Error cargando de SQLite:", err);
      }
    }
    loadFromDB();
    return () => { isMounted = false; };
  }, [estudiantes]);

  const handleGradeChange = (studentId: string, field: keyof StudentGrade, val: any) => {
    setGradesMap((prev) => {
      const current = prev[studentId] || {
        studentId,
        edVial: 20,
        mecanica: 20,
        primerosAuxilios: 20,
        psicologia: 20,
        promedioTeorico: 20,
        notaPractica: 20,
        condicion: "Aprobado",
        examenTeoricoDate: new Date().toISOString().slice(0, 10),
        examenPracticoDate: new Date().toISOString().slice(0, 10),
        aprobacionCursoDate: new Date().toISOString().slice(0, 10),
      };

      const updated = { ...current, [field]: val };

      // Recalcular promedio teórico y condición automáticamente
      if (["edVial", "mecanica", "primerosAuxilios", "psicologia"].includes(field)) {
        const sum = Number(updated.edVial) + Number(updated.mecanica) + Number(updated.primerosAuxilios) + Number(updated.psicologia);
        updated.promedioTeorico = Number((sum / 4).toFixed(2));
        updated.condicion = updated.promedioTeorico >= 16 && Number(updated.notaPractica) >= 16 ? "Aprobado" : "Reprobado";
      } else if (field === "notaPractica") {
        updated.condicion = updated.promedioTeorico >= 16 && Number(updated.notaPractica) >= 16 ? "Aprobado" : "Reprobado";
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  const autoCalificarPerfecto = () => {
    const today = new Date().toISOString().slice(0, 10);
    const updated: Record<string, StudentGrade> = {};
    estudiantes.forEach((e) => {
      updated[e.id] = {
        studentId: e.id,
        edVial: 20,
        mecanica: 20,
        primerosAuxilios: 20,
        psicologia: 20,
        promedioTeorico: 20,
        notaPractica: 20,
        condicion: "Aprobado",
        examenTeoricoDate: today,
        examenPracticoDate: today,
        aprobacionCursoDate: today,
      };
    });
    setGradesMap(updated);
    toast.success("Calificaciones sugeridas (20/20 Aprobados) aplicadas a todos los alumnos");
  };

  const guardarCalificaciones = async () => {
    try {
      // 1. Guardado garantizado en localStorage
      try {
        localStorage.setItem("zentriumph_student_grades", JSON.stringify(gradesMap));
      } catch (e) {
        console.warn("[RegistroCalificacionesView] Error al guardar en localStorage:", e);
      }

      // 2. Sincronizar con el store global Zustand
      const updateEstudiante = useApp.getState().updateEstudiante;
      estudiantes.forEach((e) => {
        const g = gradesMap[e.id];
        if (g && updateEstudiante) {
          updateEstudiante(e.id, {
            edVial: g.edVial,
            mecanica: g.mecanica,
            primerosAuxilios: g.primerosAuxilios,
            psicologia: g.psicologia,
            promedioTeorico: g.promedioTeorico,
            notaPractica: g.notaPractica,
            condicion: g.condicion,
          } as any);
        }
      });

      // 3. Persistir en SQLite Client local
      const client = SQLiteClient.getInstance();
      for (const e of estudiantes) {
        const g = gradesMap[e.id];
        if (!g) continue;
        const sql = `
          INSERT INTO grades (
            student_id, ed_vial, mecanica, primeros_auxilios, psicologia,
            promedio_teorico, nota_practica, condicion, examen_teorico_date,
            examen_practico_date, aprobacion_curso_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(student_id) DO UPDATE SET
            ed_vial = excluded.ed_vial,
            mecanica = excluded.mecanica,
            primeros_auxilios = excluded.primeros_auxilios,
            psicologia = excluded.psicologia,
            promedio_teorico = excluded.promedio_teorico,
            nota_practica = excluded.nota_practica,
            condicion = excluded.condicion,
            examen_teorico_date = excluded.examen_teorico_date,
            examen_practico_date = excluded.examen_practico_date,
            aprobacion_curso_date = excluded.aprobacion_curso_date;
        `;
        try {
          await client.execute(sql, [
            g.studentId,
            g.edVial,
            g.mecanica,
            g.primerosAuxilios,
            g.psicologia,
            g.promedioTeorico,
            g.notaPractica,
            g.condicion,
            g.examenTeoricoDate,
            g.examenPracticoDate,
            g.aprobacionCursoDate,
          ]);
        } catch (dbErr) {
          console.warn(`[RegistroCalificacionesView] SQLite update info para ${e.id}:`, dbErr);
        }
      }
      toast.success("¡Calificaciones guardadas exitosamente!");
    } catch (err: any) {
      console.error("Error al guardar calificaciones:", err);
      toast.error(`Error al guardar calificaciones: ${err.message || err}`);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Registro de Calificaciones y Actas de Grado</h3>
          <p className="text-xs text-muted-foreground">Ingrese las notas teóricas y prácticas para determinar aprobación (mín. 16/20)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={autoCalificarPerfecto}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            <Calculator size={13} /> Llenar 20/20 Aprobados
          </button>
          <button
            onClick={guardarCalificaciones}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Save size={14} /> Guardar Calificaciones
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 font-medium">
            <tr>
              <th className="p-2.5">#</th>
              <th className="p-2.5">Estudiante</th>
              <th className="p-2.5">Ed. Vial</th>
              <th className="p-2.5">Mecánica</th>
              <th className="p-2.5">P. Auxilios</th>
              <th className="p-2.5">Psicología</th>
              <th className="p-2.5 font-bold">Prom. Teórico</th>
              <th className="p-2.5 font-bold">Nota Práctica</th>
              <th className="p-2.5 text-center">Condición</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {estudiantes.map((e, idx) => {
              const g = gradesMap[e.id] || {
                studentId: e.id,
                edVial: 20,
                mecanica: 20,
                primerosAuxilios: 20,
                psicologia: 20,
                promedioTeorico: 20,
                notaPractica: 20,
                condicion: "Aprobado",
              };
              return (
                <tr key={e.id} className="hover:bg-accent/50">
                  <td className="p-2.5">{idx + 1}</td>
                  <td className="p-2.5 font-medium">{e.nombres}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={g.edVial}
                      onChange={(ev) => handleGradeChange(e.id, "edVial", parseFloat(ev.target.value) || 0)}
                      className="w-14 rounded border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={g.mecanica}
                      onChange={(ev) => handleGradeChange(e.id, "mecanica", parseFloat(ev.target.value) || 0)}
                      className="w-14 rounded border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={g.primerosAuxilios}
                      onChange={(ev) => handleGradeChange(e.id, "primerosAuxilios", parseFloat(ev.target.value) || 0)}
                      className="w-14 rounded border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={g.psicologia}
                      onChange={(ev) => handleGradeChange(e.id, "psicologia", parseFloat(ev.target.value) || 0)}
                      className="w-14 rounded border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5 font-bold text-primary">{g.promedioTeorico}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={g.notaPractica}
                      onChange={(ev) => handleGradeChange(e.id, "notaPractica", parseFloat(ev.target.value) || 0)}
                      className="w-14 rounded border bg-background px-1.5 py-1 text-xs font-bold outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <Badge tone={g.condicion === "Aprobado" ? "success" : "warning"}>{g.condicion}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
