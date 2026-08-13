import { useState, useMemo } from "react";
import { Banknote, CreditCard, DollarSign, FileSpreadsheet, Landmark, Calendar, Eye, GraduationCap, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatCard } from "./ui-kit/Primitives";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { useApp } from "@/lib/store";
import type { Recibo } from "@/lib/types";

interface Props {
  recibos: Recibo[];
}

export function CierreCajaReport({ recibos }: Props) {
  const [fecha, setFecha] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [selectedCurso, setSelectedCurso] = useState<string>("TODOS");
  const [lastFolderPath, setLastFolderPath] = useState<string>("");

  const cursos = useApp((s) => s.cursos || []);
  const estudiantes = useApp((s) => s.estudiantes || []);

  const recibosEnriquecidos = useMemo(() => {
    return recibos.map((r) => {
      const st = estudiantes.find(
        (e) => (r.cedula && e.cedula === r.cedula) || (r.estudiante && e.nombres === r.estudiante)
      );
      return {
        ...r,
        comprobanteImg: r.comprobanteImg || st?.comprobanteImg || (st as any)?.fotoUrl || (st as any)?.comprobante_img || "",
      };
    });
  }, [recibos, estudiantes]);

  const cursosDisponibles = useMemo(() => {
    const fromRecibos = Array.from(new Set(recibosEnriquecidos.map((r) => r.curso).filter((c) => c && c !== "—")));
    const fromStore = cursos.map((c) => c.nombre);
    return Array.from(new Set([...fromRecibos, ...fromStore]));
  }, [recibosEnriquecidos, cursos]);

  const recibosDia = useMemo(() => {
    return recibosEnriquecidos.filter((r) => {
      const matchFecha = r.fecha === fecha || !r.fecha;
      const matchCurso = selectedCurso === "TODOS" || r.curso === selectedCurso;
      return matchFecha && matchCurso;
    });
  }, [recibosEnriquecidos, fecha, selectedCurso]);

  /** TODOS los recibos del día sin filtrar por curso (cursos + psicosensométricos) */
  const recibosDiaTodos = useMemo(() => {
    return recibosEnriquecidos.filter((r) => r.fecha === fecha || !r.fecha);
  }, [recibosEnriquecidos, fecha]);

  const recibosCurso = useMemo(() => {
    if (selectedCurso === "TODOS") return recibosEnriquecidos.filter((r) => r.curso && r.curso !== "—");
    return recibosEnriquecidos.filter((r) => r.curso === selectedCurso);
  }, [recibosEnriquecidos, selectedCurso]);

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

  /** Busca el customDocsRoot del curso seleccionado en el store */
  const getCustomRootForCurso = (cursoNombre: string): string | undefined => {
    const cursoObj = cursos.find((c) => c.nombre === cursoNombre);
    return cursoObj?.customDocsRoot || useApp.getState().config?.customDocsRoot || undefined;
  };

  const generarReporteDiarioExcel = async () => {
    try {
      // El reporte diario incluye TODO: cursos + psicosensométricos
      const targetCurso = selectedCurso !== "TODOS" ? selectedCurso : (cursosDisponibles[0] || "General");
      const customRoot = getCustomRootForCurso(targetCurso);
      const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(targetCurso, customRoot);
      const targetFolder = `${baseCourseFolder}/Reportes_de_Caja`;
      const filePath = `${targetFolder}/Cierre_Caja_${fecha}.xlsx`;
      setLastFolderPath(targetFolder);

      // Métricas calculadas sobre TODOS los recibos del día (incluye psicosensométricos)
      const totalDiaTodos = recibosDiaTodos.reduce((sum, r) => sum + r.monto, 0);
      const porMetodoTodos: Record<string, number> = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
      const porConceptoTodos: Record<string, number> = {};
      recibosDiaTodos.forEach((r) => {
        const m = r.metodo || "Efectivo";
        porMetodoTodos[m] = (porMetodoTodos[m] || 0) + r.monto;
        const c = r.concepto || "Matrícula / Curso";
        porConceptoTodos[c] = (porConceptoTodos[c] || 0) + r.monto;
      });

      await ExcelGenerator.getInstance().generateCierreCajaExcel(
        {
          tituloReporte: "Reporte Diario de Caja",
          subtitulo: `Consolidado TOTAL de Ingresos del Día: ${fecha} (Cursos + Psicosensométricos)`,
          fecha: fecha,
          totalDia: totalDiaTodos,
          porMetodo: porMetodoTodos,
          porConcepto: porConceptoTodos,
          recibos: recibosDiaTodos,
        },
        filePath
      );
      toast.success(`Reporte Diario Excel generado en: ${filePath}`);
    } catch (err: any) {
      toast.error(`Error al generar reporte diario Excel: ${err.message}`);
    }
  };

  const generarReporteCursoExcel = async () => {
    try {
      const isTodos = selectedCurso === "TODOS";
      const targetCurso = !isTodos ? selectedCurso : (cursosDisponibles[0] || "Curso_General");

      // 1. Filtrar recibos según el curso seleccionado
      let recibosFiltradosCurso = !isTodos
        ? recibosEnriquecidos.filter((r) => r.curso === targetCurso || (r.curso && targetCurso.includes(r.curso)))
        : recibosEnriquecidos.filter((r) => r.curso && r.curso !== "—");

      // 2. Si no hay recibos en el array de recibos, buscar estudiantes matriculados en ese curso para armar la lista
      if (recibosFiltradosCurso.length === 0) {
        const storeEstudiantes = estudiantes.filter((e) => {
          if (isTodos) return true;
          const cObj = cursos.find((c) => c.nombre === targetCurso || c.id === targetCurso);
          return e.cursoId === cObj?.id || e.cursoId === targetCurso;
        });

        recibosFiltradosCurso = storeEstudiantes.map((st, idx) => ({
          id: st.id || crypto.randomUUID(),
          numero: st.reciboNumero || 1001 + idx,
          estudiante: st.nombres,
          cedula: st.cedula,
          concepto: st.concepto || `Matrícula / Curso`,
          monto: st.abono || st.valorTotal || 0,
          metodo: st.formaPago || "Efectivo",
          curso: targetCurso,
          fecha: st.fecha || fecha,
          comprobante: st.comprobante || "",
          comprobanteImg: st.comprobanteImg || st.fotoUrl || "",
        }));
      }

      const customRoot = getCustomRootForCurso(targetCurso);
      const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(targetCurso, customRoot);
      const targetFolder = `${baseCourseFolder}/Reportes_de_Caja`;
      const safeCurso = targetCurso.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = `${targetFolder}/Reporte_Caja_${safeCurso}.xlsx`;
      setLastFolderPath(targetFolder);

      const totalCurso = recibosFiltradosCurso.reduce((sum, r) => sum + r.monto, 0);
      const porMetodoCurso: Record<string, number> = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
      const porConceptoCurso: Record<string, number> = {};

      recibosFiltradosCurso.forEach((r) => {
        const m = r.metodo || "Efectivo";
        porMetodoCurso[m] = (porMetodoCurso[m] || 0) + r.monto;
        const c = r.concepto || "Matrícula / Curso";
        porConceptoCurso[c] = (porConceptoCurso[c] || 0) + r.monto;
      });

      await ExcelGenerator.getInstance().generateCierreCajaExcel(
        {
          tituloReporte: `Reporte de Caja del Curso: ${targetCurso}`,
          subtitulo: `Consolidado Acumulado de Ingresos del Curso (${recibosFiltradosCurso.length} registro(s))`,
          fecha: fecha,
          totalDia: totalCurso,
          porMetodo: porMetodoCurso,
          porConcepto: porConceptoCurso,
          recibos: recibosFiltradosCurso,
        },
        filePath
      );
      toast.success(`Reporte de Curso Excel generado con éxito: ${filePath}`);
    } catch (err: any) {
      toast.error(`Error al generar reporte de curso Excel: ${err.message}`);
    }
  };

  const generarPDFComprobantes = async () => {
    try {
      const targetCurso = selectedCurso !== "TODOS" ? selectedCurso : (cursosDisponibles[0] || "General");
      const customRoot = getCustomRootForCurso(targetCurso);
      const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(targetCurso, customRoot);
      const targetFolder = `${baseCourseFolder}/Reportes_de_Caja`;
      const filePath = `${targetFolder}/Comprobantes_Recibos_${fecha}.pdf`;
      setLastFolderPath(targetFolder);

      // Cuando es TODOS: todos los recibos del día. Cuando es un curso: solo ese curso (incluye psicosensométricos del día si no hay curso seleccionado)
      const listadoAUsar = selectedCurso !== "TODOS"
        ? recibosEnriquecidos.filter((r) => r.curso === selectedCurso)
        : recibosDiaTodos;

      await PDFGenerator.getInstance().generateComprobantesRecibosPDF(
        listadoAUsar,
        `Comprobantes ${selectedCurso !== "TODOS" ? selectedCurso : `del día ${fecha}`}`,
        filePath
      );
      toast.success(`PDF de Comprobantes generado en: ${filePath}`);
    } catch (err: any) {
      toast.error(`Error al generar comprobantes PDF: ${err.message}`);
    }
  };

  const verCarpeta = async () => {
    const targetCurso = selectedCurso !== "TODOS" ? selectedCurso : (cursosDisponibles[0] || "Reportes_Caja");
    const customRoot = getCustomRootForCurso(targetCurso);
    const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(targetCurso, customRoot);
    const folderToOpen = lastFolderPath || `${baseCourseFolder}/Reportes_de_Caja`;
    await LocalFileStorage.getInstance().openFolder(folderToOpen);
  };

  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Cierre de Caja Diario y Reportes por Curso</h3>
          <p className="text-xs text-muted-foreground">Resumen de ingresos filtrados por fecha, curso y canal de cobro</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Curso */}
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs">
            <GraduationCap size={14} className="text-muted-foreground" />
            <select
              value={selectedCurso}
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Cursos</option>
              {cursosDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs">
            <Calendar size={13} className="text-muted-foreground" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-transparent text-xs outline-none"
            />
          </div>

          {/* Botón 1: Reporte Diario Excel */}
          <button
            onClick={generarReporteDiarioExcel}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            title="Generar Reporte Diario en Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} /> Reporte Diario Excel
          </button>

          {/* Botón 2: Reporte de Curso Excel */}
          <button
            onClick={generarReporteCursoExcel}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            title="Generar Reporte Consolidado del Curso Seleccionado en Excel (.xlsx)"
          >
            <GraduationCap size={14} /> Reporte de Curso Excel
          </button>

          {/* Botón 3: PDF de Comprobantes */}
          <button
            onClick={generarPDFComprobantes}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            title="Generar PDF con las imágenes de comprobantes de recibos (Escala 0.5)"
          >
            <ImageIcon size={14} /> Comprobantes PDF
          </button>

          {/* Botón Ojito: Ver Carpeta en el extremo derecho */}
          <button
            onClick={verCarpeta}
            className="flex items-center justify-center rounded-md border bg-background p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            title="Visualizar / Abrir la subcarpeta Reportes_de_Caja donde se generan los archivos"
          >
            <Eye size={16} />
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

