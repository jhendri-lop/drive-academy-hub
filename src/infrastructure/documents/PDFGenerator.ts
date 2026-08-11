import { jsPDF } from "jspdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { LocalFileStorage } from "../storage/LocalFileStorage";
import { useApp } from "@/lib/store";

export interface ReciboPDFData {
  receiptNumber: number;
  date: string;
  studentName: string;
  cedula: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  comprobanteImg?: string;
  courseName: string;
  schoolName: string;
  schoolRuc: string;
  totalAmount?: number;
  balance?: number;
  horarioTeoria?: string;
  horarioPractica?: string;
  horarioPsicologia?: string;
  cursoInicio?: string;
  cursoFin?: string;
  examenTeoricoDate?: string;
  examenPracticoDate?: string;
  contacto?: string;
}

function getRotatedVoucherBase64(base64: string): Promise<string> {
  if (typeof window === "undefined" || !base64) return Promise.resolve(base64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.translate(0, canvas.height);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export interface StudentPhotoData {
  fullName: string;
  cedula?: string;
  photoPath?: string;
}

function formatDateDMY(dateVal?: string | Date | null): string {
  if (!dateVal) return "09/08/2026";
  const str = String(dateVal).trim();
  if (!str || str === "undefined") return "09/08/2026";

  let day = 9;
  let month = 8;
  let year = 2026;

  if (str.includes("-")) {
    const rawDatePart = str.split("T")[0] || "";
    const parts = rawDatePart.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10) || 2026;
        month = parseInt(parts[1], 10) || 8;
        day = parseInt(parts[2], 10) || 9;
      } else {
        day = parseInt(parts[0], 10) || 9;
        month = parseInt(parts[1], 10) || 8;
        year = parseInt(parts[2], 10) || 2026;
      }
    }
  } else if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      if (parts[2].length === 4) {
        day = parseInt(parts[0], 10) || 9;
        month = parseInt(parts[1], 10) || 8;
        year = parseInt(parts[2], 10) || 2026;
      } else {
        year = parseInt(parts[0], 10) || 2026;
        month = parseInt(parts[1], 10) || 8;
        day = parseInt(parts[0], 10) || 9;
      }
    }
  }

  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  return `${d}/${m}/${year}`;
}

export class PDFGenerator {
  private static instance: PDFGenerator | null = null;

  private constructor() {}

  public static getInstance(): PDFGenerator {
    if (!PDFGenerator.instance) {
      PDFGenerator.instance = new PDFGenerator();
    }
    return PDFGenerator.instance;
  }

  private async drawSingleReceiptPage(doc: jsPDF, data: ReciboPDFData) {
    const storeEstudiantes = useApp.getState().estudiantes || [];
    const storeCursos = useApp.getState().cursos || [];
    const storeConfig = useApp.getState().config;

    const st = storeEstudiantes.find(
      (e) => (data.cedula && e.cedula === data.cedula) || (data.studentName && e.nombres === data.studentName)
    );
    const course = storeCursos.find(
      (c) => (st?.cursoId && c.id === st.cursoId) || (data.courseName && (c.nombre === data.courseName || c.nombre.includes(data.courseName)))
    );

    const valTotal = data.totalAmount ?? st?.valorTotal ?? 420;
    const valAbono = data.amount ?? st?.abono ?? 200;
    const valSaldo = data.balance ?? st?.saldo ?? Math.max(0, valTotal - valAbono);

    const hTeoria = data.horarioTeoria || st?.horarioTeoria || course?.horarioTeoria || "18H00-20H00";
    const hPractica = data.horarioPractica || st?.horarioPractica || course?.horarioPractica || "14H00-16H00";
    const rawPsico = data.horarioPsicologia || course?.horarioPsicologia || "08H00-12H00";
    const hPsicologiaOnlyTime = rawPsico.replace(/^sábado(s)?\s*/i, "").trim() || "08H00-12H00";

    const cInicioStr = formatDateDMY(data.cursoInicio || course?.inicioCurso || "2026-07-25");
    const cFinStr = formatDateDMY(data.cursoFin || course?.finCurso || "2026-09-25");

    const exTeoricoStr = data.examenTeoricoDate ? formatDateDMY(data.examenTeoricoDate) : cFinStr;
    const exPracticoStr = data.examenPracticoDate ? formatDateDMY(data.examenPracticoDate) : cFinStr;

    const fechaRecibo = formatDateDMY(data.date);
    const telContacto = data.contacto || storeConfig.escuela?.telefono || "02 250 4477";

    const drawBox = (offsetY: number) => {
      // 1. Marco exterior con bordes redondeados: 190mm x 69mm
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.6);
      doc.roundedRect(10, offsetY, 190, 69, 3, 3);

      // 2. Encabezado
      if (storeConfig.escuela?.logoUrl && storeConfig.escuela.logoUrl.startsWith("data:image")) {
        try {
          doc.addImage(storeConfig.escuela.logoUrl, "PNG", 14, offsetY + 3, 32, 10);
        } catch {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(20, 20, 20);
          doc.text("Alerta", 14, offsetY + 9);
          doc.setFontSize(7.5);
          doc.text("DRIVE ACADEMY S.A.", 33, offsetY + 8);
          doc.setFontSize(9);
          doc.text("Escuela de Conducción", 25, offsetY + 13);
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        doc.text("Alerta", 14, offsetY + 9);

        doc.setFontSize(7.5);
        doc.text("DRIVE ACADEMY S.A.", 33, offsetY + 8);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Escuela de Conducción", 25, offsetY + 13);
      }

      // Contacto
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text("Contacto.", 92, offsetY + 11);
      doc.setTextColor(30, 70, 180);
      doc.text(telContacto, 108, offsetY + 11);

      // RECIBO y N°
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("RECIBO", 195, offsetY + 9, { align: "right" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`N° ${String(data.receiptNumber).padStart(6, "0")}`, 195, offsetY + 13.5, { align: "right" });

      // Línea divisoria del encabezado
      doc.setLineWidth(0.4);
      doc.setDrawColor(50, 50, 50);
      doc.line(10, offsetY + 16, 200, offsetY + 16);

      // 3. Campos del Cuerpo
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);

      // Columna Izquierda:
      doc.setFont("helvetica", "normal");
      doc.text("Fecha:", 14, offsetY + 21);
      doc.setFont("helvetica", "bold");
      doc.text(fechaRecibo, 26, offsetY + 21);
      doc.line(26, offsetY + 22, 125, offsetY + 22);

      doc.setFont("helvetica", "normal");
      doc.text("Recibí de Sr. (a):", 14, offsetY + 26);
      doc.setFont("helvetica", "bold");
      doc.text(data.studentName || "—", 39, offsetY + 26);
      doc.line(39, offsetY + 27, 125, offsetY + 27);

      doc.setFont("helvetica", "normal");
      doc.text("Horario Teoría:", 14, offsetY + 31);
      doc.setFont("helvetica", "bold");
      doc.text(hTeoria, 38, offsetY + 31);
      doc.line(38, offsetY + 32, 125, offsetY + 32);

      doc.setFont("helvetica", "normal");
      doc.text("Horario Práctica:", 14, offsetY + 36);
      doc.setFont("helvetica", "bold");
      doc.text(hPractica, 39, offsetY + 36);
      doc.line(39, offsetY + 37, 125, offsetY + 37);

      // Columna Derecha:
      doc.setFont("helvetica", "normal");
      doc.text("Por:", 128, offsetY + 21);
      doc.setFont("helvetica", "bold");
      doc.text(data.concept || `Curso Tipo ${course?.tipoLicencia || "B"}`, 136, offsetY + 21);
      doc.line(136, offsetY + 22, 195, offsetY + 22);

      doc.setFont("helvetica", "normal");
      doc.text("Curso - DAI:", 128, offsetY + 26);
      doc.setFont("helvetica", "bold");
      doc.text(data.courseName || course?.nombre || "DAIC 020 2026", 148, offsetY + 26);
      doc.line(148, offsetY + 27, 195, offsetY + 27);

      doc.setFont("helvetica", "normal");
      doc.text("desde", 128, offsetY + 31);
      doc.setFont("helvetica", "bold");
      doc.text(cInicioStr, 138, offsetY + 31);
      doc.line(138, offsetY + 32, 160, offsetY + 32);

      doc.setFont("helvetica", "normal");
      doc.text("hasta", 163, offsetY + 31);
      doc.setFont("helvetica", "bold");
      doc.text(cFinStr, 173, offsetY + 31);
      doc.line(173, offsetY + 32, 195, offsetY + 32);

      doc.setFont("helvetica", "normal");
      doc.text("Exámen Teórico:", 128, offsetY + 36);
      doc.setFont("helvetica", "bold");
      doc.text(exTeoricoStr, 155, offsetY + 36);
      doc.line(155, offsetY + 37, 195, offsetY + 37);

      doc.setFont("helvetica", "normal");
      doc.text("Exámen Práctico:", 128, offsetY + 41);
      doc.setFont("helvetica", "bold");
      doc.text(exPracticoStr, 155, offsetY + 41);
      doc.line(155, offsetY + 42, 195, offsetY + 42);

      doc.setFont("helvetica", "normal");
      doc.text("Sábado psicologia y P. Auxílios:", 128, offsetY + 46);
      doc.setFont("helvetica", "bold");
      doc.text(hPsicologiaOnlyTime, 174, offsetY + 46);
      doc.line(174, offsetY + 47, 195, offsetY + 47);

      // 4. Sección Inferior: Cuadro Financiero y Firma
      const boxY = offsetY + 48;

      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, boxY, 52, 18, 2, 2);

      doc.line(14, boxY + 6, 66, boxY + 6);
      doc.line(14, boxY + 12, 66, boxY + 12);
      doc.line(30, boxY, 30, boxY + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL", 16, boxY + 4.5);
      doc.text("ABONO", 16, boxY + 10.5);
      doc.text("SALDO", 16, boxY + 16.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`$ ${valTotal.toFixed(2)}`, 63, boxY + 4.5, { align: "right" });
      doc.text(`$ ${valAbono.toFixed(2)}`, 63, boxY + 10.5, { align: "right" });
      doc.text(`$ ${valSaldo.toFixed(2)}`, 63, boxY + 16.5, { align: "right" });

      // Firma Autorizada
      doc.setLineWidth(0.4);
      doc.line(78, boxY + 12, 142, boxY + 12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("FIRMA AUTORIZADA", 110, boxY + 16, { align: "center" });
    };

    drawBox(15);

    doc.setLineWidth(0.2);
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(10, 89, 200, 89);
    doc.setLineDashPattern([], 0);

    drawBox(94);

    // Dibuja el comprobante rotado en la parte inferior si existe
    const vouchImg = data.comprobanteImg || st?.comprobanteImg;
    const isTransfOrCard =
      data.paymentMethod === "Transferencia" ||
      data.paymentMethod === "Tarjeta" ||
      (st?.formaPago && (st.formaPago === "Transferencia" || st.formaPago === "Tarjeta"));

    if (vouchImg && isTransfOrCard) {
      try {
        let finalImg = vouchImg;
        if (typeof window !== "undefined" && vouchImg.startsWith("data:image")) {
          finalImg = await getRotatedVoucherBase64(vouchImg);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`COMPROBANTE DE PAGO (${(data.paymentMethod || "TRANSFERENCIA").toUpperCase()})`, 105, 172, { align: "center" });
        const imgFormat = finalImg.includes("image/png") || finalImg.includes(".png") ? "PNG" : "JPEG";
        doc.addImage(finalImg, imgFormat, 25, 175, 160, 95);
      } catch (err) {
        console.error("Error al añadir comprobante al recibo PDF:", err);
      }
    }
  }

  public async generateRecibo(data: ReciboPDFData, outputPath: string): Promise<string> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await this.drawSingleReceiptPage(doc, data);
    const pdfBuffer = doc.output("arraybuffer");
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(pdfBuffer));
    return outputPath;
  }

  public async generateRecibosTodos(
    list: Array<ReciboPDFData>,
    outputPath: string
  ): Promise<string> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let index = 0; index < list.length; index++) {
      if (index > 0) doc.addPage();
      await this.drawSingleReceiptPage(doc, list[index]!);
    }

    const pdfBuffer = doc.output("arraybuffer");
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(pdfBuffer));
    return outputPath;
  }

  public async generateFotos3x4(
    data: { photoPath?: string; studentName?: string; students?: StudentPhotoData[] } | StudentPhotoData[],
    outputPath: string
  ): Promise<string> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Normalizar entrada de estudiantes
    let rawList: StudentPhotoData[] = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data.students && Array.isArray(data.students)) {
      rawList = data.students;
    } else if (data.studentName) {
      rawList = [{ fullName: data.studentName, photoPath: data.photoPath }];
    }

    // 1. Ordenar alfabéticamente de la A a la Z
    const sortedStudents = [...rawList].sort((a, b) =>
      (a.fullName || "").localeCompare(b.fullName || "", "es", { sensitivity: "base" })
    );

    // 2. Dos fotografías por cada estudiante
    const photoItems: StudentPhotoData[] = [];
    sortedStudents.forEach((st) => {
      photoItems.push(st);
      photoItems.push(st);
    });

    // 3. Parámetros de cuadrícula A4 (210mm x 297mm)
    const photoW = 30; // 30 mm ancho
    const photoH = 40; // 40 mm alto
    const gap = 1;     // 1 mm separación entre fotos

    const cols = 6; // 6 cols * 30 + 5 gaps * 1 = 185 mm
    const rows = 7; // 7 rows * 40 + 6 gaps * 1 = 286 mm
    const maxPerPage = cols * rows; // 42 fotos por página (21 estudiantes)

    const marginLeft = (210 - (cols * photoW + (cols - 1) * gap)) / 2; // 12.5 mm
    const marginTop = (297 - (rows * photoH + (rows - 1) * gap)) / 2;  // 5.5 mm

    if (photoItems.length === 0) {
      // Cuadrícula vacía por defecto
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.15);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = marginLeft + c * (photoW + gap);
          const y = marginTop + r * (photoH + gap);
          doc.rect(x, y, photoW, photoH);
        }
      }
    } else {
      photoItems.forEach((item, index) => {
        if (index > 0 && index % maxPerPage === 0) {
          doc.addPage();
        }

        const idxInPage = index % maxPerPage;
        const c = idxInPage % cols;
        const r = Math.floor(idxInPage / cols);

        const x = marginLeft + c * (photoW + gap);
        const y = marginTop + r * (photoH + gap);

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);

        let imageAdded = false;
        if (item.photoPath && typeof item.photoPath === "string" && item.photoPath.trim().length > 0) {
          try {
            const imgData = item.photoPath.trim();
            if (imgData.startsWith("data:image/")) {
              const formatMatch = imgData.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
              const fmt = (formatMatch && formatMatch[1]) ? formatMatch[1].toUpperCase() : "JPEG";
              doc.addImage(imgData, fmt === "JPG" ? "JPEG" : fmt, x, y, photoW, photoH);
              imageAdded = true;
            }
          } catch (e) {
            console.warn("[PDFGenerator] Error al renderizar imagen de estudiante:", e);
          }
        }

        if (!imageAdded) {
          // Fondo neutro cuando no hay foto aún
          doc.setFillColor(246, 246, 246);
          doc.rect(x, y, photoW, photoH, "F");
          doc.rect(x, y, photoW, photoH, "S");

          // Dibujar silueta sutil de foto en blanco
          doc.setDrawColor(210, 210, 210);
          doc.setFillColor(225, 225, 225);
          doc.circle(x + photoW / 2, y + 16, 6, "FD");
          doc.ellipse(x + photoW / 2, y + 34, 10, 8, "FD");
        } else {
          doc.rect(x, y, photoW, photoH, "S");
        }
      });
    }

    const pdfBuffer = doc.output("arraybuffer");
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(pdfBuffer));
    return outputPath;
  }

  public async generateTitulo(data: {
    studentName: string;
    cedula: string;
    licenseType: string;
    date: string;
    actaNumber: string;
  }, outputPath: string): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText("REPÚBLICA DEL ECUADOR", { x: 180, y: 780, size: 16, font, color: rgb(0, 0, 0) });
    page.drawText("AGENCIA NACIONAL DE TRÁNSITO", { x: 160, y: 755, size: 14, font, color: rgb(0, 0.2, 0.6) });

    page.drawText(`CONFIERE EL PRESENTE TÍTULO DE CONDUCTOR PROFESIONAL TIPO ${data.licenseType}`, {
      x: 70,
      y: 650,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`A: ${data.studentName.toUpperCase()}`, { x: 100, y: 580, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`CÉDULA: ${data.cedula}`, { x: 100, y: 550, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`ACTA N°: ${data.actaNumber}`, { x: 100, y: 520, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`FECHA DE EMISIÓN: ${data.date}`, { x: 100, y: 490, size: 11, font, color: rgb(0.2, 0.2, 0.2) });

    const pdfBytes = await pdfDoc.save();
    await LocalFileStorage.getInstance().saveFile(outputPath, pdfBytes);
    return outputPath;
  }
}
