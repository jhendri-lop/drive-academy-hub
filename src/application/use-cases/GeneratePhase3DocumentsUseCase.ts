import { SQLiteCourseRepository } from "@/infrastructure/database/repositories/SQLiteCourseRepository";
import { SQLiteStudentRepository } from "@/infrastructure/database/repositories/SQLiteStudentRepository";
import { SQLiteConfigRepository } from "@/infrastructure/database/repositories/SQLiteConfigRepository";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { useApp } from "@/lib/store";

export interface Phase3DocumentsResult {
  folderPath: string;
  oficioLegalizacionPath: string;
  anexoLegalizacionAntPath: string;
  baseDatosLegalizacionPath: string;
}

export class GeneratePhase3DocumentsUseCase {
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

  private async getNextOficioNumber(): Promise<number> {
    try {
      const row = this.sqliteClient.queryOne(`SELECT current_number FROM sequentials WHERE type = 'oficio'`);
      const current = row ? Number(row.current_number) : 350;
      const next = current + 1;
      await this.sqliteClient.execute(
        `INSERT INTO sequentials (type, current_number) VALUES ('oficio', ?) ON CONFLICT(type) DO UPDATE SET current_number = ?`,
        [next, next]
      );
      return current;
    } catch {
      return 350;
    }
  }

  public async execute(
    courseId: string,
    onProgress?: (step: string, current: number, total: number) => void,
    startOficioNumber?: number,
    numeroTramite?: string
  ): Promise<Phase3DocumentsResult> {
    console.log("[GeneratePhase3DocumentsUseCase] Iniciando generación de Fase 3 para cursoId:", courseId);

    // 1. Cargar curso (con fallback)
    const dbCourse = await this.courseRepo.findById(courseId);
    const storeCurso = useApp.getState().cursos.find((c) => c.id === courseId || String(c.id) === String(courseId));

    const courseName = dbCourse?.courseName || storeCurso?.nombre || "Curso Conducción";
    const oficioPrefix = dbCourse?.oficioPrefix || "OF";
    const oficioYear = dbCourse?.oficioYear || new Date().getFullYear();
    const startCourseDate = dbCourse?.startCourseDate || storeCurso?.inicioCurso || "2026-07-25";
    const endCourseDate = dbCourse?.endCourseDate || storeCurso?.finCurso || "2026-09-25";

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
        }));

    const storeConfig = useApp.getState().config;
    const antDirectorName = storeConfig.firmas?.directorAnt?.nombre || "Dr. Luis Paredes";
    const antDirectorTitle = storeConfig.firmas?.directorAnt?.cargo || "Director Provincial";

    let rawGrades: any[] = [];
    try {
      rawGrades = this.sqliteClient.queryAll(
        `SELECT * FROM grades WHERE student_id IN (${students.map(() => "?").join(",") || "0"})`,
        students.map((s) => s.id)
      );
    } catch (e) {
      console.warn("[GeneratePhase3DocumentsUseCase] No se pudieron consultar notas de SQLite:", e);
    }

    const gradesMap = new Map<string, any>();
    rawGrades.forEach((g) => gradesMap.set(String(g.student_id), g));

    const totalAprobados = students.filter((s) => (gradesMap.get(String(s.id))?.condicion || "Aprobado") === "Aprobado").length || (students.length || 1);
    const totalReprobados = students.length > 0 ? students.length - totalAprobados : 0;

    const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(courseName);
    const folderPath = `${baseCourseFolder}/03_Legalizacion`;
    const dateText = this.getSpanishDateText();

    // 1. Oficio de Legalización (.docx)
    onProgress?.("Oficio de Legalización (.docx)", 1, 3);
    const oficioNum = startOficioNumber || storeConfig.secuenciales?.oficios || (await this.getNextOficioNumber());
    const oficioFormatted = `2026-${oficioNum}`;
    const oficioLegalizacionPath = `${folderPath}/01_Oficio_Legalizacion.docx`;
    const numTram = numeroTramite || "00";

    await WordGenerator.getInstance().generateOficioLegalizacion(
      {
        curso: courseName,
        cursoId: courseId,
        course: storeCurso || dbCourse,
        students: students,
        estudiantes: storeStudents.length > 0 ? storeStudents : students,
        fecha: `Quito, ${dateText}`,
        oficio_numero: oficioFormatted,
        oficioNumero: oficioFormatted,
        numeroTramite: numTram,
        numero_tramite: numTram,
        tramiteNumero: numTram,
      },
      oficioLegalizacionPath
    );

    // 2. Anexo Legalización ANT (.xlsx)
    onProgress?.("Anexo Legalización ANT (.xlsx)", 2, 3);
    const anexoLegalizacionAntPath = `${folderPath}/02_Anexo_Legalizacion_ANT.xlsx`;
    await ExcelGenerator.getInstance().generateAnexoLegalizacion(
      { courseName, students },
      anexoLegalizacionAntPath
    );

    // 3. Base Datos Legalización (.xlsx)
    onProgress?.("Base Datos Legalización (.xlsx)", 3, 3);
    const baseDatosLegalizacionPath = `${folderPath}/03_Base_Datos_Legalizacion.xlsx`;
    await ExcelGenerator.getInstance().generateBaseLegalizacion(
      { courseName, students },
      baseDatosLegalizacionPath
    );

    console.log("[GeneratePhase3DocumentsUseCase] Fase 3 completada con éxito en:", folderPath);

    return {
      folderPath,
      oficioLegalizacionPath,
      anexoLegalizacionAntPath,
      baseDatosLegalizacionPath,
    };
  }
}
