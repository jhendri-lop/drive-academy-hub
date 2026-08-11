import { SQLiteCourseRepository } from "@/infrastructure/database/repositories/SQLiteCourseRepository";
import { SQLiteStudentRepository } from "@/infrastructure/database/repositories/SQLiteStudentRepository";
import { SQLiteConfigRepository } from "@/infrastructure/database/repositories/SQLiteConfigRepository";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { useApp } from "@/lib/store";

export interface Phase2DocumentsResult {
  folderPath: string;
  acuerdoPath: string;
  fichaTeoricaPath: string;
  fichaPracticaPath: string;
  actaParte1Path: string;
  entregaDocumentosPath?: string;
}

export class GeneratePhase2DocumentsUseCase {
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

  public async execute(courseId: string, onProgress?: (step: string, current: number, total: number) => void): Promise<Phase2DocumentsResult> {
    console.log("[GeneratePhase2DocumentsUseCase] Iniciando generación de Fase 2 para cursoId:", courseId);

    // 1. Cargar curso (con fallback)
    const dbCourse = await this.courseRepo.findById(courseId);
    const storeCurso = useApp.getState().cursos.find((c) => c.id === courseId || String(c.id) === String(courseId));

    const courseName = dbCourse?.courseName || storeCurso?.nombre || "Curso Conducción";
    const licenseType = dbCourse?.licenseType || storeCurso?.tipoLicencia || "B";

    // 2. Cargar estudiantes (con fallback completo)
    const dbStudents = await this.studentRepo.findByCourseId(courseId);
    const cId = String(courseId).trim();
    const cName = String(courseName).trim().toLowerCase();
    const storeStudents = useApp.getState().estudiantes.filter((e: any) => {
      const studentCourseId = String(e.cursoId || e.courseId || "").trim();
      const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
      if (cId && studentCourseId && cId === studentCourseId) return true;
      if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
      return false;
    });

    const rawList = dbStudents.length >= storeStudents.length && dbStudents.length > 0 ? dbStudents : storeStudents;

    const students = rawList.map((s: any) => ({
      id: s.id,
      courseId: s.courseId || s.cursoId || courseId,
      cedula: s.cedula,
      fullName: s.fullName || s.nombres,
      nombres: s.nombres || s.fullName,
      nationality: s.nationality || "Ecuatoriana",
      bloodType: s.bloodType || s.tipoSangre,
      sex: s.sex || s.sexo,
      birthDate: s.birthDate || s.fechaNacimiento,
      age: s.age || s.edad,
      address: s.address || s.direccion,
      phone: s.phone || s.celular,
      email: s.email || s.correo,
      educationLevel: s.educationLevel || s.nivelInstruccion,
      theorySchedule: s.theorySchedule || s.horarioTeoria || s.horarioTeorico || "18H00-20H00",
      practiceSchedule: s.practiceSchedule || s.horarioPractico || s.horarioPractica || "14H00-15H00",
      horarioTeoria: s.horarioTeoria || s.horarioTeorico || s.theorySchedule || "18H00-20H00",
      horarioPractica: s.horarioPractica || s.horarioPractico || s.practiceSchedule || "14H00-15H00",
      totalAmount: s.totalAmount || s.valorTotal,
      paymentAmount: s.paymentAmount || s.abono,
      balance: s.balance || s.saldo,
      status: s.status || "Activo",
    }));

    const storeConfig = useApp.getState().config;
    const schoolName = storeConfig.escuela.nombre || "Zentriumph-DriveOfice";
    const schoolRuc = storeConfig.escuela.ruc || "1791234567001";

    const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(courseName);
    const folderPath = `${baseCourseFolder}/02_Curso`;
    const dateText = this.getSpanishDateText();

    // 1. Acuerdo de Enseñanza (.docx)
    onProgress?.("Acuerdos de Enseñanza (.docx)", 1, 4);
    const acuerdoPath = `${folderPath}/01_Acuerdos_Ensenanza_Todos.docx`;
    await WordGenerator.getInstance().generateAcuerdoEnsenanza(
      {
        curso: courseName,
        courseId: courseId,
        students: students,
        estudiantes: students,
        ciudad_fecha: dateText,
        nombre_estudiante: students[0]?.fullName || "Estudiante",
        cedula: students[0]?.cedula || "",
      },
      acuerdoPath
    );

    // 2. Ficha Teórica (.docx)
    onProgress?.("Fichas Teóricas (.docx)", 2, 4);
    const fichaTeoricaPath = `${folderPath}/02_Fichas_Teoricas_Todas.docx`;
    await WordGenerator.getInstance().generateFromTemplate(
      "ficha-teorica",
      {
        curso: courseName,
        students,
        nombre_estudiante: students[0]?.fullName || "Estudiante Ejemplo",
        cedula: students[0]?.cedula || "1725219412",
        materia: "Educación Vial / Mecánica Básica",
      },
      fichaTeoricaPath
    );

    // 3. Ficha Práctica por Vehículo (.xlsx)
    onProgress?.("Fichas Prácticas por Vehículo (.xlsx)", 3, 4);
    const fichaPracticaPath = `${folderPath}/03_Fichas_Practicas_Vehiculos.xlsx`;
    await ExcelGenerator.getInstance().generateFichaPractica(
      { courseName, students },
      fichaPracticaPath
    );

    // 4. Acta Parte 1 - Firmas (.docx)
    onProgress?.("Actas de Grado - Parte 1 (.docx)", 4, 4);
    const actaParte1Path = `${folderPath}/04_Actas_Grado_Parte1_Firmas.docx`;
    await WordGenerator.getInstance().generateActaParte1(
      {
        curso: courseName,
        courseId: courseId,
        students: students,
        estudiantes: students,
        numero_acta: "ACT-2026-001",
        fecha_acta: dateText,
        nombre_escuela: schoolName,
        tipo_licencia: licenseType,
      },
      actaParte1Path
    );

    console.log("[GeneratePhase2DocumentsUseCase] Fase 2 completada con éxito en:", folderPath);

    return {
      folderPath,
      acuerdoPath,
      fichaTeoricaPath,
      fichaPracticaPath,
      actaParte1Path,
    };
  }
}
