import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, Eye, FileText, FolderOpen, Images, Printer, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Badge, Panel } from "@/components/ui-kit/Primitives";
import { DataTable, type Column } from "@/components/ui-kit/DataTable";
import { InscripcionModal } from "@/components/InscripcionModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { InputField, SelectField } from "@/components/ui-kit/Fields";
import type { Estudiante } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AsistenciaTeoricaView } from "@/components/AsistenciaTeoricaView";
import { AsistenciaPracticaView } from "@/components/AsistenciaPracticaView";
import { RegistroPermisosView } from "@/components/RegistroPermisosView";
import { RegistroCalificacionesView } from "@/components/RegistroCalificacionesView";
import { ConfigCursoView } from "@/components/ConfigCursoView";
import { GeneratePhase1DocumentsUseCase } from "@/application/use-cases/GeneratePhase1DocumentsUseCase";
import { GeneratePhase2DocumentsUseCase } from "@/application/use-cases/GeneratePhase2DocumentsUseCase";
import { GeneratePhase3DocumentsUseCase } from "@/application/use-cases/GeneratePhase3DocumentsUseCase";
import { GeneratePhase4DocumentsUseCase } from "@/application/use-cases/GeneratePhase4DocumentsUseCase";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { OficioNumberModal } from "@/components/OficioNumberModal";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";

const TABS = ["Estudiantes", "Asistencia Teoría", "Asistencia Práctica", "Permisos ANT", "Calificaciones", "Documentos", "Config Curso"] as const;

export default function CursoDetalle() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const curso = useApp((s) => s.cursos.find((c) => c.id === cursoId));
  const todos = useApp((s) => s.estudiantes);
  const estudiantes = useMemo(() => todos.filter((e) => e.cursoId === cursoId), [todos, cursoId]);
  const config = useApp((s) => s.config);
  const setFase = useApp((s) => s.setFase);
  const deleteCurso = useApp((s) => s.deleteCurso);
  const deleteEstudiante = useApp((s) => s.deleteEstudiante);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Estudiantes");
  const [open, setOpen] = useState(false);
  const [generatingPhase1, setGeneratingPhase1] = useState(false);
  const [generatingPhase2, setGeneratingPhase2] = useState(false);
  const [generatingPhase3, setGeneratingPhase3] = useState(false);
  const [generatingPhase4, setGeneratingPhase4] = useState(false);
  const [lastFolderPath, setLastFolderPath] = useState<string | null>(null);

  // Modal de Número de Oficio
  const [isOficioModalOpen, setIsOficioModalOpen] = useState(false);
  const [showNumeroTramiteModal, setShowNumeroTramiteModal] = useState(false);
  const [selectedNumeroTramite, setSelectedNumeroTramite] = useState<string>("TR-ANT-2026-099");
  const [pendingAction, setPendingAction] = useState<"FASE_1" | "FASE_3" | "INDIVIDUAL" | null>(null);
  const [pendingDocName, setPendingDocName] = useState<string>("");
  const [pendingFase, setPendingFase] = useState<number>(1);
  const [countOficios, setCountOficios] = useState<number>(2);
  const [estudianteAEliminar, setEstudianteAEliminar] = useState<Estudiante | null>(null);
  const [confirmarEliminarCurso, setConfirmarEliminarCurso] = useState(false);

  if (!curso) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Curso no encontrado</p>
        <Link to="/cursos" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
          ← Volver a Cursos
        </Link>
      </div>
    );
  }

  const handleOpenFase1Modal = () => {
    setPendingAction("FASE_1");
    setShowNumeroTramiteModal(false);
    setCountOficios(2);
    setIsOficioModalOpen(true);
  };

  const handleOpenFase3Modal = () => {
    setPendingAction("FASE_3");
    setShowNumeroTramiteModal(true);
    setCountOficios(1);
    setIsOficioModalOpen(true);
  };

  const handleConfirmOficioNumber = async (startNumber: number, numeroTramite?: string) => {
    setIsOficioModalOpen(false);
    const tram = numeroTramite || "00";
    setSelectedNumeroTramite(tram);

    if (pendingAction === "FASE_1") {
      if (!cursoId) return;
      setGeneratingPhase1(true);
      const toastId = toast.loading("Generando documentos de Fase 1 (1/5)…");

      try {
        const useCase = new GeneratePhase1DocumentsUseCase();
        const res = await useCase.execute(
          cursoId,
          (stepMsg, curr, tot) => {
            toast.loading(`[Fase 1] (${curr}/${tot}) ${stepMsg}…`, { id: toastId });
          },
          startNumber
        );

        setLastFolderPath(res.folderPath);
        toast.success("¡Fase 1 generada exitosamente!", {
          id: toastId,
          description: `Carpeta: ${res.folderPath}`,
          duration: 6000,
        });
      } catch (err: any) {
        console.error("Error generando Fase 1:", err);
        toast.error("Error al generar Fase 1", { id: toastId, description: err.message });
      } finally {
        setGeneratingPhase1(false);
        setPendingAction(null);
      }
    } else if (pendingAction === "FASE_3") {
      if (!cursoId) return;
      setGeneratingPhase3(true);
      const toastId = toast.loading("Generando documentos de Fase 3 (1/3)…");

      try {
        const useCase = new GeneratePhase3DocumentsUseCase();
        const res = await useCase.execute(
          cursoId,
          (stepMsg, curr, tot) => {
            toast.loading(`[Fase 3] (${curr}/${tot}) ${stepMsg}…`, { id: toastId });
          },
          startNumber,
          tram
        );

        setLastFolderPath(res.folderPath);
        toast.success("¡Los 3 documentos de Fase 3 fueron generados exitosamente!", {
          id: toastId,
          description: `Ubicación: ${res.folderPath}`,
          duration: 8000,
        });
      } catch (err: any) {
        console.error("Error generando Fase 3:", err);
        toast.error(`Error al generar Fase 3: ${err.message}`, { id: toastId });
      } finally {
        setGeneratingPhase3(false);
        setPendingAction(null);
      }
    } else if (pendingAction === "INDIVIDUAL") {
      await runGenerarIndividual(pendingDocName, pendingFase, startNumber, tram);
      setPendingAction(null);
    }
  };

  const handleGenerarFase1 = async () => {
    handleOpenFase1Modal();
  };

  const handleGenerarFase2 = async () => {
    if (!cursoId) return;
    setGeneratingPhase2(true);
    const toastId = toast.loading("Generando documentos de Fase 2 (1/5)…");

    try {
      const useCase = new GeneratePhase2DocumentsUseCase();
      const res = await useCase.execute(cursoId, (step, current, total) => {
        toast.loading(`Generando ${step} (${current}/${total})…`, { id: toastId });
      });

      setLastFolderPath(res.folderPath);
      toast.success("¡Los 5 documentos de Fase 2 fueron generados exitosamente!", {
        id: toastId,
        description: `Ubicación: ${res.folderPath}`,
        duration: 8000,
      });
    } catch (err: any) {
      console.error("Error generando Fase 2:", err);
      toast.error(`Error al generar documentos: ${err.message}`, { id: toastId });
    } finally {
      setGeneratingPhase2(false);
    }
  };

  const handleGenerarFase3 = async () => {
    handleOpenFase3Modal();
  };

  const handleGenerarFase4 = async () => {
    if (!cursoId) return;
    setGeneratingPhase4(true);
    const toastId = toast.loading("Generando documentos de Fase 4 (1/3)…");

    try {
      const useCase = new GeneratePhase4DocumentsUseCase();
      const res = await useCase.execute(cursoId, (step, current, total) => {
        toast.loading(`Generando ${step} (${current}/${total})…`, { id: toastId });
      });

      setLastFolderPath(res.folderPath);
      toast.success("¡Los documentos finales y Títulos de Fase 4 fueron generados exitosamente!", {
        id: toastId,
        description: `Ubicación: ${res.folderPath}`,
        duration: 8000,
      });
    } catch (err: any) {
      console.error("Error generando Fase 4:", err);
      toast.error(`Error al generar documentos: ${err.message}`, { id: toastId });
    } finally {
      setGeneratingPhase4(false);
    }
  };

  const handleGenerarDocumentoIndividual = async (docName: string, fase: number) => {
    if (!curso) return;
    const isOficio =
      docName.includes("Oficio de Autorización") ||
      docName.includes("Oficio de Compra") ||
      docName.includes("Oficio de Legalización");

    if (isOficio) {
      setPendingAction("INDIVIDUAL");
      setPendingDocName(docName);
      setPendingFase(fase);
      setCountOficios(1);
      setShowNumeroTramiteModal(docName.includes("Legalización") || docName.includes("Legalizacion") || fase === 3);
      setIsOficioModalOpen(true);
      return;
    }

    await runGenerarIndividual(docName, fase);
  };

  const runGenerarIndividual = async (docName: string, fase: number, customStartNumber?: number, customNumeroTramite?: string) => {
    if (!curso) return;
    const toastId = toast.loading(`Generando ${docName}...`);
    try {
      const baseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(curso.nombre);
      const config = useApp.getState().config;
      const schoolName = config.escuela.nombre || "ESCUELA DE CONDUCCION DRIVE ACADEMY ALERTA CONDADO";
      const safeCourseName = curso.nombre.replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateText = new Date().toLocaleDateString("es-EC");
      let subFolder = "01_Permisos";
      let filePath = "";

      const activeOficioNum = customStartNumber || config.secuenciales.oficios || 1152;
      const oficioNumFormatted = `2026-${activeOficioNum}`;

      const isOficio =
        docName.includes("Oficio de Autorización") ||
        docName.includes("Oficio de Compra") ||
        docName.includes("Oficio de Legalización");

      // Si fue oficio, avanzar secuencial a N + 1
      if (customStartNumber || isOficio) {
        const nextNum = Number(activeOficioNum) + 1;
        try {
          await SQLiteClient.getInstance().execute(
            `INSERT INTO sequentials (type, current_number) VALUES ('oficio', ?) ON CONFLICT(type) DO UPDATE SET current_number = ?`,
            [nextNum, nextNum]
          );
        } catch (e) {
          console.error("Error actualizando secuencial oficio en SQLite:", e);
        }
        useApp.getState().updateConfig({
          secuenciales: {
            ...config.secuenciales,
            oficios: nextNum,
          },
        });
      }

      if (fase === 1) {
        subFolder = "01_Permisos";
        const folder = `${baseFolder}/${subFolder}`;
        if (docName.includes("Autorización")) {
          filePath = `${folder}/01_Oficio_Autorizacion_${oficioNumFormatted}.docx`;
          await WordGenerator.getInstance().generateOficioAutorizacion(
            {
              fecha: dateText,
              oficioNumero: oficioNumFormatted,
              directorAnt: config.firmas?.directorAnt?.nombre || "Espíndola Lara Oscar Omar",
              cargoAnt: config.firmas?.directorAnt?.cargo || "Director Provincial",
              curso: curso.nombre,
              cantidad: estudiantes.length || 1,
              categoria: curso.tipoLicencia,
              representante: config.firmas?.representante?.nombre || "Representante Legal",
              escuela: schoolName,
              sucursal: config.escuela.sucursal || "el Condado",
              fechaInicio: curso.inicioCurso,
              fechaFin: curso.finCurso,
              direccion: config.escuela.direccion || "Quito",
              telefono: config.escuela.telefono || "0999999999",
              email: config.escuela.correo || "info@drive.ec",
            },
            filePath
          );
        } else if (docName.includes("Compra")) {
          filePath = `${folder}/02_Oficio_Compra_Permisos_${oficioNumFormatted}.docx`;
          await WordGenerator.getInstance().generateOficioCompra(
            {
              fecha: dateText,
              oficioNumero: oficioNumFormatted,
              directorAnt: config.firmas?.directorAnt?.nombre || "Dr. Director ANT",
              cargoAnt: config.firmas?.directorAnt?.cargo || "Director Provincial",
              curso: curso.nombre,
              estudiantes: estudiantes.map((s) => ({ nombre: s.nombres, cedula: s.cedula })),
            },
            filePath
          );
        } else if (docName.includes("Excel Permisos")) {
          filePath = `${folder}/${safeCourseName}_exel_permisos_ANT.xlsx`;
          await ExcelGenerator.getInstance().generatePermisosANT(
            { courseName: curso.nombre, schoolName, schoolRuc: config.escuela.ruc, students: estudiantes },
            filePath
          );
        } else if (docName.includes("Anexo Permisos")) {
          filePath = `${folder}/04_PERMISOS_${safeCourseName}_ANEXO.xlsx`;
          await ExcelGenerator.getInstance().generateAnexoPermisos(
            { course: curso, schoolName, students: estudiantes },
            filePath
          );
        }
      } else if (fase === 2) {
        subFolder = "02_Curso";
        const folder = `${baseFolder}/${subFolder}`;
        if (docName.includes("Acuerdo")) {
          filePath = `${folder}/01_Acuerdo_Ensenanza.docx`;
          await WordGenerator.getInstance().generateAcuerdoEnsenanza(
            { curso: curso.nombre, courseId: curso.id, students: estudiantes, estudiantes: estudiantes, ciudad_fecha: `Quito, ${dateText}` },
            filePath
          );
        } else if (docName.includes("Ficha Teórica")) {
          filePath = `${folder}/02_Ficha_Teorica.docx`;
          await WordGenerator.getInstance().generateFichaTeorica(
            { curso: curso.nombre, courseId: curso.id, students: estudiantes, estudiantes: estudiantes, materia: "Educación Vial" },
            filePath
          );
        } else if (docName.includes("Ficha Práctica")) {
          filePath = `${folder}/03_Ficha_Practica.xlsx`;
          await ExcelGenerator.getInstance().generateFichaPractica(
            { courseName: curso.nombre, courseId: curso.id, schoolName, students: estudiantes, course: curso },
            filePath
          );
        } else if (docName.includes("Acta Parte 1")) {
          filePath = `${folder}/04_Acta_Parte_1_Firmas.docx`;
          await WordGenerator.getInstance().generateActaParte1(
            { curso: curso.nombre, courseId: curso.id, students: estudiantes, estudiantes: estudiantes, escuela: schoolName },
            filePath
          );
        }
      } else if (fase === 3) {
        subFolder = "03_Legalizacion";
        const folder = `${baseFolder}/${subFolder}`;
        if (docName.includes("Oficio")) {
          filePath = `${folder}/01_Oficio_Legalizacion.docx`;
          const numTram = customNumeroTramite || selectedNumeroTramite || "00";
          await WordGenerator.getInstance().generateOficioLegalizacion(
            {
              curso: curso.nombre,
              cursoId: curso.id,
              course: curso,
              students: estudiantes,
              estudiantes: estudiantes,
              fecha: `Quito, ${dateText}`,
              oficio_numero: oficioNumFormatted,
              numeroTramite: numTram,
              numero_tramite: numTram,
              tramiteNumero: numTram,
            },
            filePath
          );
        } else if (docName.includes("Anexo Legalización")) {
          filePath = `${folder}/02_Anexo_Legalizacion_ANT.xlsx`;
          await ExcelGenerator.getInstance().generateAnexoLegalizacion(
            { courseName: curso.nombre, students: estudiantes },
            filePath
          );
        } else if (docName.includes("Base Datos Legalización")) {
          filePath = `${folder}/03_Base_Datos_Legalizacion.xlsx`;
          await ExcelGenerator.getInstance().generateBaseLegalizacion(
            { courseName: curso.nombre, students: estudiantes },
            filePath
          );
        }
      } else if (fase === 4) {
        subFolder = "04_Finalizacion";
        const folder = `${baseFolder}/${subFolder}`;
        if (docName.includes("Acta Parte 2")) {
          filePath = `${folder}/01_Acta_Parte_2_Calificaciones.docx`;
          await WordGenerator.getInstance().generateActaParte2(
            { curso: curso.nombre, courseId: curso.id, students: estudiantes, estudiantes: estudiantes, escuela: schoolName },
            filePath
          );
        } else if (docName.includes("Título de Conductor")) {
          filePath = `${folder}/02_Impresion_Titulos.docx`;
          await WordGenerator.getInstance().generateImpresionTitulos(
            { courseName: curso.nombre, courseId: curso.id, schoolName, students: estudiantes, estudiantes: estudiantes },
            filePath
          );
        } else if (docName.includes("Fotos")) {
          filePath = `${folder}/03_Fotos_3x4.pdf`;
          await PDFGenerator.getInstance().generateFotos3x4(
            estudiantes.map((s) => ({
              fullName: s.nombres,
              cedula: s.cedula,
              photoPath: s.fotoUrl || "",
            })),
            filePath
          );
        } else if (docName.includes("Entrega de Documentos")) {
          filePath = `${folder}/04_Entrega_Documentos.xlsx`;
          await ExcelGenerator.getInstance().generateEntregaDocumentos(
            {
              courseName: curso.nombre,
              schoolName,
              startDate: curso.inicioCurso,
              endDate: curso.finCurso,
              students: estudiantes,
            },
            filePath
          );
        } else if (docName.includes("Base General")) {
          filePath = `${folder}/05_Base_General.xlsx`;
          await ExcelGenerator.getInstance().generateBaseGeneral(
            { courseName: curso.nombre, schoolName, students: estudiantes },
            filePath
          );
        }
      }

      const finalFolder = `${baseFolder}/${subFolder}`;
      setLastFolderPath(finalFolder);

      toast.success(`¡Documento '${docName}' generado exitosamente!`, {
        id: toastId,
        description: `Ubicación: ${filePath}`,
        duration: 6000,
        action: {
          label: "Abrir Carpeta",
          onClick: () => LocalFileStorage.getInstance().openFolder(finalFolder),
        },
      });
    } catch (err: any) {
      console.error("Error al generar archivo individual:", err);
      toast.error(`Error: ${err.message}`, { id: toastId });
    }
  };

  const handleGenerarRecibosPDF = async () => {
    if (!curso) return;
    if (estudiantes.length === 0) {
      toast.error("No hay alumnos matriculados en este curso para generar recibos.");
      return;
    }
    const toastId = toast.loading("Generando recibos PDF del curso...");
    try {
      const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(curso.nombre);
      const recibosFolder = `${baseCourseFolder}/Recibos`;
      const config = useApp.getState().config;

      const listData = estudiantes.map((e, idx) => ({
        receiptNumber: e.reciboNumero || 1000 + idx + 1,
        date: String(e.fecha || new Date().toISOString().split("T")[0]),
        studentName: e.nombres,
        cedula: e.cedula,
        concept: e.concepto || `Curso Tipo ${curso.tipoLicencia}`,
        amount: e.valorTotal || 420,
        paymentMethod: e.formaPago || "Efectivo",
        courseName: curso.nombre,
        schoolName: config.escuela.nombre,
        schoolRuc: config.escuela.ruc,
      }));

      // 1. Guardar recibos individuales
      for (const item of listData) {
        const indivPath = `${recibosFolder}/Recibo_${item.cedula}_${item.studentName.replace(/\s+/g, "_")}.pdf`;
        await PDFGenerator.getInstance().generateRecibo(item, indivPath);
      }

      // 2. Guardar recibo compilado con todos
      const todosPath = `${recibosFolder}/Recibos_Todos_${curso.nombre.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      await PDFGenerator.getInstance().generateRecibosTodos(listData, todosPath);

      setLastFolderPath(recibosFolder);
      toast.success(`¡Se generaron ${listData.length} recibos en PDF!`, {
        id: toastId,
        description: `Carpeta: ${recibosFolder}`,
        duration: 7000,
      });
    } catch (err: any) {
      console.error("Error generando recibos PDF:", err);
      toast.error(`Error: ${err.message}`, { id: toastId });
    }
  };

  const [estudianteAEditar, setEstudianteAEditar] = useState<Estudiante | null>(null);

  const handleImprimirReciboIndividual = async (r: Estudiante) => {
    if (!curso) return;
    const toastId = toast.loading(`Generando recibo para ${r.nombres}...`);
    try {
      const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(curso.nombre);
      const recibosFolder = `${baseCourseFolder}/Recibos`;
      const reciboPath = `${recibosFolder}/Recibo_${r.cedula}_${r.nombres.replace(/\s+/g, "_")}.pdf`;
      const config = useApp.getState().config;

      await PDFGenerator.getInstance().generateRecibo(
        {
          receiptNumber: r.reciboNumero || 1001,
          date: String(r.fecha || new Date().toISOString().split("T")[0]),
          studentName: r.nombres,
          cedula: r.cedula,
          concept: r.concepto || `Curso Tipo ${curso.tipoLicencia}`,
          amount: r.abono || 0,
          paymentMethod: r.formaPago || "Efectivo",
          courseName: curso.nombre,
          schoolName: config.escuela.nombre,
          schoolRuc: config.escuela.ruc,
        },
        reciboPath
      );

      setLastFolderPath(recibosFolder);
      toast.success(`Recibo N° ${r.reciboNumero || 1001} generado exitosamente`, {
        id: toastId,
        description: `Ubicación: ${reciboPath}`,
        duration: 6000,
      });
    } catch (err: any) {
      console.error("Error al imprimir recibo:", err);
      toast.error(`Error al generar recibo: ${err.message}`, { id: toastId });
    }
  };

  const columns: Column<Estudiante>[] = [
    { key: "nombres", header: "Nombre" },
    { key: "cedula", header: "Cédula" },
    { key: "celular", header: "Celular" },
    { key: "saldo", header: "Saldo", render: (r) => `$${r.saldo.toFixed(2)}` },
    {
      key: "estado",
      header: "Estado",
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "muted"}>{r.estado}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      value: () => "",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEstudianteAEditar(r);
              setOpen(true);
            }}
            className="btn-3d-secondary rounded-full px-3 py-1 text-[11px] font-semibold"
          >
            Editar
          </button>
          <button
            onClick={() => handleImprimirReciboIndividual(r)}
            className="btn-3d-secondary inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
          >
            <Printer size={12} /> Guardar Recibo
          </button>
          <button
            onClick={() => setEstudianteAEliminar(r)}
            className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            title="Eliminar estudiante"
          >
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link to="/cursos" className="btn-3d-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-primary transition-all">
        <ArrowLeft size={14} /> Volver a cursos
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{curso.nombre}</h1>
          <p className="text-[12px] text-muted-foreground">
            Licencia {curso.tipoLicencia} · Fase {curso.faseActual} · {estudiantes.length} de {curso.vehiculosIds.length * 8} cupos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {curso.faseActual === 1 && (
            <button
              onClick={handleGenerarFase1}
              disabled={generatingPhase1}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText size={14} />
              {generatingPhase1 ? "Generando Fase 1…" : "Generar Documentos Fase 1"}
            </button>
          )}

          {curso.faseActual === 2 && (
            <button
              onClick={handleGenerarFase2}
              disabled={generatingPhase2}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText size={14} />
              {generatingPhase2 ? "Generando Fase 2…" : "Generar Documentos Fase 2"}
            </button>
          )}

          {curso.faseActual === 3 && (
            <button
              onClick={handleGenerarFase3}
              disabled={generatingPhase3}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText size={14} />
              {generatingPhase3 ? "Generando Fase 3…" : "Generar Documentos Fase 3"}
            </button>
          )}

          {curso.faseActual === 4 && (
            <button
              onClick={handleGenerarFase4}
              disabled={generatingPhase4}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText size={14} />
              {generatingPhase4 ? "Generando Fase 4…" : "Generar Documentos y Títulos Fase 4"}
            </button>
          )}

          {lastFolderPath && (
            <button
              onClick={() => LocalFileStorage.getInstance().openFolder(lastFolderPath)}
              className="flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20"
            >
              <FolderOpen size={14} /> Abrir carpeta
            </button>
          )}

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <UserPlus size={14} /> Inscribir Alumno
          </button>

          <button
            onClick={() => setConfirmarEliminarCurso(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
            title="Eliminar este curso"
          >
            <Trash2 size={14} /> Eliminar Curso
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Estudiantes" && (
        <div className="space-y-4">
          <DataTable rows={estudiantes} columns={columns} empty="Aún no hay alumnos inscritos" />
        </div>
      )}
      {tab === "Asistencia Teoría" && (
        <AsistenciaTeoricaView estudiantes={estudiantes} />
      )}

      {tab === "Asistencia Práctica" && (
        <AsistenciaPracticaView estudiantes={estudiantes} curso={curso} />
      )}

      {tab === "Permisos ANT" && (
        <RegistroPermisosView estudiantes={estudiantes} />
      )}

      {tab === "Calificaciones" && (
        <RegistroCalificacionesView estudiantes={estudiantes} />
      )}

      {tab === "Documentos" && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              fase: 1,
              docs: [
                "Oficio de Autorización (.docx)",
                "Oficio de Compra de Permisos (.docx)",
                "Excel Permisos ANT (.xlsx)",
                "Anexo Permisos (.xlsx)",
              ],
            },
            {
              fase: 2,
              docs: [
                "Acuerdo de Enseñanza (.docx)",
                "Ficha Teórica (.docx)",
                "Ficha Práctica (.xlsx)",
                "Acta Parte 1 - Firmas (.docx)",
              ],
            },
            {
              fase: 3,
              docs: [
                "Oficio de Legalización (.docx)",
                "Anexo Legalización ANT (.xlsx)",
                "Base Datos Legalización (.xlsx)",
              ],
            },
            {
              fase: 4,
              docs: [
                "Acta Parte 2 - Calificaciones (.docx)",
                "Título de Conductor (.pdf)",
                "Fotos 3x4 (.pdf)",
                "Entrega de Documentos (.xlsx)",
                "Base General (.xlsx)",
              ],
            },
          ].map((g) => (
            <Panel key={g.fase} hover className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Fase {g.fase}</h3>
                <Badge tone={g.fase <= curso.faseActual ? "primary" : "muted"}>
                  {g.fase < curso.faseActual ? "Completada" : g.fase === curso.faseActual ? "Actual" : "Pendiente"}
                </Badge>
              </div>
              {g.docs.map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-primary/60"
                >
                  <button
                    disabled={g.fase > curso.faseActual}
                    onClick={() => {
                      console.log(`[CursoDetalle] Clic en generar documento individual '${d}' para Fase ${g.fase}`);
                      handleGenerarDocumentoIndividual(d, g.fase);
                    }}
                    className="flex flex-1 items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-left hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FileText size={13} className="shrink-0 text-primary" />
                    <span className="truncate">{d}</span>
                  </button>
                  <button
                    title="Visualizar y abrir ubicación de este archivo"
                    disabled={g.fase > curso.faseActual}
                    onClick={async () => {
                      const baseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(curso.nombre);
                      const sub = g.fase === 1 ? "01_Permisos" : g.fase === 2 ? "02_Curso" : g.fase === 3 ? "03_Legalizacion" : "04_Finalizacion";
                      const folder = `${baseFolder}/${sub}`;
                      LocalFileStorage.getInstance().openFolder(folder);
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              ))}
              {g.fase > curso.faseActual && (
                <button onClick={() => setFase(curso.id, g.fase as 1 | 2 | 3 | 4)} className="text-[11px] text-primary hover:underline">
                  Avanzar a esta fase
                </button>
              )}
            </Panel>
          ))}
        </div>
      )}

      {tab === "Config Curso" && <ConfigCursoView curso={curso} />}

      <InscripcionModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEstudianteAEditar(null);
        }}
        curso={curso}
        estudianteAEditar={estudianteAEditar}
      />

      <OficioNumberModal
        isOpen={isOficioModalOpen}
        onClose={() => {
          setIsOficioModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirmOficioNumber}
        currentNumber={config.secuenciales?.oficios || 1152}
        countOficios={countOficios}
        showNumeroTramite={showNumeroTramiteModal}
      />

      <ConfirmModal
        open={confirmarEliminarCurso}
        title="¿Estás seguro que deseas eliminar este curso?"
        itemName={curso.nombre}
        description={`Se eliminará el curso "${curso.nombre}" y todos sus alumnos inscritos. Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar Curso"
        cancelText="Cancelar"
        onConfirm={() => {
          deleteCurso(curso.id);
          toast.success(`Curso "${curso.nombre}" eliminado exitosamente.`);
          navigate("/cursos");
        }}
        onClose={() => setConfirmarEliminarCurso(false)}
      />

      <ConfirmModal
        open={!!estudianteAEliminar}
        title="¿Estás seguro que deseas eliminar a este alumno?"
        itemName={estudianteAEliminar?.nombres}
        description={`Se eliminará al estudiante "${estudianteAEliminar?.nombres}" (Cédula: ${estudianteAEliminar?.cedula || "—"}) de este curso.`}
        confirmText="Sí, Eliminar Alumno"
        cancelText="Cancelar"
        onConfirm={() => {
          if (estudianteAEliminar) {
            deleteEstudiante(estudianteAEliminar.id);
            toast.success(`Estudiante "${estudianteAEliminar.nombres}" eliminado exitosamente.`);
            setEstudianteAEliminar(null);
          }
        }}
        onClose={() => setEstudianteAEliminar(null)}
      />
    </div>
  );
}
