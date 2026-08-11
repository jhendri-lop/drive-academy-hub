import { SQLiteCourseRepository } from "@/infrastructure/database/repositories/SQLiteCourseRepository";
import { SQLiteStudentRepository } from "@/infrastructure/database/repositories/SQLiteStudentRepository";
import { SQLiteConfigRepository } from "@/infrastructure/database/repositories/SQLiteConfigRepository";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { useApp } from "@/lib/store";

export interface Phase4DocumentsResult {
  folderPath: string;
  actaParte2Path: string;
  titulosFolderPath: string;
  fotos3x4Path: string;
  entregaDocumentosPath: string;
  baseGeneralPath: string;
}

export class GeneratePhase4DocumentsUseCase {
  private courseRepo = new SQLiteCourseRepository();
  private studentRepo = new SQLiteStudentRepository();
  private configRepo = new SQLiteConfigRepository();
  private sqliteClient = SQLiteClient.getInstance();

  private getSpanishDateText(dateObj: Date = new Date()): string {
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    return `Quito, ${dateObj.getDate()} de ${months[dateObj.getMonth()]} del ${dateObj.getFullYear()}`;
  }

  public async execute(courseId: string, onProgress?: (step: string, current: number, total: number) => void): Promise<Phase4DocumentsResult> {
    console.log("[GeneratePhase4DocumentsUseCase] Iniciando generación de Fase 4 para cursoId:", courseId);

    // 1. Cargar curso (con fallback)
    const dbCourse = await this.courseRepo.findById(courseId);
    const storeCurso = useApp.getState().cursos.find((c) => c.id === courseId || String(c.id) === String(courseId));

    const courseName = dbCourse?.courseName || storeCurso?.nombre || "Curso Conducción";
    const licenseType = dbCourse?.licenseType || storeCurso?.tipoLicencia || "B";

    // 2. Cargar estudiantes (con fallback)
    const dbStudents = await this.studentRepo.findByCourseId(courseId);
    const storeStudents = useApp.getState().estudiantes.filter((e) => e.cursoId === courseId);

    const students = dbStudents.length > 0
      ? dbStudents
      : storeStudents.map((s) => ({
          id: s.id,
          courseId: s.cursoId,
          cedula: s.cedula,
          fullName: s.nombres,
          nationality: "Ecuatoriana",
          bloodType: s.tipoSangre,
          sex: s.sexo,
          birthDate: s.fechaNacimiento,
          age: s.edad,
          address: s.direccion,
          phone: s.celular,
          email: s.correo,
          educationLevel: s.nivelInstruccion,
          practiceSchedule: (s as any).horarioPractico || "14H00-15H00",
          totalAmount: s.valorTotal,
          paymentAmount: s.abono,
          balance: s.saldo,
          status: "Activo" as const,
          photoPath: s.fotoUrl || "",
        }));

    const storeConfig = useApp.getState().config;
    const schoolName = storeConfig.escuela?.nombre || "DRIVE ACADEMY";
    const schoolRuc = storeConfig.escuela?.ruc || "1791234567001";
    const directorName = storeConfig.firmas?.director?.nombre || "Ing. Marco Villacís";
    const secretaryName = storeConfig.firmas?.secretaria?.nombre || "Lcda. Andrea Suárez";

    let rawGrades: any[] = [];
    try {
      rawGrades = this.sqliteClient.queryAll(
        `SELECT * FROM grades WHERE student_id IN (${students.map(() => "?").join(",") || "0"})`,
        students.map((s) => s.id)
      );
    } catch (e) {
      console.warn("[GeneratePhase4DocumentsUseCase] No se pudieron consultar notas de SQLite:", e);
    }

    const gradesMap = new Map<string, any>();
    rawGrades.forEach((g) => gradesMap.set(String(g.student_id), g));

    const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(courseName);
    const folderPath = `${baseCourseFolder}/04_Finalizacion`;
    const titulosFolderPath = `${folderPath}/02_Titulos_Conductores`;
    const dateText = this.getSpanishDateText();

    // 1. Acta Parte 2 con Calificaciones (.docx)
    onProgress?.("Actas Parte 2 con Calificaciones (.docx)", 1, 5);
    const actaParte2Path = `${folderPath}/01_Acta_Grado_Parte2_Calificaciones.docx`;

    const g0 = gradesMap.get(String(students[0]?.id)) || {
      ed_vial: 20, mecanica: 20, primeros_auxilios: 20, psicologia: 20, promedio_teorico: 20, nota_practica: 20
    };

    await WordGenerator.getInstance().generateActaParte2(
      {
        curso: courseName,
        courseId: courseId,
        students: students,
        estudiantes: students,
        numero_acta: "ACT-2026-001",
        nota_ed_vial: g0.ed_vial || 20,
        nota_mecanica: g0.mecanica || 20,
        nota_p_auxilios: g0.primeros_auxilios || 20,
        nota_psicologia: g0.psicologia || 20,
        promedio_teorico: g0.promedio_teorico || 20,
        nota_practica: g0.nota_practica || 20,
        director: directorName,
        secretaria: secretaryName,
      },
      actaParte2Path
    );

    // 2. Impresión de Títulos Oficiales de Conductor (.docx)
    onProgress?.("Impresión de Títulos Oficiales (.docx)", 2, 5);
    const listadoFinal = students.length > 0 ? students : [{ fullName: "Estudiante Ejemplo", cedula: "1725219412" } as any];
    const listadoConNotas = listadoFinal.map((s) => {
      const g = gradesMap.get(String(s.id)) || {};
      return {
        ...s,
        ed_vial: (s as any).ed_vial ?? (s as any).edVial ?? g.ed_vial,
        mecanica: (s as any).mecanica ?? g.mecanica,
        primeros_auxilios: (s as any).primeros_auxilios ?? (s as any).primerosAuxilios ?? g.primeros_auxilios,
        psicologia: (s as any).psicologia ?? g.psicologia,
        promedio_teorico: (s as any).promedio_teorico ?? (s as any).promedioTeorico ?? g.promedio_teorico,
        nota_practica: (s as any).nota_practica ?? (s as any).notaPractica ?? g.nota_practica,
      };
    });

    const impresionesWordPath = `${folderPath}/02_Impresion_Titulos.docx`;
    await WordGenerator.getInstance().generateImpresionTitulos(
      {
        courseName,
        courseId,
        schoolName,
        startDate: (dbCourse as any)?.startDate || storeCurso?.inicioCurso,
        endDate: (dbCourse as any)?.endDate || storeCurso?.finCurso,
        students: listadoConNotas,
        estudiantes: listadoConNotas,
      },
      impresionesWordPath
    );

    // 3. PDF Impresión de Fotos 3x4cm (.pdf)
    onProgress?.("Impresión Fotos 3x4cm (.pdf)", 3, 5);
    const fotos3x4Path = `${folderPath}/03_Fotos_3x4.pdf`;
    await PDFGenerator.getInstance().generateFotos3x4(
      listadoFinal.map((s) => ({
        fullName: s.fullName,
        cedula: s.cedula,
        photoPath: (s as any).photoPath || (s as any).fotoUrl || "",
      })),
      fotos3x4Path
    );

    // 4. Entrega de Documentos (.xlsx)
    onProgress?.("Entrega de Documentos (.xlsx)", 4, 5);
    const entregaDocumentosPath = `${folderPath}/04_Entrega_Documentos.xlsx`;
    await ExcelGenerator.getInstance().generateEntregaDocumentos(
      {
        courseName,
        schoolName,
        startDate: (dbCourse as any)?.startDate || storeCurso?.inicioCurso,
        endDate: (dbCourse as any)?.endDate || storeCurso?.finCurso,
        students,
      },
      entregaDocumentosPath
    );

    // 5. Base General (.xlsx)
    onProgress?.("Base General (.xlsx)", 5, 5);
    const baseGeneralPath = `${folderPath}/05_Base_General.xlsx`;
    await ExcelGenerator.getInstance().generateBaseGeneral(
      { courseName, schoolName, students },
      baseGeneralPath
    );

    console.log("[GeneratePhase4DocumentsUseCase] Fase 4 completada con éxito en:", folderPath);

    return {
      folderPath,
      actaParte2Path,
      titulosFolderPath,
      fotos3x4Path,
      entregaDocumentosPath,
      baseGeneralPath,
    };
  }
}
