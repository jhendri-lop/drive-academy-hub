import { WordGenerator } from "@/infrastructure/documents/WordGenerator";
import { ExcelGenerator } from "@/infrastructure/documents/ExcelGenerator";
import { PDFGenerator } from "@/infrastructure/documents/PDFGenerator";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";

export class GenerateCourseDocumentsExample {
  public async execute(course: { id: string; name: string; licenseType: string }, students: any[]): Promise<{
    oficioPath: string;
    excelPath: string;
    pdfReceiptPath: string;
  }> {
    // 1. Obtener carpeta destino del curso en disco local
    const folderPath = await LocalFileStorage.getInstance().getCourseFolderPath(course.name);

    // 2. Generar Oficio de Autorización Word (.docx) a partir de la plantilla
    const oficioPath = `${folderPath}/Oficio_Autorizacion.docx`;
    await WordGenerator.getInstance().generateFromTemplate(
      "oficio-autorizacion",
      {
        fecha: new Date().toLocaleDateString("es-EC"),
        oficio_numero: "OF-2026-001",
        director_ant: "Dr. Luis Paredes",
        cargo_ant: "Director Provincial ANT",
        curso: course.name,
        cantidad: students.length,
        categoria: course.licenseType,
        representante: "Ing. Marco Villacís",
        escuela: "Zentriumph-DriveOfice",
        direccion_escuela: "Av. Amazonas N34-120",
        telefono_escuela: "02 250 4477",
        email_escuela: "info@zentriumph.ec",
      },
      oficioPath
    );

    // 3. Generar Base General Excel (.xlsx)
    const excelPath = `${folderPath}/Base_General_Estudiantes.xlsx`;
    await ExcelGenerator.getInstance().generateBaseGeneral(
      { courseName: course.name, students },
      excelPath
    );

    // 4. Generar Recibo PDF de muestra (.pdf)
    const pdfReceiptPath = `${folderPath}/Recibo_Muestra.pdf`;
    await PDFGenerator.getInstance().generateRecibo(
      {
        receiptNumber: 1001,
        date: new Date().toISOString().slice(0, 10),
        studentName: students[0]?.fullName || "Juan Pérez",
        cedula: students[0]?.cedula || "1725219412",
        concept: "Matrícula y Curso de Conducción B",
        amount: 420.0,
        paymentMethod: "Efectivo",
        courseName: course.name,
        schoolName: "Zentriumph-DriveOfice",
        schoolRuc: "1791234567001",
      },
      pdfReceiptPath
    );

    return { oficioPath, excelPath, pdfReceiptPath };
  }
}
