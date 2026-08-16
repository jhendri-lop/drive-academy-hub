import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  HeightRule,
  ImageRun,
  Header,
  UnderlineType,
  ImportedXmlComponent,
} from "docx";
import { LocalFileStorage } from "../storage/LocalFileStorage";
import { TemplateStorage } from "../storage/TemplateStorage";
import { SQLiteClient } from "../database/SQLiteClient";
import { useApp } from "@/lib/store";
import { ANT_LOGO_BASE64 } from "./antLogoBase64";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
// @ts-ignore
import ImageModule from "docxtemplater-image-module-free";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanB64 = base64.replace(/^data:image\/[a-z]+;base64,/i, "").trim();
  const binaryString = window.atob(cleanB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class WordGenerator {
  private static instance: WordGenerator | null = null;

  private constructor() { }

  public static getInstance(): WordGenerator {
    if (!WordGenerator.instance) {
      WordGenerator.instance = new WordGenerator();
    }
    return WordGenerator.instance;
  }

  private createImageModule(): any {
    try {
      return new ImageModule({
        centered: false,
        getImage: (tagValue: string) => {
          console.log("[ImageModule] getImage llamado, tagValue:", tagValue);
          const activeLogo = useApp.getState().config?.escuela?.logoUrl || "";
          console.log("[ImageModule] Logo activo:", activeLogo ? "SÍ (tiene datos)" : "NO (vacío)");

          let b64 = (typeof tagValue === "string" && tagValue.length > 50) ? tagValue : activeLogo;
          if (!b64 || typeof b64 !== "string" || !b64.trim() || b64 === "/logo.jpg" || b64.startsWith("/")) {
            b64 = ANT_LOGO_BASE64;
          }
          if (b64.startsWith("data:")) {
            const parts = b64.split(",");
            if (parts[1]) b64 = parts[1];
          }
          try {
            const bytes = base64ToArrayBuffer(b64);
            console.log("[ImageModule] ArrayBuffer generado, tamaño:", bytes.byteLength, "bytes");
            return bytes;
          } catch (e) {
            console.error("[ImageModule] Error generando bytes, usando fallback:", e);
            return base64ToArrayBuffer(ANT_LOGO_BASE64);
          }
        },
        getSize: (img: any, tagValue: string, tagName: string) => {
          console.log("[ImageModule] getSize llamado, tagName:", tagName);
          const fullTag = String(tagName);
          
          const match = fullTag.match(/[_:](\d+)x(\d+)$/i);
          if (match && match[1] && match[2]) {
            const width = parseInt(match[1], 10);
            const height = parseInt(match[2], 10);
            console.log("[ImageModule] Tamaño parseado del tag:", width, "x", height);
            return [width, height];
          }

          console.log("[ImageModule] Usando tamaño default: 240x80");
          return [240, 80];
        },
      });
    } catch (e) {
      console.warn("[WordGenerator] Error creando ImageModule fresco:", e);
      return null;
    }
  }

  private formatDateLong(dStr?: string): string {
    if (!dStr) return "17-julio-2003";
    const str = String(dStr).trim();
    let day = 17;
    let month = 7;
    let year = 2003;

    if (str.includes("-")) {
      const datePart = str.split("T")[0] || "";
      const parts = datePart.split("-");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10) || 2008;
          month = parseInt(parts[1], 10) || 5;
          day = parseInt(parts[2], 10) || 29;
        } else {
          day = parseInt(parts[0], 10) || 29;
          month = parseInt(parts[1], 10) || 5;
          year = parseInt(parts[2], 10) || 2008;
        }
      }
    } else if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2].length === 4) {
          day = parseInt(parts[0], 10) || 29;
          month = parseInt(parts[1], 10) || 5;
          year = parseInt(parts[2], 10) || 2008;
        } else {
          year = parseInt(parts[0], 10) || 2008;
          month = parseInt(parts[1], 10) || 5;
          day = parseInt(parts[2], 10) || 29;
        }
      }
    }

    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    const mName = months[(month - 1) % 12] || "mayo";
    const dPad = String(day).padStart(2, "0");
    return `${dPad}-${mName}-${year}`;
  }

  private formatTipoSangre(val?: string): string {
    if (!val) return "ORH+";
    let str = String(val).trim().toUpperCase();
    if (str.includes("RH")) return str;
    str = str.replace(/POSITIVO/i, "+").replace(/NEGATIVO/i, "-").replace(/\s+/g, "");
    return str.replace(/^([A-Z]+)([\+\-])$/, "$1RH$2");
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

    if (!dStart || isNaN(dStart.getTime())) dStart = new Date(2026, 6, 16);
    if (!dEnd || isNaN(dEnd.getTime())) dEnd = new Date(2026, 6, 24);

    const startDay = dStart.getDate();
    const startMonth = months[dStart.getMonth()] || "julio";

    const endDay = dEnd.getDate();
    const endMonth = months[dEnd.getMonth()] || "julio";
    const endYear = dEnd.getFullYear();

    return `del ${startDay} de ${startMonth} al ${endDay} de ${endMonth} del ${endYear}`;
  }

  private formatDateFullSpanish(val?: string): string {
    if (!val) return "13 de julio del 2026";
    const str = String(val).trim();
    if (!str) return "13 de julio del 2026";

    let day = 13;
    let month = 7;
    let year = 2026;

    if (str.includes("-")) {
      const datePart = str.split("T")[0] || "";
      const parts = datePart.split("-");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10) || 2026;
          month = parseInt(parts[1], 10) || 7;
          day = parseInt(parts[2], 10) || 13;
        } else {
          day = parseInt(parts[0], 10) || 13;
          month = parseInt(parts[1], 10) || 7;
          year = parseInt(parts[2], 10) || 2026;
        }
      }
    } else if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2].length === 4) {
          day = parseInt(parts[0], 10) || 13;
          month = parseInt(parts[1], 10) || 7;
          year = parseInt(parts[2], 10) || 2026;
        } else {
          year = parseInt(parts[0], 10) || 2026;
          month = parseInt(parts[1], 10) || 7;
          day = parseInt(parts[0], 10) || 13;
        }
      }
    }

    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    const mName = months[(month - 1) % 12] || "julio";
    return `${day} de ${mName} del ${year}`;
  }

  private subtractOneDay(dateStr?: string): string {
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
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2] > 1000) {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        } else if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
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

  private formatNotaMateria(raw: any): string {
    if (raw === undefined || raw === null || raw === "") return "20";
    const str = String(raw).trim();
    if (str.endsWith(".00") || str.endsWith(",00")) return str.slice(0, -3);
    const num = parseFloat(str.replace(",", "."));
    if (!isNaN(num) && Number.isInteger(num)) return String(num);
    return str;
  }

  private formatNotaFinalDecimal(raw: any): string {
    if (raw === undefined || raw === null || raw === "") return "20,00";
    const str = String(raw).trim().replace(",", ".");
    const num = parseFloat(str);
    if (isNaN(num)) return String(raw);
    return num.toFixed(2).replace(".", ",");
  }

  private mapAndSortStudents(studentsList: any[], data: any, targetCourse: any, storeConfig: any) {
    const sorted = [...studentsList].sort((a: any, b: any) => {
      const nameA = (a.fullName || a.nombres || a.nombre_estudiante || a.nombre || "").trim().toUpperCase();
      const nameB = (b.fullName || b.nombres || b.nombre_estudiante || b.nombre || "").trim().toUpperCase();
      return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
    });

    const rawActaCandidate = data.actaInicio ?? data.secuencialActa ?? data.actaInicial;
    let startActaNum = NaN;
    if (rawActaCandidate !== undefined && rawActaCandidate !== null) {
      const parsedCandidate = parseInt(String(rawActaCandidate).replace(/\D/g, ""), 10);
      if (!isNaN(parsedCandidate) && parsedCandidate > 0) {
        startActaNum = parsedCandidate;
      }
    }
    if (isNaN(startActaNum)) {
      const storeSecuencial = Number(storeConfig.secuenciales?.actas);
      startActaNum = (!isNaN(storeSecuencial) && storeSecuencial > 0) ? storeSecuencial : 3251;
    }
    const hPractico = data.horarioPractico || data.horarioPractica || targetCourse.horarioPractica || "14H00-16H00";
    const hTeorico = this.cleanHorarioTeoria(data.horarioTeorico || data.horarioTeoria || targetCourse.horarioTeoria || "18H00-20H00");
    const todayIso = new Date().toISOString().split("T")[0];
    const fechaActualHoy = this.formatDateLong(todayIso);

    const cInicio = targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso;
    const cFin = targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso;
    const periodoText = this.formatPeriodo(cInicio, cFin);

    const matFinRaw = targetCourse.finMatricula || data.finMatricula || data.matriculaFin || data.fechaMatriculaFin || "13/07/2026";
    const finMatriculasLargoText = this.formatDateFullSpanish(matFinRaw);

    const firstSt = sorted[0] || {};
    const lastSt = sorted[sorted.length - 1] || firstSt;

    const firstName = (firstSt.fullName || firstSt.nombres || firstSt.nombre_estudiante || firstSt.nombre || data.nombre_estudiante || "ACERO CEVALLOS KEVIN ALEXANDER").toUpperCase();
    const firstCedula = firstSt.cedula || firstSt.pasaporte || firstSt.numeroDocumento || data.cedula || "1725219412";
    const firstDocType = String(firstSt.tipoDocumento || "").toLowerCase().includes("pasaporte") ? "PAS." : "CC.";

    const lastName = (lastSt.fullName || lastSt.nombres || lastSt.nombre_estudiante || lastSt.nombre || data.nombre_estudiante || "VALENCIA GUAICO ZAHID MIJAEL").toUpperCase();
    const lastCedula = lastSt.cedula || lastSt.pasaporte || lastSt.numeroDocumento || data.cedula || "1753673837";
    const lastDocType = String(lastSt.tipoDocumento || "").toLowerCase().includes("pasaporte") ? "PAS." : "CC.";

    const primerUltimoText = `${firstName} ${firstDocType} ${firstCedula} hasta ${lastName} ${lastDocType} ${lastCedula}`;

    return sorted.map((st: any, idx: number) => {
      const docTypeRaw = String(st.tipoDocumento || data.tipoDocumento || "").toLowerCase();
      const isPasaporte = docTypeRaw.includes("pasaporte");
      const isCedula = !isPasaporte;
      const fnRaw = st.fechaNacimiento || data.fechaNacimiento || "";
      const currentActaNum = startActaNum + idx;
      const currentActaStr = String(currentActaNum);

      return {
        ...st,
        n: idx + 1,
        actaNumero: currentActaStr,
        numeroActa: currentActaStr,
        numero_acta: currentActaStr,
        nroActa: currentActaStr,
        acta: currentActaStr,
        secuencialActa: currentActaStr,
        actaSecuencial: currentActaStr,
        numActa: currentActaStr,
        periodo: periodoText,
        periodoCurso: periodoText,
        primerUltimoEstudiante: primerUltimoText,
        primerEstudianteUltimoEstudiante: primerUltimoText,
        rangoEstudiantes: primerUltimoText,
        rangoEstudiantesCedula: primerUltimoText,
        finMatriculasLargo: finMatriculasLargoText,
        matriculaFinLargo: finMatriculasLargoText,
        finDeMatriculasLargo: finMatriculasLargoText,
        cursoFinAnterior: this.subtractOneDay(cFin),
        cursoFinPrevio: this.subtractOneDay(cFin),
        fechaFinAnterior: this.subtractOneDay(cFin),
        cursoFinMenosUnDia: this.subtractOneDay(cFin),
        estudianteNombre: (st.fullName || st.nombres || st.nombre_estudiante || st.nombre || data.nombre_estudiante || "").toUpperCase(),
        cedula: st.cedula || st.pasaporte || st.numeroDocumento || data.cedula || "",
        tipoDocumento: isPasaporte ? "Pasaporte" : "Cédula",
        tipo_documento: isPasaporte ? "Pasaporte" : "Cédula",
        tipoDocumentoNombre: isPasaporte ? "Pasaporte" : "Cédula",
        tipoDocumentoTexto: isPasaporte ? "Pasaporte" : "Cédula",
        tipoDocumentoCorta: isPasaporte ? "PAS." : "CC.",
        tipoDocCorta: isPasaporte ? "PAS." : "CC.",
        tipoDocumentoAbv: isPasaporte ? "PAS" : "CC",
        documentoTipo: isPasaporte ? "Pasaporte" : "Cédula",
        X1: isCedula ? "X" : "",
        X2: isPasaporte ? "X" : "",
        x1: isCedula ? "X" : "",
        x2: isPasaporte ? "X" : "",
        marcaCedula: isCedula ? "( X )" : "(   )",
        marcaPasaporte: isPasaporte ? "( X )" : "(   )",
        lentes: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "SÍ" : "NO",
        usaLentes: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "SÍ" : "NO",
        usarLentes: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "SÍ" : "NO",
        lentesTexto: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "SÍ" : "NO",
        marcaLentes: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "( X )" : "(   )",
        lentesSi: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "X" : "",
        lentesNo: (st.lentes || data.lentes || "No").toUpperCase() === "SÍ" || (st.lentes || data.lentes || "No").toUpperCase() === "SI" ? "" : "X",
        nacionalidad: (st.nacionalidad || data.nacionalidad || "ECUATORIANA").toUpperCase(),
        tipoSangre: this.formatTipoSangre(st.tipoSangre || st.sangre || data.tipoSangre || "ORH+"),
        fechaNacimiento: this.formatDateExcel(st.fechaNacimiento || data.fechaNacimiento, "12/04/1998"),
        fechaNacimientoLarga: this.formatDateLong(fnRaw),
        fechaActual: fechaActualHoy,
        fechaHoy: fechaActualHoy,
        fechaSistema: fechaActualHoy,
        edad: st.edad || data.edad || 18,
        sexo: (st.sexo || data.sexo || "F").toUpperCase(),
        direccion: (st.direccion || st.direccionDomicilio || data.direccion || "CALLE LOS RÍOS 234").toUpperCase(),
        canton: (st.canton || data.canton || storeConfig.escuela?.canton || "QUITO").toUpperCase(),
        celular: st.celular || st.phone || st.telefono || st.movil || data.celular || data.phone || data.telefono || "",
        phone: st.phone || st.celular || st.telefono || st.movil || data.phone || data.celular || "",
        telefono: st.telefono || st.celular || st.phone || st.movil || data.telefono || data.celular || "",
        movil: st.movil || st.celular || st.phone || st.telefono || "",
        celularEstudiante: st.celular || st.phone || st.telefono || data.celular || "",
        telefonoEstudiante: st.telefono || st.celular || st.phone || data.telefono || "",
        email: st.email || data.email || st.correo || data.correo || "",
        nivelInstruccion: (st.nivelInstruccion || data.nivelInstruccion || "BACHILLER").toUpperCase(),
        horarioTeoria: this.cleanHorarioTeoria(String(st.horarioTeoria || st.horarioTeorico || hTeorico || "").split("|")[0]!.trim()),
        horarioTeorico: this.cleanHorarioTeoria(String(st.horarioTeoria || st.horarioTeorico || hTeorico || "").split("|")[0]!.trim()),
        horarioPractica: String(st.horarioPractica || st.horarioPractico || hPractico || "").split("|")[0]!.trim(),
        horarioPractico: String(st.horarioPractica || st.horarioPractico || hPractico || "").split("|")[0]!.trim(),
        observaciones: st.observaciones || data.observaciones || "",
        numeroPermiso: (() => {
          const raw = st.numeroPermiso ?? st.permisoAprendizaje ?? st.numero_permiso ?? st.permiso ?? data.numeroPermiso ?? data.permisoAprendizaje ?? "0";
          const clean = String(raw).replace(/^PERM-?/i, "").trim();
          return (!clean || clean === "undefined" || clean === "null") ? "0" : clean;
        })(),
        permisoAprendizaje: (() => {
          const raw = st.numeroPermiso ?? st.permisoAprendizaje ?? st.numero_permiso ?? st.permiso ?? data.numeroPermiso ?? data.permisoAprendizaje ?? "0";
          const clean = String(raw).replace(/^PERM-?/i, "").trim();
          return (!clean || clean === "undefined" || clean === "null") ? "0" : clean;
        })(),
        numeroPermisoAprendizaje: (() => {
          const raw = st.numeroPermiso ?? st.permisoAprendizaje ?? st.numero_permiso ?? st.permiso ?? data.numeroPermiso ?? data.permisoAprendizaje ?? "0";
          const clean = String(raw).replace(/^PERM-?/i, "").trim();
          return (!clean || clean === "undefined" || clean === "null") ? "0" : clean;
        })(),
        numero_permiso: (() => {
          const raw = st.numeroPermiso ?? st.permisoAprendizaje ?? st.numero_permiso ?? st.permiso ?? data.numeroPermiso ?? data.permisoAprendizaje ?? "0";
          const clean = String(raw).replace(/^PERM-?/i, "").trim();
          return (!clean || clean === "undefined" || clean === "null") ? "0" : clean;
        })(),
        notaEdVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.notaEducacionVial ?? data.edVial ?? data.notaEdVial ?? 20),
        notaEducacionVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.notaEducacionVial ?? data.edVial ?? data.notaEdVial ?? 20),
        edVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.notaEducacionVial ?? data.edVial ?? data.notaEdVial ?? 20),
        educacionVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.notaEducacionVial ?? data.edVial ?? data.notaEdVial ?? 20),
        nota_ed_vial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.notaEducacionVial ?? data.edVial ?? data.notaEdVial ?? 20),

        notaMecanica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.notaMecanicaBasica ?? data.mecanica ?? data.notaMecanica ?? 20),
        notaMecanicaBasica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.notaMecanicaBasica ?? data.mecanica ?? data.notaMecanica ?? 20),
        mecanica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.notaMecanicaBasica ?? data.mecanica ?? data.notaMecanica ?? 20),
        mecanicaBasica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.notaMecanicaBasica ?? data.mecanica ?? data.notaMecanica ?? 20),
        nota_mecanica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.notaMecanicaBasica ?? data.mecanica ?? data.notaMecanica ?? 20),

        notaPAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? st.notaPrimerosAuxilios ?? data.primerosAuxilios ?? data.notaPAuxilios ?? 20),
        notaPrimerosAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? st.notaPrimerosAuxilios ?? data.primerosAuxilios ?? data.notaPAuxilios ?? 20),
        pAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? st.notaPrimerosAuxilios ?? data.primerosAuxilios ?? data.notaPAuxilios ?? 20),
        primerosAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? st.notaPrimerosAuxilios ?? data.primerosAuxilios ?? data.notaPAuxilios ?? 20),
        nota_p_auxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? st.notaPrimerosAuxilios ?? data.primerosAuxilios ?? data.notaPAuxilios ?? 20),

        notaPsicologia: this.formatNotaMateria(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? data.psicologia ?? data.notaPsicologia ?? 20),
        psicologia: this.formatNotaMateria(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? data.psicologia ?? data.notaPsicologia ?? 20),
        nota_psicologia: this.formatNotaMateria(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? data.psicologia ?? data.notaPsicologia ?? 20),

        notaPromedio: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        promedio: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        promedioTeorico: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        nota_promedio: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        promedio_teorico: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        notaTeoria: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        nota_teoria: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        notaTeorica: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),
        nota_teorica: (() => {
          const ev = Number(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? st.ed_vial ?? data.edVial ?? 20);
          const mc = Number(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? st.mecanica ?? data.mecanica ?? 20);
          const pa = Number(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? st.primeros_auxilios ?? data.primerosAuxilios ?? 20);
          const ps = Number(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? st.psicologia ?? data.psicologia ?? 20);
          const calcAvg = (ev + mc + pa + ps) / 4;
          const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? st.notaTeoria ?? st.nota_teoria ?? st.notaTeorica ?? data.notaPromedio ?? data.promedioTeorico ?? calcAvg;
          return this.formatNotaFinalDecimal(raw);
        })(),

        notaPractica: (() => {
          const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? data.notaPractica ?? data.nota_practica ?? 20;
          return this.formatNotaFinalDecimal(raw);
        })(),
        practica: (() => {
          const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? data.notaPractica ?? data.nota_practica ?? 20;
          return this.formatNotaFinalDecimal(raw);
        })(),
        nota_practica: (() => {
          const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? data.notaPractica ?? data.nota_practica ?? 20;
          return this.formatNotaFinalDecimal(raw);
        })(),
        examenPractico: (() => {
          const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? data.notaPractica ?? data.nota_practica ?? 20;
          return this.formatNotaFinalDecimal(raw);
        })(),
      };
    });
  }

  private buildUniversalTemplateData(options: {
    course?: any;
    students?: any[];
    oficioNumero?: string;
    oficioMatriz?: string;
    fechaOficioMatriz?: string;
    remitenteOficio?: string;
    numeroTramite?: string;
    totalAprobados?: number;
    totalReprobados?: number;
    additionalData?: Record<string, any>;
  } = {}): Record<string, any> {
    const storeConfig = useApp.getState().config;

    const targetCourse = options.course || {};
    const inputStudents = options.students && options.students.length > 0
      ? options.students
      : (options.additionalData?.students || options.additionalData?.estudiantes || []);

    const mappedStudents = inputStudents.length > 0
      ? this.mapAndSortStudents(inputStudents, options.additionalData || {}, targetCourse, storeConfig)
      : [];

    const firstSt = mappedStudents[0] || {};
    const lastSt = mappedStudents[mappedStudents.length - 1] || firstSt;

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaActualHoy = this.formatDateLong(todayIso);
    const todayDate = new Date();
    const fechaCorta = `${String(todayDate.getDate()).padStart(2, "0")}/${String(todayDate.getMonth() + 1).padStart(2, "0")}/${todayDate.getFullYear()}`;

    const cInicioRaw = targetCourse.inicioCurso || targetCourse.fechaCursoInicio || options.additionalData?.cursoInicio || options.additionalData?.fechaCursoInicio || "27/07/2026";
    const cFinRaw = targetCourse.finCurso || targetCourse.fechaCursoFin || options.additionalData?.cursoFin || options.additionalData?.fechaCursoFin || "04/08/2026";
    const mInicioRaw = targetCourse.inicioMatricula || targetCourse.inicioMatriculas || targetCourse.fechaMatriculaInicio || options.additionalData?.matriculaInicio || options.additionalData?.fechaMatriculaInicio || "13/07/2026";
    const mFinRaw = targetCourse.finMatricula || targetCourse.finMatriculas || targetCourse.fechaMatriculaFin || options.additionalData?.matriculaFin || options.additionalData?.fechaMatriculaFin || "21/07/2026";

    const cInicio = this.formatDateExcel(cInicioRaw, "27/07/2026");
    const cFin = this.formatDateExcel(cFinRaw, "04/08/2026");
    const mInicio = this.formatDateExcel(mInicioRaw, "13/07/2026");
    const mFin = this.formatDateExcel(mFinRaw, "21/07/2026");
    const cursoFinAntText = this.subtractOneDay(cFinRaw);

    const insts = storeConfig?.instructores || [];
    const edVialInst = insts.find((i: any) => /vial/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.edVial || "Francisco Ortuño";
    const mecanicaInst = insts.find((i: any) => /mec/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.mecanica || "Mario Peralvo";
    const pAuxiliosInst = insts.find((i: any) => /auxilio/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.pAuxilios || "Dr. Rafael Parra";
    const psicologiaInst = insts.find((i: any) => /psico/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.psicologia || "Luis De La Torre";

    const cantidadNum = mappedStudents.length;
    const spanishNumbers: Record<number, string> = {
      1: "UN", 2: "DOS", 3: "TRES", 4: "CUATRO", 5: "CINCO", 6: "SEIS", 7: "SIETE", 8: "OCHO", 9: "NUEVE", 10: "DIEZ",
      11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO",
      19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO", 25: "VEINTICINCO"
    };
    const cantidadTexto = spanishNumbers[cantidadNum] || String(cantidadNum);

    const hPracticoRaw = options.additionalData?.horarioPractico || options.additionalData?.horarioPractica || targetCourse.horarioPractica || targetCourse.horarioPractico || "14H00-16H00";
    const hTeoricoRaw = options.additionalData?.horarioTeorico || options.additionalData?.horarioTeoria || targetCourse.horarioTeoria || targetCourse.horarioTeorico || "18H00-20H00";
    const hPractico = String(hPracticoRaw).split("|")[0]!.trim();
    const hTeorico = this.cleanHorarioTeoria(String(hTeoricoRaw).split("|")[0]!.trim());

    const logoUrl = storeConfig?.escuela?.logoUrl || "";

    const primerUltimoText = mappedStudents.length > 0
      ? `${firstSt.estudianteNombre || firstSt.fullName || ""} hasta ${lastSt.estudianteNombre || lastSt.fullName || ""}`
      : "";

    return {
      // === FECHAS ===
      fechaActual: fechaActualHoy,
      fechaHoy: fechaActualHoy,
      fechaSistema: fechaActualHoy,
      fechaEmision: fechaActualHoy,
      fechaEmisionLarga: fechaActualHoy,
      fechaEmisionCorta: fechaCorta,

      // === ESCUELA ===
      escuelaNombre: storeConfig?.escuela?.nombre || "Drive Academy S.A",
      escuelaSucursal: storeConfig?.escuela?.sucursal || "Condado",
      resolucionAnt: storeConfig?.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig?.escuela?.resolucion || "18 DCTS-ANT-2013",
      logoEscuela: logoUrl || ANT_LOGO_BASE64,
      logo_escuela: logoUrl || ANT_LOGO_BASE64,
      logoUrl: logoUrl || ANT_LOGO_BASE64,

      // === FIRMAS ===
      directorNombre: storeConfig?.firmas?.director?.nombre || "Ing. Marco Villacís",
      directorCargo: storeConfig?.firmas?.director?.cargo || "Director General",
      directorAntNombre: storeConfig?.firmas?.directorAnt?.nombre || "Espíndola Lara Oscar Omar",
      directorAntCargo: storeConfig?.firmas?.directorAnt?.cargo || "Director Provincial",
      cargoAnt: storeConfig?.firmas?.directorAnt?.cargo || "Director Provincial",
      secretariaNombre: storeConfig?.firmas?.secretaria?.nombre || "Lcda. Andrea Suárez",
      secretariaCargo: storeConfig?.firmas?.secretaria?.cargo || "Secretaria",
      representanteNombre: storeConfig?.firmas?.representante?.nombre || "Leonidas Francisco Ortuño",
      representanteCargo: storeConfig?.firmas?.representante?.cargo || "Representante Legal",

      // === INSTRUCTORES ===
      instructorEdVial: edVialInst,
      instructorMecanica: mecanicaInst,
      instructorPAuxilios: pAuxiliosInst,
      instructorPsicologia: psicologiaInst,
      instEdVial: edVialInst,
      instMecanica: mecanicaInst,
      instPAuxilios: pAuxiliosInst,
      instPsicologia: psicologiaInst,

      // === CURSO ===
      cursoNombre: targetCourse.nombre || options.additionalData?.cursoNombre || options.additionalData?.curso || "DAIC 020 2026",
      tipoLicencia: (targetCourse.tipoLicencia || options.additionalData?.tipoLicencia || options.additionalData?.categoria || "B").replace(/^TIPO\s*/i, ""),
      cursoInicio: cInicio,
      cursoFin: cFin,
      fechaCursoInicio: cInicio,
      fechaCursoFin: cFin,
      cursoStart: cInicio,
      cursoEnd: cFin,

      // === MATRÍCULA ===
      matriculaInicio: mInicio,
      matriculaFin: mFin,
      fechaMatriculaInicio: mInicio,
      fechaMatriculaFin: mFin,
      matriculaStart: mInicio,
      matriculaEnd: mFin,
      inicioMatriculas: mInicio,
      finMatriculas: mFin,
      finMatriculasLargo: this.formatDateFullSpanish(mFinRaw),
      matriculaFinLargo: this.formatDateFullSpanish(mFinRaw),
      finDeMatriculasLargo: this.formatDateFullSpanish(mFinRaw),
      cursoFinAnterior: cursoFinAntText,
      cursoFinPrevio: cursoFinAntText,
      fechaFinAnterior: cursoFinAntText,
      cursoFinMenosUnDia: cursoFinAntText,

      // === HORARIOS ===
      horarioPractico: hPractico,
      horarioPractica: hPractico,
      horarioTeorico: hTeorico,
      horarioTeoria: hTeorico,

      // === ESTUDIANTES ===
      estudiantes: mappedStudents,
      cantidadEstudiantes: cantidadNum,
      cantidadEstudiantesTexto: cantidadTexto,
      cantidadEstudiantesPalabras: cantidadTexto,
      totalAprobados: options.totalAprobados ?? cantidadNum,
      totalReprobados: options.totalReprobados ?? 0,

      // === PRIMER ESTUDIANTE ===
      estudianteNombre: firstSt.estudianteNombre || firstSt.fullName || firstSt.nombres || "",
      notaTeoria: firstSt.notaPromedio || firstSt.promedioTeorico || firstSt.promedio || "",
      notaPractica: firstSt.notaPractica || firstSt.practica || firstSt.examenPractico || "",
      ...firstSt,

      // === OFICIO ===
      oficioNumero: options.oficioNumero || options.additionalData?.oficioNumero || options.additionalData?.oficio_numero || "1152",
      oficio_numero: options.oficioNumero || options.additionalData?.oficioNumero || options.additionalData?.oficio_numero || "1152",
      oficioMatriz: options.oficioMatriz || options.additionalData?.oficioMatriz || "",
      fechaOficioMatriz: options.fechaOficioMatriz || options.additionalData?.fechaOficioMatriz || fechaActualHoy,
      remitenteOficio: options.remitenteOficio || options.additionalData?.remitenteOficio || "",

      // === TRÁMITE ===
      numeroTramite: options.numeroTramite || options.additionalData?.numeroTramite || "",
      numero_tramite: options.numeroTramite || options.additionalData?.numero_tramite || "",
      tramiteNumero: options.numeroTramite || options.additionalData?.tramiteNumero || "",
      numeroTramiteIngreso: options.numeroTramite || options.additionalData?.numeroTramiteIngreso || "",

      // === UTILIDADES ===
      periodo: this.formatPeriodo(cInicioRaw, cFinRaw),
      periodoCurso: this.formatPeriodo(cInicioRaw, cFinRaw),
      primerUltimoEstudiante: primerUltimoText,
      primerEstudianteUltimoEstudiante: primerUltimoText,
      rangoEstudiantes: primerUltimoText,

      // === EXTRAS ===
      ...options.additionalData,
    };
  }

  private async renderDocxTemplate(templateRelativePath: string, templateData: any, outputPath: string, isSingleDoc: boolean = false): Promise<string> {
    console.log("[WordGenerator] Rellenando plantilla oficial docxtemplater:", templateRelativePath, "->", outputPath);

    const cleanPath = templateRelativePath.replace(/^\/+/, "");
    let arrayBuffer: ArrayBuffer | null = null;

    // 1. CARGA DESDE LA CARPETA DE PLANTILLAS EDITABLES DE APPDATA (Con fallback empaquetado)
    try {
      arrayBuffer = await TemplateStorage.getInstance().getTemplateArrayBuffer(cleanPath);
      console.log(`[WordGenerator] Plantilla '${cleanPath}' cargada exitosamente vía TemplateStorage.`);
    } catch (err) {
      console.warn(`[WordGenerator] Error al cargar plantilla vía TemplateStorage:`, err);
    }

    if (!arrayBuffer) {
      throw new Error(`No se pudo cargar la plantilla oficial Word desde '${templateRelativePath}'`);
    }

    const storeConfig = useApp.getState().config;
    const logoUrl = storeConfig?.escuela?.logoUrl || "";

    const zip = new PizZip(arrayBuffer);
    const mainImgMod = this.createImageModule();

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      modules: mainImgMod ? [mainImgMod] : [],
      parser: (tag: string) => {
        if (typeof tag === "string" && (tag.startsWith("logoEscuela") || tag.startsWith("%logoEscuela"))) {
          return {
            get: (scope: any) => scope.logoEscuela || scope.logoUrl,
          };
        }
        return {
          get: (scope: any) => {
            if (tag === ".") return scope;
            return scope ? scope[tag] : "";
          },
        };
      },
    });

    const defaultFirmasData: Record<string, string> = {};
    if (storeConfig?.firmas) {
      Object.entries(storeConfig.firmas).forEach(([k, val]) => {
        defaultFirmasData[`${k}Nombre`] = val.nombre || "";
        defaultFirmasData[`${k}Cargo`] = val.cargo || "";
      });
    }

    // Regla 1 (Prioridad): buildUniversalTemplateData base -> templateData específico -> defaultFirmasData / fallback
    const universalBase = this.buildUniversalTemplateData({
      additionalData: templateData,
    });

    const mergedData = {
      ...universalBase,
      ...templateData,
      ...defaultFirmasData,
    };

    const fechaActualHoy = mergedData.fechaActual || this.formatDateLong(new Date().toISOString().split("T")[0]);

    // Formatear automáticamente marcas X1 (Cédula), X2 (Pasaporte), fechaNacimientoLarga y fechaActual
    if (Array.isArray(mergedData.estudiantes)) {
      mergedData.estudiantes = mergedData.estudiantes.map((st: any) => {
        const docTypeRaw = String(st.tipoDocumento || st.documentoTipo || st.tipo_documento || "").toLowerCase();
        const isPasaporte = docTypeRaw.includes("pasaporte");
        const isCedula = !isPasaporte;
        const tipoDocNombre = isPasaporte ? "Pasaporte" : "Cédula";
        const tipoDocCorta = isPasaporte ? "PAS." : "CC.";
        const tipoDocAbv = isPasaporte ? "PAS" : "CC";
        const fnRaw = st.fechaNacimiento || st.birthDate || "";
        return {
          ...st,
          tipoDocumento: st.tipoDocumento || tipoDocNombre,
          tipo_documento: st.tipo_documento || tipoDocNombre,
          tipoDocumentoNombre: tipoDocNombre,
          tipoDocumentoTexto: tipoDocNombre,
          tipoDocumentoCorta: tipoDocCorta,
          tipoDocCorta: tipoDocCorta,
          tipoDocumentoAbv: tipoDocAbv,
          documentoTipo: tipoDocNombre,
          tipoSangre: this.formatTipoSangre(st.tipoSangre || st.sangre),
          fechaNacimientoLarga: this.formatDateLong(fnRaw),
          fechaActual: fechaActualHoy,
          fechaHoy: fechaActualHoy,
          fechaSistema: fechaActualHoy,
          X1: isCedula ? "X" : "",
          X2: isPasaporte ? "X" : "",
          x1: isCedula ? "X" : "",
          x2: isPasaporte ? "X" : "",
          marcaCedula: isCedula ? "( X )" : "(   )",
          marcaPasaporte: isPasaporte ? "( X )" : "(   )",
          lentes: String(st.lentes || "No").toUpperCase().includes("S") ? "SÍ" : "NO",
          usaLentes: String(st.lentes || "No").toUpperCase().includes("S") ? "SÍ" : "NO",
          usarLentes: String(st.lentes || "No").toUpperCase().includes("S") ? "SÍ" : "NO",
          lentesTexto: String(st.lentes || "No").toUpperCase().includes("S") ? "SÍ" : "NO",
          marcaLentes: String(st.lentes || "No").toUpperCase().includes("S") ? "( X )" : "(   )",
          lentesSi: String(st.lentes || "No").toUpperCase().includes("S") ? "X" : "",
          lentesNo: String(st.lentes || "No").toUpperCase().includes("S") ? "" : "X",
          notaEdVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? st.nota_ed_vial ?? st.educacionVial ?? 20),
          notaEducacionVial: this.formatNotaMateria(st.educacionVial ?? st.notaEdVial ?? st.edVial ?? 20),
          edVial: this.formatNotaMateria(st.edVial ?? st.notaEdVial ?? 20),
          educacionVial: this.formatNotaMateria(st.educacionVial ?? st.edVial ?? 20),
          nota_ed_vial: this.formatNotaMateria(st.nota_ed_vial ?? st.edVial ?? 20),

          notaMecanica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? st.nota_mecanica ?? st.mecanicaBasica ?? 20),
          notaMecanicaBasica: this.formatNotaMateria(st.mecanicaBasica ?? st.notaMecanica ?? st.mecanica ?? 20),
          mecanica: this.formatNotaMateria(st.mecanica ?? st.notaMecanica ?? 20),
          mecanicaBasica: this.formatNotaMateria(st.mecanicaBasica ?? st.mecanica ?? 20),
          nota_mecanica: this.formatNotaMateria(st.nota_mecanica ?? st.mecanica ?? 20),

          notaPAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? st.nota_p_auxilios ?? 20),
          notaPrimerosAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? st.notaPAuxilios ?? 20),
          pAuxilios: this.formatNotaMateria(st.pAuxilios ?? st.primerosAuxilios ?? st.notaPAuxilios ?? 20),
          primerosAuxilios: this.formatNotaMateria(st.primerosAuxilios ?? st.pAuxilios ?? 20),
          nota_p_auxilios: this.formatNotaMateria(st.nota_p_auxilios ?? st.pAuxilios ?? 20),

          notaPsicologia: this.formatNotaMateria(st.psicologia ?? st.notaPsicologia ?? st.nota_psicologia ?? 20),
          psicologia: this.formatNotaMateria(st.psicologia ?? st.notaPsicologia ?? 20),
          nota_psicologia: this.formatNotaMateria(st.nota_psicologia ?? st.psicologia ?? 20),

          notaPromedio: (() => {
            const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          promedio: (() => {
            const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          promedioTeorico: (() => {
            const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          nota_promedio: (() => {
            const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          promedio_teorico: (() => {
            const raw = st.notaPromedio ?? st.promedioTeorico ?? st.promedio ?? st.nota_promedio ?? st.promedio_teorico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),

          notaPractica: (() => {
            const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          practica: (() => {
            const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          nota_practica: (() => {
            const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
          examenPractico: (() => {
            const raw = st.notaPractica ?? st.practica ?? st.nota_practica ?? st.examenPractico ?? st.notaExamenPractico ?? 20;
            return this.formatNotaFinalDecimal(raw);
          })(),
        };
      });
    }

    if ((mergedData as any).tipoSangre) {
      (mergedData as any).tipoSangre = this.formatTipoSangre((mergedData as any).tipoSangre);
    }

    const mainLentesIsSi = String((mergedData as any).lentes || (mergedData as any).usaLentes || "No").toUpperCase().includes("S");
    const mainLentesVal = mainLentesIsSi ? "SÍ" : "NO";
    (mergedData as any).lentes = (mergedData as any).lentes || mainLentesVal;
    (mergedData as any).usaLentes = (mergedData as any).usaLentes || mainLentesVal;
    (mergedData as any).usarLentes = (mergedData as any).usarLentes || mainLentesVal;
    (mergedData as any).lentesTexto = (mergedData as any).lentesTexto || mainLentesVal;
    (mergedData as any).marcaLentes = (mergedData as any).marcaLentes || (mainLentesIsSi ? "( X )" : "(   )");
    (mergedData as any).lentesSi = (mergedData as any).lentesSi || (mainLentesIsSi ? "X" : "");
    (mergedData as any).lentesNo = (mergedData as any).lentesNo || (mainLentesIsSi ? "" : "X");

    const mainDocTypeRaw = String((mergedData as any).tipoDocumento || (mergedData as any).documentoTipo || (mergedData as any).tipo_documento || "").toLowerCase();
    const mainIsPasaporte = mainDocTypeRaw.includes("pasaporte");
    const mainIsCedula = !mainIsPasaporte;
    const mainTipoDocNombre = mainIsPasaporte ? "Pasaporte" : "Cédula";
    const mainTipoDocCorta = mainIsPasaporte ? "PAS." : "CC.";
    const mainTipoDocAbv = mainIsPasaporte ? "PAS" : "CC";

    (mergedData as any).tipoDocumento = (mergedData as any).tipoDocumento || mainTipoDocNombre;
    (mergedData as any).tipo_documento = (mergedData as any).tipo_documento || mainTipoDocNombre;
    (mergedData as any).tipoDocumentoNombre = (mergedData as any).tipoDocumentoNombre || mainTipoDocNombre;
    (mergedData as any).tipoDocumentoTexto = (mergedData as any).tipoDocumentoTexto || mainTipoDocNombre;
    (mergedData as any).tipoDocumentoCorta = (mergedData as any).tipoDocumentoCorta || mainTipoDocCorta;
    (mergedData as any).tipoDocCorta = (mergedData as any).tipoDocCorta || mainTipoDocCorta;
    (mergedData as any).tipoDocumentoAbv = (mergedData as any).tipoDocumentoAbv || mainTipoDocAbv;
    (mergedData as any).documentoTipo = (mergedData as any).documentoTipo || mainTipoDocNombre;

    const mainFnRaw = (mergedData as any).fechaNacimiento || (mergedData as any).birthDate || "";
    (mergedData as any).fechaNacimientoLarga = (mergedData as any).fechaNacimientoLarga || this.formatDateLong(mainFnRaw);

    (mergedData as any).X1 = (mergedData as any).X1 || (mainIsCedula ? "X" : "");
    (mergedData as any).X2 = (mergedData as any).X2 || (mainIsPasaporte ? "X" : "");
    (mergedData as any).x1 = (mergedData as any).x1 || (mainIsCedula ? "X" : "");
    (mergedData as any).x2 = (mergedData as any).x2 || (mainIsPasaporte ? "X" : "");
    (mergedData as any).marcaCedula = (mergedData as any).marcaCedula || (mainIsCedula ? "( X )" : "(   )");
    (mergedData as any).marcaPasaporte = (mergedData as any).marcaPasaporte || (mainIsPasaporte ? "( X )" : "(   )");

    const mainPromRaw = (mergedData as any).notaPromedio ?? (mergedData as any).promedioTeorico ?? (mergedData as any).promedio ?? (mergedData as any).promedio_teorico ?? (mergedData as any).nota_promedio ?? 20;
    const mainPromVal = this.formatNotaFinalDecimal(mainPromRaw);

    (mergedData as any).notaPromedio = mainPromVal;
    (mergedData as any).promedio = mainPromVal;
    (mergedData as any).promedioTeorico = mainPromVal;
    (mergedData as any).notaPromedioTeorico = mainPromVal;
    (mergedData as any).nota_promedio = mainPromVal;
    (mergedData as any).promedio_teorico = mainPromVal;

    const mainPracRaw = (mergedData as any).notaPractica ?? (mergedData as any).practica ?? (mergedData as any).nota_practica ?? (mergedData as any).examenPractico ?? (mergedData as any).notaExamenPractico ?? 20;
    const mainPracVal = this.formatNotaFinalDecimal(mainPracRaw);

    (mergedData as any).notaPractica = (mergedData as any).notaPractica ?? mainPracVal;
    (mergedData as any).practica = (mergedData as any).practica ?? mainPracVal;
    (mergedData as any).nota_practica = (mergedData as any).nota_practica ?? mainPracVal;
    (mergedData as any).examenPractico = (mergedData as any).examenPractico ?? mainPracVal;
    (mergedData as any).notaExamenPractico = (mergedData as any).notaExamenPractico ?? mainPracVal;

    // Formatear automáticamente cualquier fecha YYYY-MM-DD a DD/MM/YYYY (ej. 27/7/2026)
    Object.keys(mergedData).forEach((key) => {
      const val = (mergedData as any)[key];
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
        const parts = val.trim().split("-");
        const y = parts[0] || "2026";
        const m = parts[1] || "01";
        const d = parts[2] || "01";
        (mergedData as any)[key] = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      }
    });

    // Reemplazar etiquetas en los archivos XML de Encabezados (header*.xml) y Pies (footer*.xml)
    Object.keys(zip.files).forEach((fileName) => {
      if (/^word\/(header|footer)\d*\.xml$/.test(fileName)) {
        try {
          let hXml = zip.file(fileName)?.asText() || "";
          if (hXml) {
            Object.entries(mergedData).forEach(([k, v]) => {
              if (typeof v === "string" || typeof v === "number") {
                const tagRegex = new RegExp(`\\{\\s*${k}\\s*\\}`, "g");
                hXml = hXml.replace(tagRegex, String(v));
              }
            });
            const resVal = String(mergedData.resolucionAnt || mergedData.resolucion || "18 DCTS-ANT-2013");
            hXml = hXml.replace(/\{[^}]*resolucionAnt[^}]*\}/gi, resVal);
            hXml = hXml.replace(/\{[^}]*resolucion[^}]*\}/gi, resVal);
            hXml = hXml.replace(/\{%?logoEscuela[^}]*\}/gi, "");
            zip.file(fileName, hXml);
          }
        } catch (e) {
          console.warn("[WordGenerator] Error al procesar encabezado/pie:", fileName, e);
        }
      }
    });

    const initialXml = zip.file("word/document.xml")?.asText() || "";
    const hasLoopTags = /\{#[a-zA-Z0-9_-]+\}/.test(initialXml);

    if (!isSingleDoc && !hasLoopTags && Array.isArray(mergedData.estudiantes) && mergedData.estudiantes.length > 1) {
      const studentBodies: string[] = [];
      let finalSectPr = "";

      for (let i = 0; i < mergedData.estudiantes.length; i++) {
        const st = mergedData.estudiantes[i];
        const studentName = (st.estudianteNombre || st.fullName || st.nombres || st.nombre_estudiante || st.nombre || "").toUpperCase();
        const studentCedula = st.cedula || st.pasaporte || st.numeroDocumento || st.documento || "";
        const studentFnRaw = st.fechaNacimiento || st.fecha_nacimiento || st.nacimiento || st.birthDate || "";

        const docTypeRaw = String(st.tipoDocumento || st.documentoTipo || st.tipo_documento || mergedData.tipoDocumento || "").toLowerCase();
        const isPasaporte = docTypeRaw.includes("pasaporte");
        const isCedula = !isPasaporte;
        const tipoDocNombre = isPasaporte ? "Pasaporte" : "Cédula";
        const tipoDocCorta = isPasaporte ? "PAS." : "CC.";
        const tipoDocAbv = isPasaporte ? "PAS" : "CC";
        const valX1 = st.X1 || st.x1 || (isCedula ? "X" : "");
        const valX2 = st.X2 || st.x2 || (isPasaporte ? "X" : "");
        const valMarcaCedula = st.marcaCedula || (isCedula ? "( X )" : "(   )");
        const valMarcaPasaporte = st.marcaPasaporte || (isPasaporte ? "( X )" : "(   )");

        const studentPhone = st.celular || st.phone || st.telefono || st.movil || "";
        const studentEmail = st.email || st.correo || st.correoElectronico || "";
        const studentSangre = st.tipoSangre || st.tipo_sangre || st.sangre || "";
        const studentNacionalidad = st.nacionalidad || st.pais || "";
        const studentDireccion = st.direccion || st.direccionDomicilio || st.domicilio || "";
        const studentCanton = st.canton || "";

        const studentTeoria = st.notaPromedio || st.promedioTeorico || st.promedio || st.notaTeoria || st.nota_teoria || "";
        const studentPractica = st.notaPractica || st.practica || st.examenPractico || st.nota_practica || "";
        const studentFoto = st.foto || st.fotoUrl || st.imagen || "";

        const studentHorarioTeorico = st.horarioTeorico || st.horarioTeoria || mergedData.horarioTeorico || mergedData.horarioTeoria || "";
        const studentHorarioPractico = st.horarioPractico || st.horarioPractica || mergedData.horarioPractico || mergedData.horarioPractica || "";

        // Calcular número de acta directamente en el bucle (actaBase + i)
        const rawActaBase = mergedData.actaInicio ?? mergedData.numeroActa ?? mergedData.actaBase ?? mergedData.secuencialActa ?? storeConfig.secuenciales?.actas;
        let actaBase = parseInt(String(rawActaBase).replace(/\D/g, ""), 10);
        if (isNaN(actaBase) || actaBase <= 0) {
          actaBase = 3251;
        }
        const studentActaNum = String(actaBase + i);

        const singleData = {
          ...mergedData,
          ...st,

          // Sobrescribir explícitamente TODOS los campos del estudiante i (prioridad):
          n: st.n || (i + 1),
          actaNumero: studentActaNum,
          numeroActa: studentActaNum,
          numero_acta: studentActaNum,
          nroActa: studentActaNum,
          acta: studentActaNum,
          secuencialActa: studentActaNum,
          actaSecuencial: studentActaNum,
          numActa: studentActaNum,

          estudianteNombre: studentName,
          fullName: studentName,
          nombres: studentName,
          nombre: studentName,
          nombreEstudiante: studentName,
          nombre_estudiante: studentName,

          cedula: studentCedula,
          pasaporte: st.pasaporte || studentCedula,
          numeroDocumento: st.numeroDocumento || studentCedula,
          documento: st.documento || studentCedula,

          tipoDocumento: st.tipoDocumento || tipoDocNombre,
          tipo_documento: st.tipo_documento || tipoDocNombre,
          tipoDocumentoNombre: st.tipoDocumentoNombre || tipoDocNombre,
          tipoDocumentoTexto: st.tipoDocumentoTexto || tipoDocNombre,
          tipoDocumentoCorta: st.tipoDocumentoCorta || tipoDocCorta,
          tipoDocCorta: st.tipoDocCorta || tipoDocCorta,
          tipoDocumentoAbv: st.tipoDocumentoAbv || tipoDocAbv,
          documentoTipo: st.documentoTipo || tipoDocNombre,
          X1: valX1,
          X2: valX2,
          x1: valX1,
          x2: valX2,
          marcaCedula: valMarcaCedula,
          marcaPasaporte: valMarcaPasaporte,

          fechaNacimiento: st.fechaNacimiento || studentFnRaw,
          fechaNacimientoLarga: st.fechaNacimientoLarga || (studentFnRaw ? this.formatDateLong(studentFnRaw) : ""),
          edad: st.edad || "",
          sexo: st.sexo || "",
          nacionalidad: studentNacionalidad,
          tipoSangre: studentSangre,
          sangre: studentSangre,

          direccion: studentDireccion,
          canton: studentCanton,

          celular: studentPhone,
          phone: studentPhone,
          telefono: studentPhone,
          movil: studentPhone,
          celularEstudiante: st.celularEstudiante || studentPhone,
          telefonoEstudiante: st.telefonoEstudiante || studentPhone,
          email: studentEmail,
          correo: studentEmail,

          nivelInstruccion: st.nivelInstruccion || "",
          horarioTeoria: studentHorarioTeorico,
          horarioTeorico: studentHorarioTeorico,
          horarioPractica: studentHorarioPractico,
          horarioPractico: studentHorarioPractico,
          observaciones: st.observaciones || "",

          lentes: st.lentes,
          usaLentes: st.usaLentes,
          usarLentes: st.usarLentes,
          lentesTexto: st.lentesTexto,
          marcaLentes: st.marcaLentes,
          lentesSi: st.lentesSi,
          lentesNo: st.lentesNo,

          numeroPermiso: st.numeroPermiso,
          permisoAprendizaje: st.permisoAprendizaje,
          numeroPermisoAprendizaje: st.numeroPermisoAprendizaje,
          numero_permiso: st.numero_permiso,

          edVial: st.edVial,
          notaEdVial: st.notaEdVial,
          notaEducacionVial: st.notaEducacionVial,
          educacionVial: st.educacionVial,
          nota_ed_vial: st.nota_ed_vial,

          mecanica: st.mecanica,
          notaMecanica: st.notaMecanica,
          notaMecanicaBasica: st.notaMecanicaBasica,
          mecanicaBasica: st.mecanicaBasica,
          nota_mecanica: st.nota_mecanica,

          pAuxilios: st.pAuxilios,
          primerosAuxilios: st.primerosAuxilios,
          notaPAuxilios: st.notaPAuxilios,
          notaPrimerosAuxilios: st.notaPrimerosAuxilios,
          nota_p_auxilios: st.nota_p_auxilios,

          psicologia: st.psicologia,
          notaPsicologia: st.notaPsicologia,
          nota_psicologia: st.nota_psicologia,

          notaTeoria: studentTeoria,
          notaTeorica: st.notaTeorica || studentTeoria,
          nota_teoria: st.nota_teoria || studentTeoria,
          nota_teorica: st.nota_teorica || studentTeoria,
          notaPromedio: st.notaPromedio || studentTeoria,
          promedio: st.promedio || studentTeoria,
          promedioTeorico: st.promedioTeorico || studentTeoria,
          nota_promedio: st.nota_promedio || studentTeoria,
          promedio_teorico: st.promedio_teorico || studentTeoria,

          notaPractica: studentPractica,
          practica: st.practica || studentPractica,
          nota_practica: st.nota_practica || studentPractica,
          examenPractico: st.examenPractico || studentPractica,

          foto: studentFoto,
          fotoUrl: st.fotoUrl || studentFoto,
          imagen: st.imagen || studentFoto,
        };
        delete singleData.estudiantes;

        const singleZip = new PizZip(arrayBuffer);
        const singleImgMod = this.createImageModule();
        const singleDoc = new Docxtemplater(singleZip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => "",
          modules: singleImgMod ? [singleImgMod] : [],
          parser: (tag: string) => {
            if (typeof tag === "string" && (tag.startsWith("logoEscuela") || tag.startsWith("%logoEscuela"))) {
              return {
                get: (scope: any) => scope.logoEscuela || scope.logoUrl,
              };
            }
            return {
              get: (scope: any) => {
                if (tag === ".") return scope;
                return scope ? scope[tag] : "";
              },
            };
          },
        });
        singleDoc.render(singleData);

        // ─── COPIAR HEADERS MODIFICADOS DESDE singleZip HACIA zip PRINCIPAL ───
        // El bucle solo extrae el <w:body> de cada estudiante. Si la plantilla
        // tiene el logo en el header, debemos copiar los headers modificados
        // al zip principal para que aparezcan en el documento final.
        // Solo necesitamos hacerlo una vez (primer estudiante) porque el logo
        // de la escuela es el mismo para todas las páginas.
        
        if (i === 0) {
          Object.keys(singleZip.files).forEach((fileName) => {
            // 1. Copiar archivos de header (header1.xml, header2.xml, etc.)
            if (fileName.startsWith("word/header") && fileName.endsWith(".xml")) {
              const headerContent = singleZip.file(fileName)?.asText();
              if (headerContent) {
                zip.file(fileName, headerContent);
              }
            }
            // 2. Copiar relaciones de headers (header1.xml.rels, etc.)
            // El ImageModule guarda las relaciones de imagen aquí cuando el logo
            // está en el header, NO en document.xml.rels
            if (fileName.startsWith("word/_rels/header") && fileName.endsWith(".xml.rels")) {
              const relsContent = singleZip.file(fileName)?.asText();
              if (relsContent) {
                zip.file(fileName, relsContent);
              }
            }
          });
        }
        // ───────────────────────────────────────────────────────────────────────

        // ─── COPIAR IMÁGENES Y RELACIONES DESDE singleZip HACIA zip PRINCIPAL ───
        // El ImageModule guarda la imagen en singleZip, pero el XML del body
        // se extrae y se pega en zip. Necesitamos copiar los archivos de media
        // y las relaciones para que las imágenes no aparezcan rotas.
        
        // 1. Copiar archivos de media (word/media/*) desde singleZip hacia zip
        Object.keys(singleZip.files).forEach((fileName) => {
          if (fileName.startsWith("word/media/")) {
            const mediaContent = singleZip.file(fileName)?.asArrayBuffer() || singleZip.file(fileName)?.asUint8Array();
            if (mediaContent) {
              zip.file(fileName, mediaContent);
            }
          }
        });

        // 2. Fusionar relaciones XML desde singleZip hacia zip
        const singleRels = singleZip.file("word/_rels/document.xml.rels")?.asText() || "";
        let outerRels = zip.file("word/_rels/document.xml.rels")?.asText() || "";
        
        if (singleRels && outerRels) {
          // Extraer todos los <Relationship ... /> de singleRels
          const singleMatches = singleRels.match(/<Relationship[^>]*\/>/g) || [];
          singleMatches.forEach((relTag) => {
            const idMatch = relTag.match(/Id="([^"]+)"/);
            if (idMatch && idMatch[1] && !outerRels.includes(`Id="${idMatch[1]}"`)) {
              // Insertar antes de </Relationships>
              outerRels = outerRels.replace("</Relationships>", `${relTag}\n</Relationships>`);
            }
          });
          zip.file("word/_rels/document.xml.rels", outerRels);
        }
        // ───────────────────────────────────────────────────────────────────────

        const singleXml = singleZip.file("word/document.xml")?.asText() || "";
        const bodyMatch = singleXml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/i);
        let bInner: string = (bodyMatch && bodyMatch[1]) ? bodyMatch[1] : "";

        const sectMatch = bInner.match(/<w:sectPr[\s\S]*<\/w:sectPr>/i);
        if (sectMatch && !finalSectPr) {
          finalSectPr = sectMatch[0];
        }
        bInner = bInner.replace(/<w:sectPr[\s\S]*<\/w:sectPr>/i, "");
        bInner = bInner.replace(/(?:<w:p[^>]*>\s*<w:r[^>]*>\s*<w:br\s+w:type="page"\/>\s*<\/w:r>\s*<\/w:p>\s*)+$/i, "");
        bInner = bInner.replace(/(?:<w:br\s+w:type="page"\/>\s*)+$/i, "").trim();

        studentBodies.push(bInner);
      }

      const combinedBody = studentBodies.join('<w:p><w:r><w:br w:type="page"/></w:r></w:p>') + (finalSectPr || "");
      const finalXml = initialXml.replace(/<w:body[^>]*>[\s\S]*<\/w:body>/i, `<w:body>${combinedBody}</w:body>`);

      zip.file("word/document.xml", finalXml);
      const buf = zip.generate({
        type: "uint8array",
        compression: "DEFLATE",
      });

      await LocalFileStorage.getInstance().saveFile(outputPath, buf);
      return outputPath;
    }

    doc.render(mergedData);

    const buf = doc.getZip().generate({
      type: "uint8array",
      compression: "DEFLATE",
    });

    await LocalFileStorage.getInstance().saveFile(outputPath, buf);
    return outputPath;
  }

  // 1. Oficio de Autorización (Plantilla Fase 1)
  public async generateOficioAutorizacion(
    data: {
      fecha: string;
      oficioNumero: string;
      directorAnt: string;
      cargoAnt?: string;
      directorAntTitulo?: string;
      curso: string;
      cantidad: number;
      categoria: string;
      representante: string;
      escuela: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      sucursal?: string;
      fechaInicio?: string;
      fechaFin?: string;
    },
    outputPath: string
  ): Promise<string> {
    const storeConfig = useApp.getState().config;
    const cantidadNum = data.cantidad || 23;

    const templateData = this.buildUniversalTemplateData({
      oficioNumero: data.oficioNumero || "1152",
      additionalData: {
        fechaEmision: data.fecha || undefined,
        fechaEmisionLarga: data.fecha || undefined,
        directorAntNombre: data.directorAnt || storeConfig.firmas?.directorAnt?.nombre,
        directorAntCargo: data.cargoAnt || storeConfig.firmas?.directorAnt?.cargo,
        escuelaNombre: storeConfig.escuela?.nombre,
        escuelaSucursal: data.sucursal || storeConfig.escuela?.sucursal,
        cursoNombre: data.curso,
        cursoInicio: data.fechaInicio,
        cursoFin: data.fechaFin,
        cantidadEstudiantes: cantidadNum,
        tipoLicencia: (data.categoria || "B").replace(/^TIPO\s*/i, ""),
        representanteNombre: data.representante || storeConfig.firmas?.representante?.nombre,
        representanteCargo: storeConfig.firmas?.representante?.cargo,
      },
    });

    return this.renderDocxTemplate("Fase 1/OficioAutorizacionCompra.docx", templateData, outputPath, true);
  }

  // 2. Oficio de Compra de Permisos (Plantilla Fase 1)
  public async generateOficioCompra(
    data: {
      fecha: string;
      oficioNumero: string;
      directorAnt?: string;
      cargoAnt?: string;
      directorAntTitulo?: string;
      curso: string;
      cantidad?: number;
      categoria?: string;
      representante?: string;
      escuela?: string;
      sucursal?: string;
      oficioMatriz?: string;
      fechaOficioMatriz?: string;
      remitenteOficio?: string;
      estudiantes?: { nombre: string; cedula: string }[];
    },
    outputPath: string
  ): Promise<string> {
    const storeConfig = useApp.getState().config;
    const cantidadNum = data.cantidad || (data.estudiantes ? data.estudiantes.length : 23);

    const templateData = this.buildUniversalTemplateData({
      oficioNumero: data.oficioNumero || "1151",
      oficioMatriz: data.oficioMatriz || "ANT-DPPIC-2026-6528-OF",
      fechaOficioMatriz: data.fechaOficioMatriz || "06 de julio 2026",
      remitenteOficio: data.remitenteOficio || "Director De La Dirección Provincial De Pichincha",
      students: data.estudiantes,
      additionalData: {
        fechaEmision: data.fecha || undefined,
        directorAntNombre: data.directorAnt || storeConfig.firmas?.directorAnt?.nombre,
        directorAntCargo: data.cargoAnt || storeConfig.firmas?.directorAnt?.cargo,
        escuelaNombre: storeConfig.escuela?.nombre,
        escuelaSucursal: data.sucursal || storeConfig.escuela?.sucursal,
        cursoNombre: data.curso,
        cantidadEstudiantes: cantidadNum,
        tipoLicencia: (data.categoria || "B").replace(/^TIPO\s*/i, ""),
        representanteNombre: data.representante || storeConfig.firmas?.representante?.nombre,
        representanteCargo: storeConfig.firmas?.representante?.cargo,
      },
    });

    return this.renderDocxTemplate("Fase 1/OficioCompraPermisos.docx", templateData, outputPath, true);
  }

  private formatDateShortSlash(val?: string): string {
    if (!val) return "13/7/2026";
    const str = String(val).trim();
    if (!str) return "13/7/2026";

    if (str.includes("-")) {
      const datePart = str.split("T")[0] || "";
      const parts = datePart.split("-");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10) || 2026;
          const m = parseInt(parts[1], 10) || 7;
          const d = parseInt(parts[2], 10) || 13;
          return `${d}/${m}/${y}`;
        }
      }
    } else if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2].length === 4) {
          const d = parseInt(parts[0], 10) || 13;
          const m = parseInt(parts[1], 10) || 7;
          const y = parseInt(parts[2], 10) || 2026;
          return `${d}/${m}/${y}`;
        }
      }
    }
    return str;
  }

  // 3. Oficio de Legalización (Fase 3)
  public async generateOficioLegalizacion(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Generando Oficio de Legalización con plantilla Fase 3...", outputPath);

    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.curso || data.courseName || data.course?.nombre || data.cursoNombre;
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    let sourceStudents: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      if (targetCourseId || targetCourseName) {
        const found = storeEstudiantes.filter(
          (e: any) => (targetCourseId && e.cursoId === targetCourseId) || (targetCourseName && e.curso === targetCourseName)
        );
        if (found.length > 0) sourceStudents = found;
      }
      if (sourceStudents.length === 0 && storeEstudiantes.length > 0) {
        sourceStudents = storeEstudiantes;
      }
    }

    const studentsList = sourceStudents.length > 0 ? sourceStudents : [data];
    const numTramite = data.numeroTramite || data.numero_tramite || data.tramiteNumero || "00";

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: studentsList,
      oficioNumero: data.oficio_numero || data.oficioNumero || "2026-1163",
      numeroTramite: numTramite,
      totalAprobados: data.totalAprobados ?? data.total_aprobados,
      totalReprobados: data.totalReprobados ?? data.total_reprobados,
      fechaOficioMatriz: data.fechaOficioMatriz,
      additionalData: data,
    });

    try {
      return await this.renderDocxTemplate("Fase 3/OficioLegalizacion.docx", templateData, outputPath, true);
    } catch {
      return await this.renderDocxTemplate("Fase 1/OficioCompraPermisos.docx", templateData, outputPath, true);
    }
  }

  // 4. Acuerdo de Enseñanza de Aprendizaje (Fase 2/ACUERDO DE ENSEÑANZA.docx)
  public async generateAcuerdoEnsenanza(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Generando Acuerdo de Enseñanza a partir de plantilla oficial Fase 2/ACUERDO DE ENSEÑANZA.docx...", outputPath);

    const storeConfig = useApp.getState().config;
    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    // Buscar curso si existe para obtener fechas y horarios exactos
    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.curso || data.courseName || data.course?.nombre || data.cursoNombre;
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    let sourceStudents: any[] = [];

    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      if (targetCourseId || targetCourseName) {
        const found = storeEstudiantes.filter(
          (e: any) =>
            (targetCourseId && String(e.cursoId) === String(targetCourseId)) ||
            (targetCourseName && (e.curso === targetCourseName || String(e.cursoId) === String(targetCourseId)))
        );
        sourceStudents = found;
      }
    }

    const studentsList = sourceStudents.length > 0 ? sourceStudents : (data.students || data.estudiantes || [data]);

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: studentsList,
      additionalData: data,
    });

    return this.renderDocxTemplate("Fase 2/AcuerdoDeEnsenanza.docx", templateData, outputPath);
  }

  private generateCourseDates(startDateStr: string): string[] {
    let d: Date;
    if (startDateStr && startDateStr.includes("/")) {
      const parts = startDateStr.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        d = new Date(2026, 6, 27);
      }
    } else if (startDateStr && startDateStr.includes("-")) {
      d = new Date(startDateStr);
    } else {
      d = new Date(2026, 6, 27);
    }

    if (isNaN(d.getTime())) d = new Date(2026, 6, 27);

    const dates: string[] = [];
    const current = new Date(d);
    while (dates.length < 8) {
      if (current.getDay() !== 0) {
        const day = String(current.getDate()).padStart(2, "0");
        const month = String(current.getMonth() + 1).padStart(2, "0");
        dates.push(`${day}/${month}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private cleanHorarioTeoria(val?: string): string {
    if (!val) return "18H00-20H00";
    return val.replace(/^lunes\s+a\s+viernes\s*/i, "").trim();
  }

  private formatDateExcel(dStr?: string, fallback: string = "17/07/2003"): string {
    if (!dStr) return fallback;
    const str = String(dStr).trim();
    if (str.includes("/")) return str;
    if (str.includes("-")) {
      const datePart = str.split("T")[0] || "";
      const parts = datePart.split("-");
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
    return str || fallback;
  }

  // 4. Ficha Teórica (Fase 2/FICHA TEORIA.docx)
  public async generateFichaTeorica(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Generando Ficha Teórica a partir de plantilla oficial Fase 2/FICHA TEORIA.docx...", outputPath);

    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    // Buscar curso si existe para obtener fechas y horarios exactos
    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.curso || data.courseName || data.course?.nombre || data.cursoNombre;
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    let sourceStudents: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      const cId = String(targetCourseId || "").trim();
      const cName = String(targetCourseName || "").trim().toLowerCase();
      sourceStudents = storeEstudiantes.filter((e: any) => {
        const studentCourseId = String(e.cursoId || e.courseId || "").trim();
        const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
        if (cId && studentCourseId && cId === studentCourseId) return true;
        if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
        return false;
      });
    }

    const studentsList = sourceStudents.length > 0 ? sourceStudents : (data.students || data.estudiantes || [data]);

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: studentsList,
      additionalData: data,
    });

    return this.renderDocxTemplate("Fase 2/FichaTeorica.docx", templateData, outputPath);
  }

  // 6. Acta Parte 1 (Fase 2/PARTE 1 ACTA DE CALIFICACIONES.docx)
  public async generateActaParte1(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Generando Parte 1 Acta de Calificaciones a partir de plantilla oficial Fase 2/PARTE 1 ACTA DE CALIFICACIONES.docx...", outputPath);

    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    // Buscar curso si existe para obtener fechas y horarios exactos
    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.curso || data.courseName || data.course?.nombre || data.cursoNombre;
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    let sourceStudents: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      const cId = String(targetCourseId || "").trim();
      const cName = String(targetCourseName || "").trim().toLowerCase();
      sourceStudents = storeEstudiantes.filter((e: any) => {
        const studentCourseId = String(e.cursoId || e.courseId || "").trim();
        const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
        if (cId && studentCourseId && cId === studentCourseId) return true;
        if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
        return false;
      });
    }

    const studentsList = sourceStudents.length > 0 ? sourceStudents : (data.students || data.estudiantes || [data]);
    const storeConfig = useApp.getState().config;
    const actaBaseNum = Number(storeConfig.secuenciales?.actas) || 3251;

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: studentsList,
      additionalData: {
        ...data,
        actaInicio: actaBaseNum,
        numeroActa: actaBaseNum,
      },
    });

    return this.renderDocxTemplate("Fase 2/ActaParte1.docx", templateData, outputPath);
  }

  // 7. Acta Parte 2 (.docx)
  public async generateActaParte2(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Rellenando plantilla oficial docxtemplater: Fase 4/PARTE 2 ACTA DE CALIFICACIONES.docx ->", outputPath);

    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.courseName || data.course?.nombre || data.nombre_curso || data.curso || "DAIC 020 2026";
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    let sourceStudents: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      const cId = String(targetCourseId || "").trim();
      const cName = String(targetCourseName || "").trim().toLowerCase();
      sourceStudents = storeEstudiantes.filter((e: any) => {
        const studentCourseId = String(e.cursoId || e.courseId || "").trim();
        const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
        if (cId && studentCourseId && cId === studentCourseId) return true;
        if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
        return false;
      });
    }

    const rawList = sourceStudents.length > 0 ? sourceStudents : (data.students || data.estudiantes || [data]);

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: rawList,
      additionalData: data,
    });

    return this.renderDocxTemplate("Fase 4/ActaParte2.docx", templateData, outputPath);
  }

  // Adapter router para compatibilidad transparente con use cases
  public async generateFromTemplate(templateName: string, data: Record<string, any>, outputPath: string): Promise<string> {
    console.log(`[WordGenerator] Router generateFromTemplate invocando generador nativo para '${templateName}'...`);
    switch (templateName) {
      case "oficio-autorizacion":
        return this.generateOficioAutorizacion(
          {
            fecha: data.fecha,
            oficioNumero: data.oficio_numero,
            directorAnt: data.director_ant,
            cargoAnt: data.cargo_ant,
            curso: data.curso,
            cantidad: data.cantidad,
            categoria: data.categoria,
            representante: data.representante,
            escuela: data.escuela,
            direccion: data.direccion_escuela,
            telefono: data.telefono_escuela,
            email: data.email_escuela,
          },
          outputPath
        );
      case "oficio-compra":
        return this.generateOficioCompra(
          {
            fecha: data.fecha,
            oficioNumero: data.oficio_numero,
            directorAnt: data.director_ant,
            cargoAnt: data.cargo_ant,
            curso: data.curso,
            estudiantes: data.estudiantes || [],
          },
          outputPath
        );
      case "oficio-legalizacion":
        return this.generateOficioLegalizacion(data, outputPath);
      case "acuerdo-ensenanza":
        return this.generateAcuerdoEnsenanza(data, outputPath);
      case "ficha-teorica":
        return this.generateFichaTeorica(data, outputPath);
      case "acta-parte1":
        return this.generateActaParte1(data, outputPath);
      case "acta-parte2":
        return this.generateActaParte2(data, outputPath);
      case "impresion-titulos":
        return this.generateImpresionTitulos(data, outputPath);
      default:
        return this.generateOficioAutorizacion(data as any, outputPath);
    }
  }

  private formatDateLongSpanishCapital(dateVal?: string | Date | null): string {
    if (!dateVal) return "25 de Julio del 2026";
    const str = String(dateVal).trim();
    if (!str || str === "undefined") return "25 de Julio del 2026";

    let day = 25;
    let month = 7;
    let year = 2026;

    if (str.includes("-")) {
      const datePart = str.split("T")[0] || "";
      const parts = datePart.split("-");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10) || 2026;
          month = parseInt(parts[1], 10) || 7;
          day = parseInt(parts[2], 10) || 25;
        } else {
          day = parseInt(parts[0], 10) || 25;
          month = parseInt(parts[1], 10) || 7;
          year = parseInt(parts[2], 10) || 2026;
        }
      }
    } else if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2].length === 4) {
          day = parseInt(parts[0], 10) || 25;
          month = parseInt(parts[1], 10) || 7;
          year = parseInt(parts[2], 10) || 2026;
        } else {
          year = parseInt(parts[0], 10) || 2026;
          month = parseInt(parts[1], 10) || 7;
          day = parseInt(parts[0], 10) || 25;
        }
      }
    }

    const monthsCapital = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const mName = monthsCapital[(month - 1) % 12] || "Julio";
    const dStr = String(day).padStart(2, "0");
    return `${dStr} de ${mName} del ${year}`;
  }

  // 8. Impresión de Títulos (.docx) - Plantilla Fase 4 / IMPRESION DE TITULOS.docx
  public async generateImpresionTitulos(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Rellenando plantilla oficial docxtemplater: Fase 4/IMPRESION DE TITULOS.docx ->", outputPath);

    const storeConfig = useApp.getState().config;
    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    const targetCourseName = data.courseName || data.course?.nombre || data.nombre_curso || data.curso || "DAIC 020 2026";
    const targetCourse = storeCursos.find((c: any) => c.nombre === targetCourseName || c.nombre.includes(targetCourseName)) || data.course || {};

    let sourceStudents: any[] = [];
    if (Array.isArray(data.students) && data.students.length > 0) {
      sourceStudents = data.students;
    } else if (Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
      sourceStudents = data.estudiantes;
    } else {
      const cId = String(targetCourse.id || data.cursoId || data.courseId || "").trim();
      const cName = String(targetCourseName || "").trim().toLowerCase();
      sourceStudents = storeEstudiantes.filter((e: any) => {
        const studentCourseId = String(e.cursoId || e.courseId || "").trim();
        const studentCourseName = String(e.curso || e.courseName || "").trim().toLowerCase();
        if (cId && studentCourseId && cId === studentCourseId) return true;
        if (cName && studentCourseName && (studentCourseName === cName || studentCourseName.includes(cName) || cName.includes(studentCourseName))) return true;
        return false;
      });
    }

    // Cargar calificaciones de SQLite si están disponibles
    let gradesMap = new Map<string, any>();
    try {
      const allGrades = SQLiteClient.getInstance().queryAll("SELECT * FROM grades");
      (allGrades || []).forEach((g: any) => {
        if (g.student_id) gradesMap.set(String(g.student_id), g);
      });
    } catch (e) {
      console.warn("[WordGenerator] No se pudieron consultar notas de SQLite en generateImpresionTitulos:", e);
    }

    const studentsWithGrades = sourceStudents.map((st: any) => {
      const g = gradesMap.get(String(st.id)) || {};
      return {
        ...st,
        ed_vial: st.ed_vial ?? st.edVial ?? g.ed_vial,
        mecanica: st.mecanica ?? g.mecanica,
        primeros_auxilios: st.primeros_auxilios ?? st.primerosAuxilios ?? g.primeros_auxilios,
        psicologia: st.psicologia ?? g.psicologia,
        promedio_teorico: st.promedio_teorico ?? st.promedioTeorico ?? st.promedio ?? g.promedio_teorico,
        nota_practica: st.nota_practica ?? st.notaPractica ?? st.practica ?? g.nota_practica,
      };
    });

    const studentsList = studentsWithGrades.length > 0 ? studentsWithGrades : [data];
    const rawCInicio = targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso;
    const rawCFin = targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso;
    const cInicioLargo = this.formatDateLongSpanishCapital(rawCInicio);
    const cFinLargo = this.formatDateLongSpanishCapital(rawCFin);

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaMatrizLarga = this.formatDateLongSpanishCapital(data.fechaOficioMatriz || data.fechaActual || todayIso);

    const templateData = this.buildUniversalTemplateData({
      course: targetCourse,
      students: studentsList,
      fechaOficioMatriz: fechaMatrizLarga,
      additionalData: {
        ...data,
        cursoInicio: cInicioLargo,
        cursoFin: cFinLargo,
        fechaCursoInicio: cInicioLargo,
        fechaCursoFin: cFinLargo,
        fechaOficioMatriz: fechaMatrizLarga,
        fechaActual: fechaMatrizLarga,
        fechaHoy: fechaMatrizLarga,
        fechaSistema: fechaMatrizLarga,
      },
    });

    return this.renderDocxTemplate("Fase 4/Titulos.docx", templateData, outputPath);
  }
}
