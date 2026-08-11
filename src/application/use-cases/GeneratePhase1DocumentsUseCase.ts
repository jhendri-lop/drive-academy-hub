import { SQLiteCourseRepository } from "@/infrastructure/database/repositories/SQLiteCourseRepository";
import { SQLiteStudentRepository } from "@/infrastructure/database/repositories/SQLiteStudentRepository";
import { SQLitePaymentRepository } from "@/infrastructure/database/repositories/SQLitePaymentRepository";
import { SQLiteConfigRepository } from "@/infrastructure/database/repositories/SQLiteConfigRepository";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { useApp } from "@/lib/store";

export interface Phase1DocumentsResult {
  folderPath: string;
  oficioAutorizacionPath: string;
  oficioCompraPath: string;
  excelPermisosAntPath: string;
  anexoPermisosPath: string;
  baseGeneralPath?: string;
}

export class GeneratePhase1DocumentsUseCase {
  private courseRepo = new SQLiteCourseRepository();
  private studentRepo = new SQLiteStudentRepository();
  private paymentRepo = new SQLitePaymentRepository();
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
    startOficioNumber?: number
  ): Promise<Phase1DocumentsResult> {
    console.log("[GeneratePhase1DocumentsUseCase] Iniciando generación de Fase 1 para cursoId:", courseId);

    // 1. Cargar datos del curso (con fallback a Zustand)
    const dbCourse = await this.courseRepo.findById(courseId);
    const storeCurso = useApp.getState().cursos.find((c) => c.id === courseId);

    const courseName = dbCourse?.courseName || storeCurso?.nombre || "Curso Conducción";
    const licenseType = dbCourse?.licenseType || storeCurso?.tipoLicencia || "B";
    const oficioPrefix = dbCourse?.oficioPrefix || "OF";
    const oficioYear = dbCourse?.oficioYear || new Date().getFullYear();
    const startDate = (dbCourse as any)?.startDate || storeCurso?.inicioCurso || "27/07/2026";
    const endDate = (dbCourse as any)?.endDate || storeCurso?.finCurso || "4/08/2026";

    // 2. Cargar estudiantes (con fallback)
    const dbStudents = await this.studentRepo.findByCourseId(courseId);
    const storeStudents = useApp.getState().estudiantes.filter((e) => e.cursoId === courseId);

    const students = (dbStudents.length > 0 ? dbStudents : storeStudents).map((s: any) => {
      const matchStore = storeStudents.find((st) => st.id === s.id || st.cedula === s.cedula);
      return {
        id: s.id,
        courseId: s.courseId || s.cursoId,
        cedula: s.cedula,
        fullName: s.fullName || s.nombres,
        nombres: s.nombres || s.fullName,
        nationality: s.nationality || s.nacionalidad || "Ecuatoriana",
        bloodType: s.bloodType || s.tipoSangre,
        sex: s.sex || s.sexo,
        birthDate: s.birthDate || s.fechaNacimiento,
        fechaMatricula: s.fechaMatricula || matchStore?.fechaMatricula,
        age: s.age || s.edad,
        address: s.address || s.direccion,
        phone: s.phone || s.celular,
        email: s.email || s.correo,
        educationLevel: s.educationLevel || s.nivelInstruccion || s.education_level,
        horarioTeoria: s.horarioTeoria || matchStore?.horarioTeoria || "20H00-22H00",
        theorySchedule: s.theorySchedule || s.horarioTeoria || matchStore?.horarioTeoria || "20H00-22H00",
        horarioPractica: s.horarioPractica || s.practiceSchedule || (s as any).horarioPractico || matchStore?.horarioPractica || "14H00-16H00",
        practiceSchedule: s.practiceSchedule || s.horarioPractica || (s as any).horarioPractico || matchStore?.horarioPractica || "14H00-16H00",
        totalAmount: s.totalAmount || s.valorTotal,
        paymentAmount: s.paymentAmount || s.abono,
        balance: s.balance || s.saldo,
        status: s.status || s.estado || "Activo",
      };
    });

    const payments = await this.paymentRepo.findByCourseId(courseId).catch(() => []);
    const storeConfig = useApp.getState().config;

    const schoolName = storeConfig.escuela.nombre || "Zentriumph-DriveOfice";
    const schoolRuc = storeConfig.escuela.ruc || "1791234567001";
    const address = storeConfig.escuela.direccion || "Av. Amazonas N34-120";
    const phone = storeConfig.escuela.telefono || "02 250 4477";
    const email = storeConfig.escuela.correo || "info@driveacademy.ec";
    const antDirectorName = storeConfig.firmas?.directorAnt?.nombre || "Dr. Luis Paredes";
    const antDirectorTitle = storeConfig.firmas?.directorAnt?.cargo || "Director Provincial";
    const legalRepName = storeConfig.firmas?.representante?.nombre || "Sr. Jorge Bastidas";

    console.log("[GeneratePhase1DocumentsUseCase] Datos consolidados:", { courseName, studentsCount: students.length });

    const baseCourseFolder = await LocalFileStorage.getInstance().getCourseFolderPath(courseName);
    const folderPath = `${baseCourseFolder}/01_Permisos`;
    const dateText = this.getSpanishDateText();

    // Determinar números de oficio iniciales
    let oficioNum1 = startOficioNumber;
    if (!oficioNum1 || isNaN(oficioNum1)) {
      oficioNum1 = await this.getNextOficioNumber();
    }
    const oficioNum2 = oficioNum1 + 1;
    const nextSequentialAfter = oficioNum2 + 1;

    // Actualizar secuencial en SQLite y Zustand
    try {
      await this.sqliteClient.execute(
        `INSERT INTO sequentials (type, current_number) VALUES ('oficio', ?) ON CONFLICT(type) DO UPDATE SET current_number = ?`,
        [nextSequentialAfter, nextSequentialAfter]
      );
      useApp.getState().updateConfig({
        secuenciales: {
          ...storeConfig.secuenciales,
          oficios: nextSequentialAfter,
        },
      });
    } catch (e) {
      console.error("Error guardando secuencial oficio:", e);
    }

    // 1. Oficio Autorización (.docx)
    onProgress?.("Oficio de Autorización (.docx)", 1, 4);
    const oficioNum1Formatted = `${oficioYear}-${oficioNum1}`;
    const oficioAutorizacionPath = `${folderPath}/01_Oficio_Autorizacion_${oficioNum1Formatted}.docx`;

    await WordGenerator.getInstance().generateOficioAutorizacion(
      {
        fecha: dateText,
        oficioNumero: oficioNum1Formatted,
        directorAnt: antDirectorName,
        cargoAnt: antDirectorTitle,
        curso: courseName,
        cantidad: students.length || 1,
        categoria: licenseType,
        representante: legalRepName,
        escuela: schoolName,
        sucursal: storeConfig.escuela?.sucursal || "el Condado",
        fechaInicio: startDate,
        fechaFin: endDate,
        direccion: address,
        telefono: phone,
        email,
      },
      oficioAutorizacionPath
    );

    // 2. Oficio Compra (.docx)
    onProgress?.("Oficio de Compra de Permisos (.docx)", 2, 4);
    const oficioNum2Formatted = `${oficioYear}-${oficioNum2}`;
    const oficioCompraPath = `${folderPath}/02_Oficio_Compra_Permisos_${oficioNum2Formatted}.docx`;

    const estudiantesTabla = students.map((s) => ({
      nombre: s.fullName,
      cedula: s.cedula,
    }));

    await WordGenerator.getInstance().generateOficioCompra(
      {
        fecha: dateText,
        oficioNumero: oficioNum2Formatted,
        directorAnt: antDirectorName,
        cargoAnt: antDirectorTitle,
        curso: courseName,
        estudiantes: estudiantesTabla.length ? estudiantesTabla : [{ nombre: "Estudiante Ejemplo", cedula: "1725219412" }],
      },
      oficioCompraPath
    );

    // 3. Excel Permisos ANT (.xlsx)
    onProgress?.("Excel Permisos ANT (.xlsx)", 3, 4);
    const safeCourseName = courseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const excelPermisosAntPath = `${folderPath}/${safeCourseName}_exel_permisos_ANT.xlsx`;
    await ExcelGenerator.getInstance().generatePermisosANT(
      { courseName, schoolName, schoolRuc, students },
      excelPermisosAntPath
    );

    // 4. Anexo Permisos (.xlsx)
    onProgress?.("Anexo Permisos (.xlsx)", 4, 4);
    const anexoPermisosPath = `${folderPath}/04_PERMISOS_${safeCourseName}_ANEXO.xlsx`;
    const resOfficial = (dbCourse as any)?.resolutionAuth || storeConfig.escuela?.resolucion || "018-DE-DCTS-ANT-2013";
    await ExcelGenerator.getInstance().generateAnexoPermisos(
      {
        course: dbCourse || storeCurso || { tipoLicencia: licenseType, horarioTeoria: "18H00-20H00", inicioCurso: "2026-07-25", finCurso: "2026-09-25" },
        schoolName,
        resolutionAuth: resOfficial,
        students,
      },
      anexoPermisosPath
    );

    console.log("[GeneratePhase1DocumentsUseCase] Fase 1 completada con éxito en:", folderPath);

    return {
      folderPath,
      oficioAutorizacionPath,
      oficioCompraPath,
      excelPermisosAntPath,
      anexoPermisosPath,
    };
  }
}
