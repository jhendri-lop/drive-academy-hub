import ExcelJS from "exceljs";
import { LocalFileStorage } from "../storage/LocalFileStorage";
import { useApp } from "@/lib/store";
import { ANEXO_PERMISOS_BASE64, PERMISOS_ANT_BASE64, ENTREGA_DOCUMENTOS_BASE64 } from "./templatesBase64";

export class ExcelGenerator {
  private static instance: ExcelGenerator | null = null;

  private constructor() {}

  public static getInstance(): ExcelGenerator {
    if (!ExcelGenerator.instance) {
      ExcelGenerator.instance = new ExcelGenerator();
    }
    return ExcelGenerator.instance;
  }

  private formatTipoSangre(tipoSangre?: string, rh?: string): string {
    const raw = (tipoSangre || "").toUpperCase().trim();
    let group = "O";
    if (raw.includes("AB")) group = "AB";
    else if (raw.includes("A")) group = "A";
    else if (raw.includes("B")) group = "B";
    else if (raw.includes("O")) group = "O";

    let sign = "+";
    if (raw.includes("-") || raw.includes("NEG") || (rh || "").toLowerCase().includes("neg")) {
      sign = "-";
    }
    return `${group}RH${sign}`;
  }

  private cleanHorarioTeoria(val?: string): string {
    if (!val) return "18H00-20H00";
    return val.replace(/^lunes\s+a\s+viernes\s*/i, "").trim();
  }

  private async readTemplateBytes(templateRelativePath: string): Promise<Uint8Array | null> {
    const cleanPath = templateRelativePath.replace(/^\/+/, "");
    const possibleUrls = [
      `/templates/${cleanPath}`,
      encodeURI(`/templates/${cleanPath}`),
      `/templates/${cleanPath.split("/").map((part) => encodeURIComponent(part)).join("/")}`,
      `./templates/${cleanPath}`,
      `templates/${cleanPath}`,
    ];

    for (const url of possibleUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        }
      } catch {
        // Continuar intentando
      }
    }

    try {
      const bytes = await LocalFileStorage.getInstance().readFile(`public/templates/${cleanPath}`);
      if (bytes && bytes.length > 0) {
        return bytes;
      }
    } catch (e) {
      console.warn(`[ExcelGenerator] No se pudo leer los bytes de la plantilla '${templateRelativePath}':`, e);
    }

    return null;
  }

  private async loadExcelTemplate(templateRelativePath: string): Promise<ExcelJS.Workbook | null> {
    const cleanPath = templateRelativePath.replace(/^\/+/, "");
    const encodedSegments = cleanPath.split("/").map((part) => encodeURIComponent(part)).join("/");

    // 1. LECTURA DIRECTA EN DISCO DURO EN TIEMPO REAL (Primera prioridad)
    try {
      const diskBytes = await LocalFileStorage.getInstance().readFile(`public/templates/${cleanPath}`);
      if (diskBytes && diskBytes.length > 0) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(diskBytes.buffer as ArrayBuffer);
        console.log(`[ExcelGenerator] LECTURA DIRECTA EN TIEMPO REAL DESDE DISCO: 'public/templates/${cleanPath}'`);
        return workbook;
      }
    } catch (err) {
      console.warn(`[ExcelGenerator] Lectura directa en disco no disponible:`, err);
    }

    // 2. LECTURA DIRECTA EN TIEMPO REAL VÍA FETCH SIN CACHÉ (Segunda prioridad)
    const possibleUrls = [
      `/templates/${encodedSegments}`,
      `/templates/${cleanPath}`,
      `./templates/${encodedSegments}`,
      `templates/${cleanPath}`,
    ];

    for (const url of possibleUrls) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          console.log(`[ExcelGenerator] LECTURA DIRECTA EN TIEMPO REAL VÍA DEV SERVER: '${url}'`);
          return workbook;
        }
      } catch {
        // Continuar intentando
      }
    }

    // 3. RESPALDO SECUNDARIO EN MEMORIA (Base64) solo si el archivo físico no existe en disco
    const isAnexo = cleanPath.toUpperCase().includes("ANEXO");
    const isANT = cleanPath.toUpperCase().includes("PERMISOS ANT") || cleanPath.toUpperCase().includes("EXEL PERMISOS ANT");
    const isEntrega = cleanPath.toUpperCase().includes("ENTREGA DE DOCUMENTOS");

    const targetB64 = isAnexo ? ANEXO_PERMISOS_BASE64 : isANT ? PERMISOS_ANT_BASE64 : isEntrega ? ENTREGA_DOCUMENTOS_BASE64 : null;

    if (targetB64) {
      try {
        const binaryString = atob(targetB64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
        console.log(`[ExcelGenerator] LECTURA DESDE RESPALDO INTEGRADO: '${cleanPath}'`);
        return workbook;
      } catch (err) {
        console.warn(`[ExcelGenerator] Error en respaldo Base64:`, err);
      }
    }

    return null;
  }

  private formatDateExcel(dateVal?: string | Date | null, fallback = "17/07/2003"): string {
    if (!dateVal) return fallback;
    const dStr = String(dateVal).trim();
    if (!dStr) return fallback;

    if (dStr.includes("/")) {
      const parts = dStr.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[0].length === 4) {
          const p2 = String(parseInt(parts[2], 10)).padStart(2, "0");
          const p1 = String(parseInt(parts[1], 10)).padStart(2, "0");
          return `${p2}/${p1}/${parts[0]}`;
        }
        const p0 = String(parseInt(parts[0], 10)).padStart(2, "0");
        const p1 = String(parseInt(parts[1], 10)).padStart(2, "0");
        return `${p0}/${p1}/${parts[2]}`;
      }
    }

    if (dStr.includes("-")) {
      const firstPart = dStr.split("T")[0] || "";
      const parts = firstPart.split("-");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[0].length === 4) {
        const p2 = String(parseInt(parts[2], 10)).padStart(2, "0");
        const p1 = String(parseInt(parts[1], 10)).padStart(2, "0");
        return `${p2}/${p1}/${parts[0]}`;
      }
    }

    const parsed = new Date(dStr);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, "0");
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}/${parsed.getFullYear()}`;
    }

    return dStr;
  }

  private formatPeriodo(startDateStr?: string, endDateStr?: string): string {
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    let dStart: Date | null = null;
    let dEnd: Date | null = null;

    if (startDateStr) {
      const str = String(startDateStr).trim();
      if (str.includes("/")) {
        const p = str.split("/");
        if (p.length === 3 && p[0] && p[1] && p[2]) {
          dStart = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
        }
      } else if (str.includes("-")) {
        const dateOnly = str.split("T")[0] || "";
        const parts = dateOnly.split("-");
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          if (parts[0].length === 4) {
            dStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
        }
      }
    }

    if (endDateStr) {
      const str = String(endDateStr).trim();
      if (str.includes("/")) {
        const p = str.split("/");
        if (p.length === 3 && p[0] && p[1] && p[2]) {
          dEnd = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
        }
      } else if (str.includes("-")) {
        const dateOnly = str.split("T")[0] || "";
        const parts = dateOnly.split("-");
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          if (parts[0].length === 4) {
            dEnd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
        }
      }
    }

    if (!dStart || isNaN(dStart.getTime())) dStart = new Date(2026, 6, 27);
    if (!dEnd || isNaN(dEnd.getTime())) dEnd = new Date(2026, 7, 4);

    const startDay = String(dStart.getDate()).padStart(2, "0");
    const startMonth = months[dStart.getMonth()] || "julio";

    const endDay = String(dEnd.getDate()).padStart(2, "0");
    const endMonth = months[dEnd.getMonth()] || "agosto";
    const endYear = dEnd.getFullYear();

    return `del ${startDay} de ${startMonth} al ${endDay} de ${endMonth} del ${endYear}`;
  }

  private addLogoAndWatermark(sheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, docKey: string): void {
    const config = useApp.getState().config;
    const logoUrl = config.escuela?.logoUrl;
    const showLogo = Boolean(config.logoDocs?.[docKey]);
    const showWatermark = Boolean(config.watermarkDocs?.[docKey]);

    if (!logoUrl) return;

    let base64Data = logoUrl;
    let extension: "png" | "jpeg" = "png";

    if (logoUrl.startsWith("data:")) {
      const parts = logoUrl.split(",");
      if (parts.length === 2 && parts[0] && parts[1]) {
        if (parts[0].includes("image/jpeg") || parts[0].includes("image/jpg")) {
          extension = "jpeg";
        }
        base64Data = parts[1];
      }
    }

    try {
      const imageId = workbook.addImage({
        base64: base64Data,
        extension,
      });

      if (showLogo) {
        sheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 130, height: 48 },
          editAs: "oneCell",
        });
      }

      if (showWatermark) {
        sheet.addImage(imageId, {
          tl: { col: 4, row: 8 },
          ext: { width: 320, height: 130 },
          editAs: "absolute",
        });
      }
    } catch (err) {
      console.error("[ExcelGenerator] Error al incrustar logo/marca de agua:", err);
    }
  }

  private replaceLogoTagInSheet(sheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook): void {
    const config = useApp.getState().config;
    const logoUrl = config.escuela?.logoUrl;
    if (!logoUrl) return;

    let base64Data = logoUrl;
    let extension: "png" | "jpeg" = "png";

    if (logoUrl.startsWith("data:")) {
      const parts = logoUrl.split(",");
      if (parts.length === 2 && parts[0] && parts[1]) {
        if (parts[0].includes("image/jpeg") || parts[0].includes("image/jpg")) {
          extension = "jpeg";
        }
        base64Data = parts[1];
      }
    }

    try {
      const imageId = workbook.addImage({
        base64: base64Data,
        extension,
      });

      sheet.eachRow({ includeEmpty: false }, (row, rIdx) => {
        row.eachCell({ includeEmpty: false }, (cell, cIdx) => {
          if (typeof cell.value === "string" && cell.value.includes("{logoEscuela}")) {
            cell.value = cell.value.replace("{logoEscuela}", "").trim();
            sheet.addImage(imageId, {
              tl: { col: cIdx - 1, row: rIdx - 1 },
              ext: { width: 140, height: 50 },
              editAs: "oneCell",
            });
          }
        });
      });
    } catch (err) {
      console.warn("[ExcelGenerator] Error al reemplazar la etiqueta {logoEscuela}:", err);
    }
  }

  // 1. Base General (Imagen 1)
  public async generateBaseGeneral(
    data: {
      courseName: string;
      schoolName?: string;
      resolutionAuth?: string;
      oficioAutorizacion?: string;
      startDate?: string;
      endDate?: string;
      students: any[];
      payments?: any[];
      prices?: Record<string, number>;
    },
    outputPath: string
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Base General");

    this.addLogoAndWatermark(sheet, workbook, "base_general");

    const school = data.schoolName || "ESCUELA DE CONDUCCION DRIVE ACADEMY ALERTA CONDADO";
    const course = data.courseName || "TIPO B DAIC 019 2026";
    const dateRange = data.startDate && data.endDate ? `DESDE EL ${data.startDate} HASTA EL ${data.endDate}` : "DESDE EL 16 HASTA EL 24 DE JULIO 2026";
    const resAuth = data.resolutionAuth || "N° 018 DCTS-ANT-2013";
    const oficioAuth = data.oficioAutorizacion || "ANT-DPPIC-2026-6528-OF";

    // Encabezados superiores
    sheet.mergeCells("A1:T1");
    const r1 = sheet.getCell("A1");
    r1.value = school.toUpperCase();
    r1.font = { bold: true, size: 12 };
    r1.alignment = { horizontal: "center" };

    sheet.getCell("A2").value = "NÓMINA DE ESTUDIANTES MATRICULADOS";
    sheet.getCell("A2").font = { bold: true, size: 10 };

    sheet.getCell("A4").value = "CURSO:";
    sheet.getCell("C4").value = course;
    sheet.getCell("A5").value = "FECHA:";
    sheet.getCell("C5").value = dateRange;
    sheet.getCell("A6").value = "No. RESOLUCIÓN:";
    sheet.getCell("C6").value = resAuth;
    sheet.getCell("A7").value = "No. OFICIO AUTORIZACIÓN INICIO DE CURSO:";
    sheet.getCell("C7").value = oficioAuth;

    ["A4", "A5", "A6", "A7"].forEach((cell) => {
      sheet.getCell(cell).font = { bold: true, size: 9 };
    });

    // Fila 8: Encabezados de tabla
    const headers = [
      "N°",
      "Apellidos y Nombres",
      "Cédula de Ciudadanía",
      "Fecha de Nacimiento",
      "EDAD",
      "Fecha de matrícula",
      "Dirección",
      "Teléfono",
      "TIPO DE SANGRE",
      "Horario Teoría Lunes a Viernes Virtual",
      "Horario Práctica Lunes a Viernes Presencial",
      "CORREO",
      "Nacionalidad",
      "Nivel de Instrucción",
      "Observaciones",
      "FC",
      "FORMA DE PAGO",
      "Comprobante N°",
      "VALOR TOTAL",
      "ABONO",
      "SALDO",
    ];

    sheet.getRow(8).values = headers;
    sheet.getRow(8).font = { bold: true, size: 9 };
    sheet.getRow(8).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getRow(8).height = 35;

    headers.forEach((_, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      sheet.getColumn(idx + 1).width = idx === 1 ? 32 : idx === 11 ? 25 : idx === 12 ? 22 : 16;
    });

    data.students.forEach((s, i) => {
      const rIdx = i + 9;
      const row = sheet.getRow(rIdx);
      const defaultTotal = (data.prices && data.prices[s.tipoLicencia || "B"]) || 150;

      const rawTotal = s.valorTotal ?? s.valor_total ?? s.totalCost ?? s.total_cost;
      const totalVal = Number(rawTotal !== undefined && rawTotal !== null ? rawTotal : defaultTotal);

      const rawAbono = s.abono ?? s.amountPaid ?? s.amount_paid;
      const abonoVal = Number(rawAbono !== undefined && rawAbono !== null ? rawAbono : totalVal);

      const rawFormaPago = s.formaPago ?? s.forma_pago ?? s.paymentMethod ?? s.payment_method ?? "EFECTIVO";
      const formaPagoStr = String(rawFormaPago || "EFECTIVO").toUpperCase();

      const rawHorarioTeoria = s.horarioTeoria ?? s.horario_teoria ?? s.theorySchedule ?? s.theory_schedule ?? "18H00-20H00";
      const cleanTeoria = this.cleanHorarioTeoria(String(rawHorarioTeoria).split("|")[0]!.trim());

      const rawHorarioPractica = s.horarioPractica ?? s.horarioPractico ?? s.horario_practica ?? s.horario_practico ?? s.practiceSchedule ?? s.practice_schedule ?? "14H00-16H00";
      const cleanPractica = String(rawHorarioPractica).split("|")[0]!.trim();

      const comprobanteVal = s.comprobante ?? s.comprobanteNumero ?? s.voucherNumber ?? s.receiptNumber ?? s.receipt_number ?? "";

      row.values = [
        i + 1,
        (s.nombres || s.fullName || "").toUpperCase(),
        s.cedula || "",
        this.formatDateExcel(s.fechaNacimiento || s.birthDate, "17/7/2003"),
        s.edad || s.age || 23,
        this.formatDateExcel(s.fechaMatricula || s.enrollmentDate || s.created_at, "10/7/2026"),
        (s.direccion || s.address || "CIUDAD BICENTENARIO").toUpperCase(),
        s.celular || s.phone || s.telefono || "0992505946",
        this.formatTipoSangre(s.tipoSangre || s.bloodType, s.rh),
        cleanTeoria,
        cleanPractica,
        (s.correo || s.email || "").toLowerCase(),
        (s.nacionalidad || s.nationality || "ECUATORIANA").toUpperCase(),
        (s.nivelInstruccion || s.educationLevel || "-").toUpperCase(),
        s.observaciones || "ADJUNTO TÍTULO DE BACHILLER",
        s.fc || s.secuencial || "9304",
        formaPagoStr,
        comprobanteVal,
        totalVal,
        abonoVal,
        { formula: `S${rIdx}-T${rIdx}` },
      ];

      row.font = { size: 9 };
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9EAD3" }, // Verde suave exacto como Imagen 1
      };

      for (let c = 1; c <= 21; c++) {
        row.getCell(c).border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      }

      row.getCell(19).numFmt = "$#,##0.00";
      row.getCell(20).numFmt = "$#,##0.00";
      row.getCell(21).numFmt = "$#,##0.00";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    return outputPath;
  }

  // 2. Anexo Permisos
  public async generateAnexoPermisos(
    data: { course: any; schoolName?: string; resolutionAuth?: string; oficioAutorizacion?: string; students: any[] },
    outputPath: string
  ): Promise<string> {
    const storeConfig = useApp.getState().config;
    const escuelaNombre = storeConfig.escuela?.nombre || "DRIVE ACADEMY S.A.";
    const escuelaSucursal = storeConfig.escuela?.sucursal || "CONDADO";
    const schoolFull = `${escuelaNombre.toUpperCase()} SUCURSAL - ${escuelaSucursal.toUpperCase()}`;

    const workbook = await this.loadExcelTemplate("Fase 1/PERMISOS DAIC 019-26 ANEXO.xlsx");
    if (!workbook) {
      throw new Error("No se pudo cargar la plantilla PERMISOS DAIC 019-26 ANEXO.xlsx");
    }

    // 1. Eliminar hojas secundarias de borrador/ejemplo que traía la plantilla (Hoja2, Hoja3)
    while (workbook.worksheets.length > 1) {
      const extraSheet = workbook.worksheets[1];
      if (extraSheet) {
        workbook.removeWorksheet(extraSheet.id);
      } else {
        break;
      }
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("No se encontró ninguna hoja en la plantilla PERMISOS DAIC 019-26 ANEXO.xlsx");
    }
    sheet.name = "Anexo Permisos";

    const course = data.course?.nombre || data.course?.courseName || "DAIC 019 2026";
    const tipoLicencia = data.course?.tipoLicencia || data.course?.licenseType || "B";
    const rawRes = storeConfig.escuela?.resolucion || data.resolutionAuth || "018-DE-DCTS-ANT-2013";
    const cleanRes = String(rawRes).replace(/^N[°º]\s*/i, "").trim();
    const oficioAuth = data.oficioAutorizacion || (storeConfig as any).oficioMatriz || "ANT-DPPIC-2026-6528-OF";

    const directorNombre = (data as any).directorName || storeConfig?.firmas?.director?.nombre || "Ing. Marlon Ortuño";
    const directorCargo = (data as any).directorCargo || storeConfig?.firmas?.director?.cargo || "DIRECTOR GENERAL ADMINISTRATIVO";
    const secretariaNombre = (data as any).secretariaName || storeConfig?.firmas?.secretaria?.nombre || "Karolina Bermeo";
    const secretariaCargo = (data as any).secretariaCargo || storeConfig?.firmas?.secretaria?.cargo || "SECRETARIA ACADEMICA";

    // 1. Escanear y reemplazar todas las etiquetas {etiqueta} respetando la plantilla original
    this.replaceLogoTagInSheet(sheet, workbook);

    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value === "string" && cell.value.includes("{")) {
          let text = cell.value;
          text = text.replace(/\{tipoLicencia\}/gi, tipoLicencia);
          text = text.replace(/\{cursoNombre\}|\{course\}/gi, course);
          text = text.replace(/\{resolucionAnt\}|\{resAuth\}|\{resolucion\}/gi, cleanRes);
          text = text.replace(/\{oficioMatriz\}|\{oficioAuth\}/gi, oficioAuth);
          text = text.replace(/\{escuelaNombre\}/gi, escuelaNombre);
          text = text.replace(/\{escuelaSucursal\}/gi, escuelaSucursal);
          text = text.replace(/\{directorNombre\}/gi, directorNombre);
          text = text.replace(/\{directorCargo\}/gi, directorCargo);
          text = text.replace(/\{secretariaNombre\}/gi, secretariaNombre);
          text = text.replace(/\{secretariaCargo\}/gi, secretariaCargo);
          cell.value = text;
        }
      });
    });

    // Fijar explícitamente el valor en la celda C5 (No. RESOLUCIÓN)
    sheet.getCell("C5").value = `Nº ${cleanRes}`;

    // 2. Llenar filas de estudiantes a partir de la fila 9 desplazando automáticamente las firmas hacia abajo
    const templateRow = sheet.getRow(9);

    data.students.forEach((s, i) => {
      const rIdx = 9 + i;

      // Para estudiantes del 2° en adelante (i > 0), insertar una fila física nueva desplazando las firmas hacia abajo
      if (i > 0) {
        sheet.spliceRows(rIdx, 0, []);
      }

      const row = sheet.getRow(rIdx);

      const nVal = i + 1;
      const escuelaVal = schoolFull;
      const nombreVal = (s.nombres || s.fullName || "").toUpperCase();
      const cedulaVal = s.cedula || "";
      const fechaNacVal = this.formatDateExcel(s.fechaNacimiento || s.birthDate, "17/07/2003");
      const fechaMatVal = this.formatDateExcel(s.fechaMatricula || s.enrollmentDate, "20/07/2026");
      const tipoVal = tipoLicencia;
      const rawTeoria = s.horarioTeoria || s.horarioTeorico || s.theorySchedule || data.course?.horarioTeoria || "20H00-22H00";
      const rawPractica = s.horarioPractica || s.horarioPractico || s.practiceSchedule || data.course?.horarioPractica || "14H00-16H00";

      let cleanTeoria = String(rawTeoria).trim();
      if (cleanTeoria.includes("|")) {
        cleanTeoria = cleanTeoria.split("|")[0]!.trim();
      }
      const horTeoriaVal = this.cleanHorarioTeoria(cleanTeoria);

      let cleanPractica = String(rawPractica).trim();
      if (cleanPractica.includes("|")) {
        cleanPractica = cleanPractica.split("|")[0]!.trim();
      }
      const horPractVal = cleanPractica;

      const inicioVal = this.formatDateExcel(data.course?.inicioCurso || data.course?.startCourseDate, "16/07/2026");
      const finVal = this.formatDateExcel(data.course?.finCurso || data.course?.endCourseDate, "24/07/2026");
      const nivelVal = s.nivelInstruccion || s.educationLevel || s.education_level || "-";
      const obsVal = "ADJUNTO TÍTULO DE BACHILLER";

      const vals = [
        nVal, escuelaVal, nombreVal, cedulaVal, fechaNacVal, fechaMatVal,
        tipoVal, horTeoriaVal, horPractVal, inicioVal, finVal, nivelVal, obsVal
      ];

      // Adaptar la altura de la fila según la longitud del texto (1 o 2 renglones)
      const maxLen = Math.max(String(nombreVal).length, String(escuelaVal).length);
      const rowHeightNeeded = maxLen > 32 ? 34 : 26;
      row.height = templateRow.height ? Math.max(templateRow.height, rowHeightNeeded) : rowHeightNeeded;

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c);
        cell.value = vals[c - 1];

        // Preservar/clonar el estilo de celda nativo de la plantilla
        const tCell = templateRow.getCell(c);
        if (tCell.font) cell.font = JSON.parse(JSON.stringify(tCell.font));
        if (tCell.border) cell.border = JSON.parse(JSON.stringify(tCell.border));
        if (tCell.fill) cell.fill = JSON.parse(JSON.stringify(tCell.fill));

        // Alineación adaptada de la Fila 9 con ajuste de texto habilitado para 2 renglones
        const baseAlign = tCell.alignment ? JSON.parse(JSON.stringify(tCell.alignment)) : {};
        cell.alignment = {
          ...baseAlign,
          wrapText: true,
          vertical: "middle",
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Anexo Permisos generado 100% sobre la plantilla original:", outputPath);
    return outputPath;
  }

  // 3. Entrega de Documentos (Fase 4)
  public async generateEntregaDocumentos(
    data: {
      courseName: string;
      schoolName?: string;
      startDate?: string;
      endDate?: string;
      periodo?: string;
      students: any[];
    },
    outputPath: string
  ): Promise<string> {
    const storeConfig = useApp.getState().config;
    const escuelaNombre = data.schoolName || storeConfig.escuela?.nombre || "DRIVE ACADEMY";
    const cursoNombre = data.courseName || "DAIC 020 2026";
    const periodoText = data.periodo || this.formatPeriodo(data.startDate, data.endDate);

    let workbook = await this.loadExcelTemplate("Fase 4/ENTREGA DE DOCUMENTOS FORMATO.xlsx");

    if (!workbook) {
      workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Entrega Documentos");
      sheet.getCell("E3").value = escuelaNombre;
      sheet.getCell("E5").value = "ENTREGA DE DOCUMENTOS";
      sheet.getCell("C6").value = `CURSO: ${cursoNombre}`;
      sheet.getCell("C7").value = `PERIODO: ${periodoText}`;
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("No se encontró la hoja de trabajo en la plantilla de Entrega de Documentos.");
    }

    this.replaceLogoTagInSheet(sheet, workbook);

    // 1. Reemplazar marcadores globales en el encabezado
    sheet.eachRow({ includeEmpty: false }, (row, rIdx) => {
      if (rIdx < 9) {
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (typeof cell.value === "string" && cell.value.includes("{")) {
            let text = cell.value;
            text = text.replace(/\{escuelaNombre\}/gi, escuelaNombre);
            text = text.replace(/\{cursoNombre\}/gi, cursoNombre);
            text = text.replace(/\{periodo\}/gi, periodoText);
            cell.value = text;
          }
        });
      }
    });

    // 2. Ordenar estudiantes alfabéticamente A-Z
    const sorted = [...data.students].sort((a: any, b: any) => {
      const nameA = (a.fullName || a.nombres || a.nombre_estudiante || a.nombre || "").trim().toUpperCase();
      const nameB = (b.fullName || b.nombres || b.nombre_estudiante || b.nombre || "").trim().toUpperCase();
      return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
    });

    // 3. Identificar fila modelo (por defecto fila 10)
    let modelRowIndex = 10;
    sheet.eachRow({ includeEmpty: false }, (row, rIdx) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value === "string" && (cell.value.includes("{estudianteNombre}") || cell.value.includes("{n}"))) {
          modelRowIndex = rIdx;
        }
      });
    });

    const modelRow = sheet.getRow(modelRowIndex);
    const modelRowHeight = modelRow.height || 22;
    const modelPermisoPattern = typeof modelRow.getCell(5)?.value === "string" ? String(modelRow.getCell(5).value) : "PDA-2026-{numeroPermiso}";

    // Capturar bordes y estilos de la fila modelo de la plantilla original (Fila 10)
    const modelCellBorders: Array<any> = [];
    const modelCellStyles: Array<{ font?: any; alignment?: any; fill?: any }> = [];
    for (let colIdx = 2; colIdx <= 7; colIdx++) {
      const srcCell = modelRow.getCell(colIdx);
      modelCellBorders[colIdx] = srcCell.border ? JSON.parse(JSON.stringify(srcCell.border)) : null;
      modelCellStyles[colIdx] = {
        font: srcCell.font ? JSON.parse(JSON.stringify(srcCell.font)) : undefined,
        alignment: srcCell.alignment ? JSON.parse(JSON.stringify(srcCell.alignment)) : undefined,
        fill: srcCell.fill ? JSON.parse(JSON.stringify(srcCell.fill)) : undefined,
      };
    }

    const solidBlackBorder: any = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    sorted.forEach((st: any, idx: number) => {
      const targetRowIndex = modelRowIndex + idx;
      const targetRow = sheet.getRow(targetRowIndex);

      const rawPermiso = st.numeroPermiso ?? st.permisoAprendizaje ?? st.numero_permiso ?? st.permiso ?? "0";
      const cleanPermiso = String(rawPermiso).replace(/^PERM-?/i, "").trim() || "0";

      const nameStr = (st.fullName || st.nombres || st.nombre_estudiante || st.nombre || "").toUpperCase();
      const cedulaStr = st.cedula || st.pasaporte || st.numeroDocumento || "";

      let permisoCellValue = cleanPermiso;
      if (modelPermisoPattern.includes("{numeroPermiso}")) {
        permisoCellValue = modelPermisoPattern.replace(/\{numeroPermiso\}/gi, cleanPermiso);
      } else if (modelPermisoPattern.includes("{permisoAprendizaje}")) {
        permisoCellValue = modelPermisoPattern.replace(/\{permisoAprendizaje\}/gi, cleanPermiso);
      }

      const cellValues = [
        idx + 1,
        nameStr,
        cedulaStr,
        permisoCellValue,
        "",
        "",
      ];

      // Columna A (Col 1): Sin bordes ni relleno
      const cellA = targetRow.getCell(1);
      cellA.value = null;
      (cellA as any).border = null;
      (cellA as any).fill = null;

      // Columnas B a G (Cols 2 a 7): Llenar valores y ASIGNAR RECUADRO NEGRO INDEPENDIENTE
      for (let colIdx = 2; colIdx <= 7; colIdx++) {
        const cell = targetRow.getCell(colIdx);
        cell.value = cellValues[colIdx - 2];

        const stObj = modelCellStyles[colIdx];
        if (stObj) {
          if (stObj.font) cell.font = JSON.parse(JSON.stringify(stObj.font));
          if (stObj.alignment) cell.alignment = JSON.parse(JSON.stringify(stObj.alignment));
          if (stObj.fill) cell.fill = JSON.parse(JSON.stringify(stObj.fill));
        }

        // Desvincular de estilo compartido asignando un nuevo objeto de estilo con borde negro sólido
        cell.style = Object.assign({}, cell.style, { border: solidBlackBorder as Partial<ExcelJS.Borders> });
      }

      // Columnas H a Z (Cols 8 a 30): Eliminar cualquier línea o borde sobrante a la derecha
      for (let colIdx = 8; colIdx <= 30; colIdx++) {
        const cell = targetRow.getCell(colIdx);
        cell.value = null;
        (cell as any).border = null;
        (cell as any).fill = null;
      }

      targetRow.height = modelRowHeight;
    });

    // Limpiar explícitamente cualquier recuadro o bordes sobrantes debajo del último estudiante activo
    const lastStudentRowIndex = modelRowIndex + sorted.length - 1;
    const maxRowToClean = Math.max(sheet.rowCount, lastStudentRowIndex + 50);
    for (let rIdx = lastStudentRowIndex + 1; rIdx <= maxRowToClean; rIdx++) {
      const row = sheet.getRow(rIdx);
      row.values = [];
      for (let colIdx = 1; colIdx <= 30; colIdx++) {
        const cell = row.getCell(colIdx);
        cell.value = null;
        (cell as any).border = null;
        (cell as any).fill = null;
      }
      (row as any).height = undefined;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Entrega de Documentos generado con éxito (recuadros negros independientes):", outputPath);
    return outputPath;
  }

  // 4. Permisos ANT
  public async generatePermisosANT(
    data: { courseName: string; schoolName?: string; schoolRuc?: string; schoolBranch?: string; students: any[] },
    outputPath: string
  ): Promise<string> {
    const storeConfig = useApp.getState().config;
    const ruc = data.schoolRuc || storeConfig.escuela?.ruc || "1791835999001";
    const escuelaSucursal = storeConfig.escuela?.sucursal || "CONDADO";
    const escuelaNombre = storeConfig.escuela?.nombre || "DRIVE ACADEMY S.A.";
    const escuelaFull = data.schoolBranch || `${escuelaNombre.toUpperCase()} SUCURSAL - ${escuelaSucursal.toUpperCase()}`;

    let workbook = await this.loadExcelTemplate("Fase 1/DAIC-019-2026 exel permisos ANT.xlsx");

    if (!workbook) {
      workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Permisos ANT");
      const headers = ["Ruc", "Escuela", "Identificacion", "Nombres", "Nacionalidad", "TipoSangre", "Domicilio", "Telefono", "Email", "Canton"];
      sheet.getRow(1).values = headers;
      sheet.getRow(1).font = { bold: true, size: 10 };
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("No se encontró la hoja de trabajo en la plantilla Permisos ANT.");
    }

    // 1. Escanear y reemplazar etiquetas {etiqueta} globales en la plantilla
    this.replaceLogoTagInSheet(sheet, workbook);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value === "string" && cell.value.includes("{")) {
          let text = cell.value;
          text = text.replace(/\{escuelaRuc\}/gi, ruc);
          text = text.replace(/\{escuelaSucursal\}/gi, escuelaSucursal);
          text = text.replace(/\{escuelaNombre\}/gi, escuelaNombre);
          cell.value = text;
        }
      });
    });

    // 2. Fila modelo de la plantilla (Fila 2)
    const templateRow = sheet.getRow(2);
    const templateEscuelaCellVal = templateRow ? String(templateRow.getCell(2).value || "") : "";

    data.students.forEach((s, i) => {
      const rIdx = i + 2;
      const row = sheet.getRow(rIdx);

      const rucVal = ruc;

      // Evaluar la celda de escuela si el usuario colocó prefijo en su plantilla (ej. "ALERTA- {escuelaSucursal}")
      let escuelaVal = `ALERTA- ${escuelaSucursal}`;
      if (templateEscuelaCellVal && templateEscuelaCellVal.includes("{")) {
        escuelaVal = templateEscuelaCellVal
          .replace(/\{escuelaSucursal\}/gi, escuelaSucursal)
          .replace(/\{escuelaNombre\}/gi, escuelaNombre)
          .replace(/\{escuelaRuc\}/gi, ruc);
      }

      const cedulaVal = s.cedula || "";
      const nombresVal = (s.nombres || s.fullName || "").toUpperCase();
      const nacVal = (s.nacionalidad || "ECUATORIANA").toUpperCase();
      const sangreVal = this.formatTipoSangre(s.tipoSangre || s.bloodType, s.rh);
      const domVal = (s.direccion || s.address || "CONDADO").toUpperCase();
      const telVal = s.celular || s.phone || s.telefono || "";
      const emailVal = (s.correo || s.email || "").toLowerCase();
      const cantonVal = (s.canton || storeConfig.escuela?.canton || "QUITO").toUpperCase();

      const vals = [rucVal, escuelaVal, cedulaVal, nombresVal, nacVal, sangreVal, domVal, telVal, emailVal, cantonVal];

      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.value = vals[c - 1];

        // Clonar estilo nativo de la plantilla para filas agregadas (i > 0)
        if (i > 0 && templateRow) {
          const tCell = templateRow.getCell(c);
          if (tCell.font) cell.font = JSON.parse(JSON.stringify(tCell.font));
          if (tCell.border) cell.border = JSON.parse(JSON.stringify(tCell.border));
          if (tCell.alignment) cell.alignment = JSON.parse(JSON.stringify(tCell.alignment));
          if (tCell.fill) cell.fill = JSON.parse(JSON.stringify(tCell.fill));
        }
        // NOTA: Para i === 0 NO se toca cell.alignment para respetar 100% la alineación de tu plantilla en Excel
      }
      row.height = 20;
    });

    // Limpiar filas sobrantes de la plantilla original (si el curso tiene menos estudiantes que el ejemplo)
    const lastStudentRow = 1 + data.students.length;
    for (let r = lastStudentRow + 1; r <= 35; r++) {
      for (let c = 1; c <= 10; c++) {
        sheet.getRow(r).getCell(c).value = null;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Permisos ANT generado 100% sobre la plantilla original:", outputPath);
    return outputPath;
  }

  private subtractOneDayExcel(dateStr?: string): string {
    if (!dateStr) return "23/07/2026";
    const str = String(dateStr).trim();
    if (!str || str === "undefined") return "23/07/2026";

    let year = 2026;
    let month = 7;
    let day = 24;

    if (str.includes("-")) {
      const firstPart = str.split("T")[0] || "";
      const parts = firstPart.split("-").map(Number);
      if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
        if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        }
      }
    } else if (str.includes("/")) {
      const parts = str.split("/").map(Number);
      if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
        if (parts[2] > 1000) {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        } else if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[0];
        }
      }
    }

    const dt = new Date(year, month - 1, day);
    dt.setDate(dt.getDate() - 1);

    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = dt.getFullYear();

    return `${d}/${m}/${y}`;
  }

  // 4. Anexo Legalización ANT (.xlsx)
  public async generateAnexoLegalizacion(data: { courseName?: string; course?: any; students: any[] }, outputPath: string): Promise<string> {
    const storeConfig = useApp.getState().config;
    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    const targetCourseName = data.courseName || data.course?.nombre || "DAIC 020 2026";
    const targetCourse = storeCursos.find((c: any) => c.nombre === targetCourseName || c.nombre.includes(targetCourseName)) || data.course || {};

    const escuelaNombre = storeConfig.escuela?.nombre || "DRIVE ACADEMY S.A.";
    const escuelaSucursal = storeConfig.escuela?.sucursal || "CONDADO";
    const ruc = storeConfig.escuela?.ruc || "1791835999001";
    const rawResAnexo = targetCourse.resolucion || targetCourse.resolucionAnt || storeConfig.escuela?.resolucion;
    const resolucion = (!rawResAnexo || rawResAnexo === "ANT-DE-2024-0187") ? "18 DCTS-ANT-2013" : rawResAnexo;
    const tipoLicencia = targetCourse.tipoLicencia || "B";

    const cInicio = this.formatDateExcel(targetCourse.inicioCurso || targetCourse.startCourseDate, "27/07/2026");
    const cFin = this.formatDateExcel(targetCourse.finCurso || targetCourse.endCourseDate, "04/08/2026");

    let sourceStudents = Array.isArray(data.students) && data.students.length > 0 ? data.students : storeEstudiantes;
    if (sourceStudents.length === 0) sourceStudents = [{}];

    let workbook = await this.loadExcelTemplate("Fase 3/DAIC 019 2026 anexo legalizacion ANT.xlsx");
    if (!workbook) {
      workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Anexo Legalización");
      const headers = ["N°", "Cédula", "Nombres Completos", "Promedio Teórico", "Nota Práctica", "Estado Final"];
      sheet.getRow(1).values = headers;
      sheet.getRow(1).font = { bold: true, size: 10 };
      sourceStudents.forEach((s, i) => {
        sheet.addRow([i + 1, s.cedula, (s.nombres || s.fullName || "").toUpperCase(), s.promedioTeorico || 20, s.notaPractica || 20, s.condicion || "Aprobado"]);
      });
      const buffer = await workbook.xlsx.writeBuffer();
      await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
      return outputPath;
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("Hoja de trabajo no encontrada en la plantilla Anexo Legalización.");
    }

    sheet.name = "Anexo Legalización";

    // Reemplazar etiquetas de encabezado
    this.replaceLogoTagInSheet(sheet, workbook);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.master && cell.address !== cell.master.address) return;
        if (typeof cell.value === "string" && cell.value.includes("{")) {
          let text = cell.value;
          text = text.replace(/\{escuelaNombre\}/gi, escuelaNombre);
          text = text.replace(/\{escuelaSucursal\}/gi, escuelaSucursal);
          text = text.replace(/\{escuelaRuc\}/gi, ruc);
          text = text.replace(/\{resolucionAnt\}|\{resolucion\}/gi, resolucion);
          text = text.replace(/\{cursoNombre\}|\{curso\}/gi, targetCourseName);
          cell.value = text;
        }
      });
    });

    const templateRow = sheet.getRow(2);

    sourceStudents.forEach((s: any, i: number) => {
      const rIdx = i + 2;
      const row = sheet.getRow(rIdx);

      const docTypeRaw = String(s.tipoDocumento || s.documentoTipo || s.tipo_documento || "Cédula").trim();
      const isPasaporte = docTypeRaw.toLowerCase().includes("pasaporte");
      const tipoDocNombre = isPasaporte ? "Pasaporte" : "Cédula";
      const cedulaVal = s.cedula || s.pasaporte || s.numeroDocumento || "";
      const nombreVal = (s.nombres || s.fullName || s.estudianteNombre || "").toUpperCase();
      const nacVal = (s.nacionalidad || "ECUATORIANA").toUpperCase();
      const fnVal = this.formatDateExcel(s.fechaNacimiento || s.birthDate, "12/04/1998");
      const rawSexo = String(s.sexo || s.sex || s.genero || "F").trim().toUpperCase();
      const isMale = rawSexo.startsWith("M") || rawSexo.startsWith("H") || rawSexo === "MAN" || rawSexo === "MALE";
      const sexoVal = isMale ? "M" : "F";
      const domVal = (s.direccion || s.address || "CONDADO").toUpperCase();
      const emailVal = (s.correo || s.email || "").toLowerCase();
      const telVal = s.celular || s.phone || s.telefono || "";

      const cFinAntVal = this.subtractOneDayExcel(targetCourse.finCurso || targetCourse.endCourseDate || "04/08/2026");
      const lentesVal = String(s.lentes || "No").toUpperCase().includes("S") ? "SÍ" : "NO";

      const vals = [
        escuelaNombre,
        ruc,
        tipoDocNombre,
        cedulaVal,
        nombreVal,
        nacVal,
        fnVal,
        sexoVal,
        domVal,
        emailVal,
        telVal,
        cInicio,
        cInicio,
        cFinAntVal,
        cFin,
        cFin,
        tipoLicencia,
        tipoLicencia,
        lentesVal,
      ];

      for (let c = 1; c <= 19; c++) {
        const cell = row.getCell(c);
        cell.value = vals[c - 1];

        if (templateRow) {
          const tCell = templateRow.getCell(c);
          if (tCell.font) cell.font = JSON.parse(JSON.stringify(tCell.font));
          if (tCell.border) cell.border = JSON.parse(JSON.stringify(tCell.border));
          if (tCell.alignment) cell.alignment = JSON.parse(JSON.stringify(tCell.alignment));
          if (tCell.fill) cell.fill = JSON.parse(JSON.stringify(tCell.fill));
        }
      }
      row.height = 20;
    });

    const lastRow = 1 + sourceStudents.length;
    for (let r = lastRow + 1; r <= 50; r++) {
      for (let c = 1; c <= 19; c++) {
        sheet.getRow(r).getCell(c).value = null;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Anexo Legalización ANT generado 100% sobre plantilla original:", outputPath);
    return outputPath;
  }

  public async generateBaseLegalizacion(data: { courseName?: string; course?: any; students: any[] }, outputPath: string): Promise<string> {
    const storeConfig = useApp.getState().config;
    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    const targetCourseName = data.courseName || data.course?.nombre || "DAIC 020 2026";
    const targetCourse = storeCursos.find((c: any) => c.nombre === targetCourseName || c.nombre.includes(targetCourseName)) || data.course || {};

    const escuelaNombre = (storeConfig.escuela?.nombre || "DRIVE ACADEMY S.A.").toUpperCase();
    const escuelaSucursal = (storeConfig.escuela?.sucursal || "EL CONDADO").toUpperCase();
    const ruc = storeConfig.escuela?.ruc || "1791835999001";
    const rawRes = targetCourse.resolucion || targetCourse.resolucionAnt || storeConfig.escuela?.resolucion;
    const resolucion = (!rawRes || rawRes === "ANT-DE-2024-0187") ? "18 DCTS-ANT-2013" : rawRes;
    const oficioMatriz = targetCourse.oficioMatriz || (storeConfig.escuela as any)?.oficioMatriz || "ANT-DPPIC-2026-6528-OF";
    const tipoLicencia = targetCourse.tipoLicencia || "B";

    const cInicio = this.formatDateExcel(targetCourse.inicioCurso || targetCourse.startCourseDate, "27/07/2026");
    const cFin = this.formatDateExcel(targetCourse.finCurso || targetCourse.endCourseDate, "04/08/2026");

    const directorNombre = storeConfig.firmas?.director?.nombre || "ING. MARCO VILLACÍS";
    const secretariaNombre = storeConfig.firmas?.secretaria?.nombre || "LCDA. ANDREA SUÁREZ";

    let sourceStudents = Array.isArray(data.students) && data.students.length > 0 ? data.students : storeEstudiantes;
    if (sourceStudents.length === 0) sourceStudents = [{}];

    let workbook = await this.loadExcelTemplate("Fase 3/ANT BASE DE DATOS DAIC 019 2026 legalizacion ant.xlsx");
    if (!workbook) {
      return this.generateAnexoLegalizacion(data, outputPath);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return this.generateAnexoLegalizacion(data, outputPath);
    }

    sheet.name = targetCourseName;

    const templateRow = sheet.getRow(11);

    if (sourceStudents.length > 1) {
      sheet.duplicateRow(11, sourceStudents.length - 1, true);
    }

    sourceStudents.forEach((s: any, i: number) => {
      const rIdx = 11 + i;
      const row = sheet.getRow(rIdx);
      const nombreVal = (s.nombres || s.fullName || s.estudianteNombre || "").toUpperCase();
      const cedulaVal = s.cedula || s.pasaporte || s.numeroDocumento || "";
      const notaTeoriaVal = s.notaTeoria || s.promedioTeorico || "20.00";
      const notaPracticaVal = s.notaPractica || "20.00";

      const vals = [
        i + 1,
        `${escuelaNombre}. - SUCURSAL ${escuelaSucursal}`,
        nombreVal,
        cedulaVal,
        notaTeoriaVal,
        notaPracticaVal,
        tipoLicencia,
        "APROBADO",
      ];

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.value = vals[c - 1];

        if (templateRow) {
          const tCell = templateRow.getCell(c);
          if (tCell.font) cell.font = JSON.parse(JSON.stringify(tCell.font));
          if (tCell.border) cell.border = JSON.parse(JSON.stringify(tCell.border));
          if (tCell.alignment) cell.alignment = JSON.parse(JSON.stringify(tCell.alignment));
          if (tCell.fill) cell.fill = JSON.parse(JSON.stringify(tCell.fill));
        }
      }
      row.height = 20;
    });

    this.replaceLogoTagInSheet(sheet, workbook);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.master && cell.address !== cell.master.address) return;
        if (typeof cell.value === "string" && cell.value.includes("{")) {
          let text = cell.value;
          text = text.replace(/\{escuelaNombre\}/gi, escuelaNombre);
          text = text.replace(/\{escuelaSucursal\}/gi, escuelaSucursal);
          text = text.replace(/\{escuelaRuc\}/gi, ruc);
          text = text.replace(/\{resolucionAnt\}|\{resolucion\}/gi, resolucion);
          text = text.replace(/\{oficioMatriz\}/gi, oficioMatriz);
          text = text.replace(/\{cursoNombre\}|\{curso\}/gi, targetCourseName);
          text = text.replace(/\{cursoInicio\}/gi, cInicio);
          text = text.replace(/\{cursoFin\}/gi, cFin);
          text = text.replace(/\{directorNombre\}/gi, directorNombre);
          text = text.replace(/\{secretariaNombre\}/gi, secretariaNombre);
          cell.value = text;
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Base Legalización ANT generado 100% sobre plantilla original:", outputPath);
    return outputPath;
  }

  // 5. Ficha Práctica (.xlsx) - Generación de pestañas por Vehículo y asignación por Horario Práctico
  public async generateFichaPractica(
    data: {
      courseName?: string;
      courseId?: string;
      schoolName?: string;
      instructorName?: string;
      autoNumero?: string;
      placas?: string;
      startDate?: string;
      endDate?: string;
      course?: any;
      students: any[];
    },
    outputPath: string
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const storeConfig = useApp.getState().config;

    const school = (data.schoolName || storeConfig.escuela?.nombre || "ESCUELA DE CONDUCCIÓN DRIVE ACADEMY ALERTA CONDADO").toUpperCase();
    const course = (data.courseName || data.course?.nombre || "DAIC 020 2026").toUpperCase();

    // Fechas
    const startStr = data.startDate || data.course?.inicioCurso || data.course?.startCourseDate || "27 DE JULIO";
    const endStr = data.endDate || data.course?.finCurso || data.course?.endCourseDate || "04 DE AGOSTO 2026";
    const fechaRangeStr = `DESDE EL ${startStr} HASTA EL ${endStr}`.toUpperCase();

    const instructor = (data.instructorName || storeConfig.firmas?.director?.nombre || "").toUpperCase();

    // 1. Obtener lista de vehículos asignados o utilizados en este curso
    const targetCourseId = data.course?.id || (data as any).courseId;
    const targetCourseName = data.courseName || data.course?.nombre;
    const cId = String(targetCourseId || "").trim();
    const cName = String(targetCourseName || "").trim().toLowerCase();
    const storeEstudiantes = useApp.getState().estudiantes || [];
    const storeCursos = useApp.getState().cursos || [];
    const targetCourse = storeCursos.find(
      (c: any) => (cId && String(c.id) === cId) || (cName && (c.nombre === targetCourseName || c.nombre.toLowerCase().includes(cName)))
    ) || data.course || {};

    let studentListToProcess: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      studentListToProcess = data.students;
    } else {
      studentListToProcess = storeEstudiantes.filter((e: any) => {
        const studentCourseId = String(e.cursoId || e.courseId || "").trim();
        const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
        if (cId && studentCourseId && cId === studentCourseId) return true;
        if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
        return false;
      });
    }

    const storeVehiculos = storeConfig.vehiculos || [];
    const courseVehIds: string[] = targetCourse?.vehiculosIds || targetCourse?.vehiclesIds || [];

    let vehiclesList: { id: string; nombre: string; numero: string; placas: string }[] = [];

    if (courseVehIds.length > 0) {
      vehiclesList = storeVehiculos
        .filter((v: any) => courseVehIds.includes(String(v.id)))
        .map((v: any, idx: number) => ({
          id: String(v.id),
          nombre: v.nombre || `AUTO ${(idx + 1).toString().padStart(2, "0")}`,
          numero: v.numero || (idx + 1).toString().padStart(2, "0"),
          placas: v.placas || v.placa || "",
        }));
    }

    if (vehiclesList.length === 0) {
      const usedVehicleIds = new Set<string>();
      (studentListToProcess || []).forEach((st: any) => {
        const vId = st.vehiculoId || st.vehicleId;
        if (vId) usedVehicleIds.add(String(vId));
      });

      if (usedVehicleIds.size > 0) {
        vehiclesList = storeVehiculos
          .filter((v: any) => usedVehicleIds.has(String(v.id)))
          .map((v: any, idx: number) => ({
            id: String(v.id),
            nombre: v.nombre || `AUTO ${(idx + 1).toString().padStart(2, "0")}`,
            numero: v.numero || (idx + 1).toString().padStart(2, "0"),
            placas: v.placas || v.placa || "",
          }));
      }
    }

    if (vehiclesList.length === 0 && storeVehiculos.length > 0) {
      vehiclesList = storeVehiculos.map((v: any, idx: number) => ({
        id: String(v.id),
        nombre: v.nombre || `AUTO ${(idx + 1).toString().padStart(2, "0")}`,
        numero: v.numero || (idx + 1).toString().padStart(2, "0"),
        placas: v.placas || v.placa || "",
      }));
    }

    if (vehiclesList.length === 0) {
      vehiclesList = [
        { id: "1", nombre: "AUTO 01", numero: "01", placas: data.placas || "" },
        { id: "2", nombre: "AUTO 02", numero: "02", placas: data.placas || "" },
      ];
    }

    // Helper para extraer la hora de inicio de la práctica (6, 8, 10, 12, 14, 16, 18, 20)
    const parseStartHour = (schedule?: string): number | null => {
      if (!schedule) return null;
      const str = String(schedule).trim().toUpperCase();
      const match = str.match(/(\d{1,2})/);
      if (match && match[1]) {
        const hr = parseInt(match[1], 10);
        const slots = [6, 8, 10, 12, 14, 16, 18, 20];
        if (slots.includes(hr)) return hr;
        for (const s of slots) {
          if (Math.abs(s - hr) <= 1) return s;
        }
      }
      return null;
    };

    // 2. Agrupar/Distribuir alumnos por horario y vehículo
    const studentByVehicleAndHour: Record<number, Record<number, any>> = {};
    for (let vIdx = 0; vIdx < vehiclesList.length; vIdx++) {
      studentByVehicleAndHour[vIdx] = {};
    }

    const hourGroups: Record<number, any[]> = {};
    [6, 8, 10, 12, 14, 16, 18, 20].forEach((h) => {
      hourGroups[h] = [];
    });

    const unassignedStudents: any[] = [];

    (studentListToProcess || []).forEach((st: any) => {
      const hr = parseStartHour(st.horarioPractica || st.horarioPractico || st.practiceSchedule || st.horario);
      if (hr !== null && hourGroups[hr]) {
        hourGroups[hr].push(st);
      } else {
        unassignedStudents.push(st);
      }
    });

    // Repartir alumnos de cada horario entre los vehículos disponibles
    [6, 8, 10, 12, 14, 16, 18, 20].forEach((h) => {
      const stList = hourGroups[h] || [];
      stList.forEach((st, idx) => {
        const targetVehicleIdx = idx % vehiclesList.length;
        if (!studentByVehicleAndHour[targetVehicleIdx]) {
          studentByVehicleAndHour[targetVehicleIdx] = {};
        }
        studentByVehicleAndHour[targetVehicleIdx]![h] = st;
      });
    });

    // Si hay alumnos sin horario detectado, asignarlos en slots vacíos
    unassignedStudents.forEach((st) => {
      let assigned = false;
      for (let vIdx = 0; vIdx < vehiclesList.length; vIdx++) {
        const vMap = studentByVehicleAndHour[vIdx] || {};
        studentByVehicleAndHour[vIdx] = vMap;
        for (const h of [6, 8, 10, 12, 14, 16, 18, 20]) {
          if (!vMap[h]) {
            vMap[h] = st;
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
    });

    // 3. Crear una pestaña por cada Vehículo
    for (let vIdx = 0; vIdx < vehiclesList.length; vIdx++) {
      const veh = vehiclesList[vIdx];
      if (!veh) continue;
      const sheetName = veh.nombre || `AUTO ${veh.numero}`;
      const sheet = workbook.addWorksheet(sheetName);

      // Logo dinámico
      const showLogo = Boolean(storeConfig.logoDocs?.ficha_practica);
      const logoUrl = storeConfig.escuela?.logoUrl;
      if (showLogo && logoUrl) {
        let base64Data = logoUrl;
        let extension: "png" | "jpeg" = "png";
        if (logoUrl.startsWith("data:")) {
          const parts = logoUrl.split(",");
          if (parts.length === 2 && parts[0] && parts[1]) {
            if (parts[0].includes("image/jpeg") || parts[0].includes("image/jpg")) {
              extension = "jpeg";
            }
            base64Data = parts[1];
          }
        }
        try {
          const imageId = workbook.addImage({
            base64: base64Data,
            extension,
          });
          sheet.addImage(imageId, {
            tl: { col: 0, row: 2 },
            ext: { width: 140, height: 48 },
            editAs: "oneCell",
          });
        } catch (e) {
          console.error("[ExcelGenerator] Logo error:", e);
        }
      }

      // Encabezado Título Central (Cols C3:W3 y C4:W4)
      sheet.mergeCells("C3:W3");
      const cellTitle = sheet.getCell("C3");
      cellTitle.value = school.includes("ESCUELA DE CONDUCCIÓN") ? school : `ESCUELA DE CONDUCCIÓN ${school}`;
      cellTitle.font = { bold: true, size: 12, name: "Calibri" };
      cellTitle.alignment = { horizontal: "center", vertical: "middle" };

      sheet.mergeCells("C4:W4");
      const cellSlogan = sheet.getCell("C4");
      cellSlogan.value = '"Ama tu vida... Conduce tus sueños"';
      cellSlogan.font = { italic: true, size: 10, name: "Calibri" };
      cellSlogan.alignment = { horizontal: "center", vertical: "middle" };

      // Fila 6 (INSTRUCTOR, CURSO, AUTO)
      let vehInstructorName = "";

      // 1. Consultar PRIMERO el instructor asignado directamente al vehículo en storeConfig.vehiculos
      const foundVehInConfig = (storeConfig.vehiculos || []).find(
        (v: any) =>
          (veh.id && String(v.id) === String(veh.id)) ||
          (veh.numero && (String(v.numero) === String(veh.numero) || String(v.numero).padStart(2, "0") === String(veh.numero).padStart(2, "0")))
      );
      if (foundVehInConfig) {
        if (foundVehInConfig.instructorId) {
          const instObj = (storeConfig.instructores || []).find((i: any) => String(i.id) === String(foundVehInConfig.instructorId));
          if (instObj?.nombre) {
            vehInstructorName = instObj.nombre;
          }
        }
        if (!vehInstructorName && foundVehInConfig.instructorNombre) {
          vehInstructorName = foundVehInConfig.instructorNombre;
        }
      }

      // 2. Si no se encontró en el vehículo, consultar los estudiantes asignados a este auto
      if (!vehInstructorName) {
        const vehicleStudents = (studentListToProcess || []).filter((s: any) => {
          const sVehId = String(s.vehiculoId || s.vehicleId || s.vehiculo || "").trim();
          const sVehNum = String(s.numeroVehiculo || s.vehicleNumber || "").trim();
          return (sVehId && sVehId === veh.id) || (sVehNum && (sVehNum === veh.numero || sVehNum === String(vIdx + 1)));
        });

        for (const s of vehicleStudents) {
          const instId = s.instructorPracticoId || s.practiceInstructorId || s.instructorId;
          const instRaw = s.instructorPractico || s.practiceInstructor || s.instructor;
          if (instId) {
            const foundInst = (storeConfig.instructores || []).find((i: any) => String(i.id) === String(instId));
            if (foundInst?.nombre) {
              vehInstructorName = foundInst.nombre;
              break;
            }
          }
          if (instRaw && typeof instRaw === "string" && instRaw.trim()) {
            vehInstructorName = instRaw.trim();
            break;
          }
        }
      }

      // 3. Buscar por índice entre los instructores prácticos
      if (!vehInstructorName) {
        const practicos = (storeConfig.instructores || []).filter((i: any) => i.tipo === "Práctico" || /prác/i.test(i.tipo || ""));
        if (practicos[vIdx]?.nombre) {
          vehInstructorName = practicos[vIdx]!.nombre;
        } else if (practicos[0]?.nombre) {
          vehInstructorName = practicos[0]!.nombre;
        }
      }

      // 4. Fallback a firmas o instructor global
      if (!vehInstructorName) {
        vehInstructorName = data.instructorName || storeConfig.firmas?.directorPractico?.nombre || storeConfig.firmas?.director?.nombre || "";
      }

      const finalInstructorStr = vehInstructorName.toUpperCase();
      sheet.getCell("B6").value = `INSTRUCTOR:${finalInstructorStr ? " " + finalInstructorStr : " ________________________"}`;
      sheet.getCell("B6").font = { bold: true, size: 9, name: "Calibri" };

      sheet.getCell("K6").value = `CURSO N°: ${course}`;
      sheet.getCell("K6").font = { bold: true, size: 9, name: "Calibri" };

      sheet.getCell("R6").value = `AUTO N° ${veh.numero || "_______"}`;
      sheet.getCell("R6").font = { bold: true, size: 9, name: "Calibri" };

      // Fila 7 (PLACAS, FECHA)
      sheet.getCell("B7").value = `PLACAS:${veh.placas ? " " + veh.placas : "__________________"}`;
      sheet.getCell("B7").font = { bold: true, size: 9, name: "Calibri" };

      sheet.getCell("G7").value = `FECHA:   ${fechaRangeStr}`;
      sheet.getCell("G7").font = { bold: true, size: 9, name: "Calibri" };

      // Configuración de Ancho de Columnas (23 Columnas en Total con offset exacto +0.71)
      sheet.getColumn(1).width = 3.71;   // Col A: N° (despliega 3.00 en MS Excel UI)
      sheet.getColumn(2).width = 32;     // Col B: APELLIDOS Y NOMBRES DEL ALUMNO
      for (let c = 3; c <= 20; c++) {
        sheet.getColumn(c).width = 2.56; // Cols C a T: 18 celdas (despliega 1.85 en MS Excel UI)
      }
      sheet.getColumn(21).width = 6.71;  // Col U: N. EXAMEN (despliega 6.00 en MS Excel UI)
      sheet.getColumn(22).width = 13.21; // Col V: N° PERMISO (despliega 12.50 en MS Excel UI)
      sheet.getColumn(23).width = 21.21; // Col W: FIRMA ALUMNO (despliega 20.50 en MS Excel UI)

      sheet.getRow(1).height = 17.5;
      sheet.getRow(2).height = 17.5;

      // Encabezados de Tabla (Filas 9-10)
      sheet.mergeCells("A9:A10");
      sheet.getCell("A9").value = "N°";

      sheet.mergeCells("B9:B10");
      sheet.getCell("B9").value = "APELLIDOS Y NOMBRES DEL ALUMNO";

      for (let d = 1; d <= 9; d++) {
        const startCol = 3 + (d - 1) * 2;
        const endCol = startCol + 1;
        sheet.mergeCells(9, startCol, 9, endCol);

        const cell = sheet.getCell(9, startCol);
        cell.value = d;
        cell.font = { bold: true, size: 9, name: "Calibri" };
        cell.alignment = { horizontal: "left", vertical: "top" };
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
          diagonal: { up: false, down: true, style: "thin", color: { argb: "000000" } },
        };

        const cell2 = sheet.getCell(9, endCol);
        cell2.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
          diagonal: { up: false, down: true, style: "thin", color: { argb: "000000" } },
        };
      }

      sheet.mergeCells("U9:U10");
      sheet.getCell("U9").value = "N. EXAMEN";

      sheet.mergeCells("V9:V10");
      sheet.getCell("V9").value = "N° PERMISO";

      sheet.mergeCells("W9:W10");
      sheet.getCell("W9").value = "FIRMA ALUMNO";

      ["A9", "B9", "U9", "V9", "W9"].forEach((cellId) => {
        const c = sheet.getCell(cellId);
        c.font = { bold: true, size: 9, name: "Calibri" };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      for (let col = 1; col <= 23; col++) {
        for (let r = 9; r <= 10; r++) {
          const borderObj: any = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          };
          if (r === 9 && col >= 3 && col <= 20) {
            borderObj.diagonal = { up: false, down: true, style: "thin", color: { argb: "000000" } };
          }
          sheet.getCell(r, col).border = borderObj;
        }
      }

      // Filas de Estudiantes (Filas 11 a 18) - Asignados por Horario Práctico (6, 8, 10, 12, 14, 16, 18, 20)
      const hours = [6, 8, 10, 12, 14, 16, 18, 20];
      for (let i = 0; i < 8; i++) {
        const rIdx = 11 + i;
        const numLabel = hours[i] ?? 6;
        const vMap = studentByVehicleAndHour[vIdx] || {};
        const st = vMap[numLabel];

        sheet.getCell(rIdx, 1).value = numLabel;
        sheet.getCell(rIdx, 1).alignment = { horizontal: "center", vertical: "middle" };
        sheet.getCell(rIdx, 1).font = { size: 9, name: "Calibri" };

        sheet.getCell(rIdx, 2).value = st ? (st.nombres || st.fullName || st.nombre || "").toUpperCase() : "";
        sheet.getCell(rIdx, 2).alignment = { horizontal: "left", vertical: "middle" };
        sheet.getCell(rIdx, 2).font = { size: 9, name: "Calibri" };

        for (let col = 1; col <= 23; col++) {
          sheet.getCell(rIdx, col).border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          };
        }

        const r = sheet.getRow(rIdx);
        r.height = 31.5; // Despliega 18pt en MS Excel UI
      }

      // Sección OBSERVACIONES O COMENTARIOS (Filas 20-28)
      sheet.mergeCells("A20:W20");
      const cellObsTitle = sheet.getCell("A20");
      cellObsTitle.value = "OBSERVACIONES O COMENTARIOS";
      cellObsTitle.font = { bold: true, size: 9, name: "Calibri" };
      cellObsTitle.alignment = { horizontal: "left", vertical: "middle" };
      sheet.getCell("A20").border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };

      for (let i = 0; i < 8; i++) {
        const rIdx = 21 + i;
        const numLabel = hours[i];

        sheet.getCell(rIdx, 1).value = numLabel;
        sheet.getCell(rIdx, 1).alignment = { horizontal: "center", vertical: "middle" };
        sheet.getCell(rIdx, 1).font = { size: 9, name: "Calibri" };
        sheet.getCell(rIdx, 1).border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };

        sheet.mergeCells(`B${rIdx}:W${rIdx}`);
        const cellObsRow = sheet.getCell(`B${rIdx}`);
        cellObsRow.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };

        const r = sheet.getRow(rIdx);
        r.height = 31.5; // Despliega 18pt en MS Excel UI
      }

      // Footer: REFERENCIAS (B30 ALINEADA A LA DERECHA), FIRMA INSTRUCTOR, FIRMA SUPERVISOR
      sheet.getCell("B30").value = "REFERENCIAS";
      sheet.getCell("B30").font = { bold: true, size: 8, name: "Calibri" };
      sheet.getCell("B30").alignment = { horizontal: "right", vertical: "middle" };

      sheet.getCell("C30").value = "✔ =";
      sheet.getCell("D30").value = "ASISTE";
      sheet.getCell("C30").font = { size: 8, name: "Calibri" };
      sheet.getCell("D30").font = { size: 8, name: "Calibri" };

      sheet.getCell("C31").value = "X =";
      sheet.getCell("D31").value = "NO ASISTE";
      sheet.getCell("C31").font = { size: 8, name: "Calibri" };
      sheet.getCell("D31").font = { size: 8, name: "Calibri" };

      sheet.getCell("C32").value = "FJ =";
      sheet.getCell("D32").value = "FALTA JUSTIFICADA";
      sheet.getCell("C32").font = { size: 8, name: "Calibri" };
      sheet.getCell("D32").font = { size: 8, name: "Calibri" };

      // Firma Instructor (L32:S32)
      sheet.mergeCells("L32:S32");
      const cellSigInst = sheet.getCell("L32");
      cellSigInst.value = "FIRMA DEL INSTRUCTOR";
      cellSigInst.font = { bold: true, size: 8, name: "Calibri" };
      cellSigInst.alignment = { horizontal: "center", vertical: "middle" };
      for (let c = 12; c <= 19; c++) {
        sheet.getCell(32, c).border = {
          top: { style: "thin", color: { argb: "000000" } },
        };
      }

      // Firma Supervisor (U32:W32)
      sheet.mergeCells("U32:W32");
      const cellSigSup = sheet.getCell("U32");
      cellSigSup.value = "FIRMA SUPERVISOR";
      cellSigSup.font = { bold: true, size: 8, name: "Calibri" };
      cellSigSup.alignment = { horizontal: "center", vertical: "middle" };
      for (let c = 21; c <= 23; c++) {
        sheet.getCell(32, c).border = {
          top: { style: "thin", color: { argb: "000000" } },
        };
      }

      [30, 31, 32, 33].forEach((rNum) => {
        sheet.getRow(rNum).height = 17.5; // Despliega 10pt en MS Excel UI
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    return outputPath;
  }

  private formatDateLong(dateVal?: string | Date | null): string {
    const dObj = dateVal ? new Date(dateVal) : new Date();
    const validDate = isNaN(dObj.getTime()) ? new Date() : dObj;
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    return `Quito, ${validDate.getDate()} de ${months[validDate.getMonth()]} del ${validDate.getFullYear()}`;
  }

  // 6. Impresión de Títulos (.xlsx) - Plantilla Fase 4 / IMPRESION TITULOS (1).xlsx
  public async generateImpresionTitulos(
    data: {
      courseName?: string;
      schoolName?: string;
      startDate?: string;
      endDate?: string;
      fechaOficioMatriz?: string;
      course?: any;
      students: any[];
    },
    outputPath: string
  ): Promise<string> {
    const templateWorkbook = await this.loadExcelTemplate("Fase 4/IMPRESION TITULOS (1).xlsx");
    let workbook = templateWorkbook;

    if (!workbook) {
      console.warn("[ExcelGenerator] No se encontró plantilla IMPRESION TITULOS (1).xlsx, creando libro nuevo.");
      workbook = new ExcelJS.Workbook();
      workbook.addWorksheet("TITULO");
    }

    const targetCourse = data.course || {};
    const cInicio = data.startDate || targetCourse.inicioCurso || data.course?.startCourseDate || "10/07/2026";
    const cFin = data.endDate || targetCourse.finCurso || data.course?.endCourseDate || "24/07/2026";
    const inicioStr = this.formatDateExcel(cInicio, "10/07/2026");
    const finStr = this.formatDateExcel(cFin, "24/07/2026");

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaLarga = this.formatDateLong(todayIso);
    const fechaMatriz = data.fechaOficioMatriz || fechaLarga;

    const listado = data.students && data.students.length > 0 ? data.students : [{ fullName: "ESTUDIANTE EJEMPLO" }];
    const sheet = workbook.getWorksheet("TITULO") || workbook.worksheets[0];

    if (sheet) {
      this.addLogoAndWatermark(sheet, workbook, "titulo");

      const firstSt = listado[0] || {};
      const nombreEstudiante = (firstSt.fullName || firstSt.nombres || firstSt.nombre || "ESTUDIANTE EJEMPLO").toUpperCase();

      const rawProm = firstSt.notaPromedio ?? firstSt.promedioTeorico ?? firstSt.promedio ?? firstSt.nota_promedio ?? 20;
      const promVal = typeof rawProm === "number" ? rawProm.toFixed(2).replace(".", ",") : String(rawProm).replace(".", ",");

      const rawPrac = firstSt.notaPractica ?? firstSt.practica ?? firstSt.nota_practica ?? firstSt.examenPractico ?? 20;
      const pracVal = typeof rawPrac === "number" ? rawPrac.toFixed(2).replace(".", ",") : String(rawPrac).replace(".", ",");

      const replacements: Record<string, string> = {
        "{estudianteNombre}": nombreEstudiante,
        "{nombreEstudiante}": nombreEstudiante,
        "{estudiante}": nombreEstudiante,
        "{cursoInicio}": inicioStr,
        "{cursoFin}": finStr,
        "{notaTeoria}": promVal,
        "{notaPromedio}": promVal,
        "{promedioTeorico}": promVal,
        "{promedio}": promVal,
        "{notaPractica}": pracVal,
        "{practica}": pracVal,
        "{examenPractico}": pracVal,
        "{fechaOficioMatriz}": fechaMatriz,
        "{fechaActual}": fechaLarga,
        "{fechaHoy}": fechaLarga,
      };

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.master && cell.address !== cell.master.address) return;
          if (typeof cell.value === "string") {
            let text = cell.value;
            Object.entries(replacements).forEach(([tag, val]) => {
              if (text.includes(tag)) {
                text = text.replace(new RegExp(tag.replace(/[{}]/g, "\\$&"), "g"), val);
              }
            });
            cell.value = text;
          }
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Impresión de Títulos generada con éxito:", outputPath);
    return outputPath;
  }

  // 7. Generación de Reporte de Asistencia Práctica (días 1 al 7 con horas de entrada y salida calculadas aleatoriamente)
  public async generateAsistenciaPracticaReport(
    data: {
      courseName: string;
      licenseType: string;
      students: any[];
    },
    outputPath: string
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asistencia Práctica");

    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    const titleFont: Partial<ExcelJS.Font> = {
      name: "Arial",
      size: 13,
      bold: true,
      color: { argb: "FF0F172A" },
    };
    const thinBorder: any = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    sheet.mergeCells("A1:R1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `REPORTE DE ASISTENCIA PRÁCTICA - ${data.courseName.toUpperCase()} (LICENCIA TIPO ${data.licenseType})`;
    titleCell.font = titleFont;
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:R2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Registro de horas de entrada y salida para prácticas conductoras (Días 1 al 7)`;
    subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    sheet.getRow(2).height = 20;

    const headers = [
      "#",
      "ESTUDIANTE",
      "CÉDULA",
      "HORARIO PRÁCTICO",
      "DÍA 1 (ENTRADA)",
      "DÍA 1 (SALIDA)",
      "DÍA 2 (ENTRADA)",
      "DÍA 2 (SALIDA)",
      "DÍA 3 (ENTRADA)",
      "DÍA 3 (SALIDA)",
      "DÍA 4 (ENTRADA)",
      "DÍA 4 (SALIDA)",
      "DÍA 5 (ENTRADA)",
      "DÍA 5 (SALIDA)",
      "DÍA 6 (ENTRADA)",
      "DÍA 6 (SALIDA)",
      "DÍA 7 (ENTRADA)",
      "DÍA 7 (SALIDA)",
    ];

    const headerRow = sheet.getRow(4);
    headerRow.height = 26;
    headers.forEach((h, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = h;
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = thinBorder;
    });

    const parseSchedule = (scheduleStr?: string) => {
      const defaultStartMinutes = 14 * 60;
      const defaultEndMinutes = 15 * 60;

      if (!scheduleStr) return { startMin: defaultStartMinutes, endMin: defaultEndMinutes };

      const clean = scheduleStr.toUpperCase().replace(/H/g, ":");
      const parts = clean.split(/[-–—]/);

      let startMin = defaultStartMinutes;
      let endMin = defaultEndMinutes;

      if (parts[0]) {
        const subParts = parts[0].split(":").map((v) => parseInt(v.trim(), 10));
        const h = subParts[0];
        const m = subParts[1];
        if (typeof h === "number" && !isNaN(h)) {
          startMin = h * 60 + (typeof m === "number" && !isNaN(m) ? m : 0);
        }
      }
      if (parts[1]) {
        const subParts = parts[1].split(":").map((v) => parseInt(v.trim(), 10));
        const h = subParts[0];
        const m = subParts[1];
        if (typeof h === "number" && !isNaN(h)) {
          endMin = h * 60 + (typeof m === "number" && !isNaN(m) ? m : 0);
        }
      }

      return { startMin, endMin };
    };

    const formatMinutesToHHMM = (totalMin: number) => {
      const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.floor(totalMin)));
      const hrs = Math.floor(normalized / 60);
      const mins = normalized % 60;
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    const getRandomInt = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const sorted = [...data.students].sort((a, b) =>
      (a.fullName || a.nombres || "").localeCompare(b.fullName || b.nombres || "")
    );

    sorted.forEach((st, idx) => {
      const rIdx = 5 + idx;
      const row = sheet.getRow(rIdx);
      row.height = 22;

      const nameStr = (st.fullName || st.nombres || st.nombre || "").toUpperCase();
      const cedulaStr = st.cedula || st.pasaporte || st.numeroDocumento || "";
      const horarioStr = st.horarioPractico || st.practiceSchedule || "14H00-15H00";

      const { startMin, endMin } = parseSchedule(horarioStr);

      const rowValues: any[] = [
        idx + 1,
        nameStr,
        cedulaStr,
        horarioStr,
      ];

      for (let day = 1; day <= 7; day++) {
        let entryTimeStr = "";
        let exitTimeStr = "";

        if (day <= 6) {
          // Días 1 a 6: Entrada ±5 min, Salida -25 a -35 min
          const entryOffset = getRandomInt(-5, 5);
          const entryMin = startMin + entryOffset;

          const exitOffset = getRandomInt(-35, -25);
          const exitMin = endMin + exitOffset;

          entryTimeStr = formatMinutesToHHMM(entryMin);
          exitTimeStr = formatMinutesToHHMM(exitMin);
        } else {
          // Día 7: Entrada 08:00 ±10 min, Salida 12:00 ±10 min
          const entryOffset = getRandomInt(-10, 10);
          const entryMin = 8 * 60 + entryOffset;

          const exitOffset = getRandomInt(-10, 10);
          const exitMin = 12 * 60 + exitOffset;

          entryTimeStr = formatMinutesToHHMM(entryMin);
          exitTimeStr = formatMinutesToHHMM(exitMin);
        }

        rowValues.push(entryTimeStr);
        rowValues.push(exitTimeStr);
      }

      rowValues.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = val;
        cell.font = { name: "Arial", size: 9 };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: "middle",
          horizontal: colIdx === 1 ? "left" : "center",
        };
      });
    });

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 34;
    sheet.getColumn(3).width = 14;
    sheet.getColumn(4).width = 16;
    for (let c = 5; c <= 18; c++) {
      sheet.getColumn(c).width = 14;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await LocalFileStorage.getInstance().saveFile(outputPath, new Uint8Array(buffer));
    console.log("[ExcelGenerator] Reporte de Asistencia Práctica generado con éxito:", outputPath);
    return outputPath;
  }
}
