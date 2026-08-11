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
import { SQLiteClient } from "../database/SQLiteClient";
import { useApp } from "@/lib/store";
import { ANT_LOGO_BASE64 } from "./antLogoBase64";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export class WordGenerator {
  private static instance: WordGenerator | null = null;

  private constructor() {}

  public static getInstance(): WordGenerator {
    if (!WordGenerator.instance) {
      WordGenerator.instance = new WordGenerator();
    }
    return WordGenerator.instance;
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

    const startActaNum = Number(data.actaInicio || data.secuencialActa || data.numero_acta || storeConfig.secuenciales?.actas || 3251);
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

  private async renderDocxTemplate(templateRelativePath: string, templateData: any, outputPath: string, isSingleDoc: boolean = false): Promise<string> {
    console.log("[WordGenerator] Rellenando plantilla oficial docxtemplater:", templateRelativePath, "->", outputPath);
    
    const cleanPath = templateRelativePath.replace(/^\/+/, "");
    let arrayBuffer: ArrayBuffer | null = null;

    // 1. LECTURA DIRECTA EN DISCO DURO EN TIEMPO REAL (Primera prioridad)
    try {
      const diskBytes = await LocalFileStorage.getInstance().readFile(`public/templates/${cleanPath}`);
      if (diskBytes && diskBytes.length > 0) {
        arrayBuffer = diskBytes.buffer as ArrayBuffer;
        console.log(`[WordGenerator] LECTURA DIRECTA EN TIEMPO REAL DESDE DISCO: 'public/templates/${cleanPath}'`);
      }
    } catch (err) {
      console.warn(`[WordGenerator] Lectura directa en disco no disponible:`, err);
    }

    // 2. LECTURA DIRECTA EN TIEMPO REAL VÍA FETCH SIN CACHÉ (Segunda prioridad)
    if (!arrayBuffer) {
      const encodedSegments = cleanPath.split("/").map((part) => encodeURIComponent(part)).join("/");
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
            arrayBuffer = await res.arrayBuffer();
            console.log(`[WordGenerator] LECTURA DIRECTA EN TIEMPO REAL VÍA DEV SERVER: '${url}'`);
            break;
          }
        } catch {
          // Continuar intentando
        }
      }
    }

    if (!arrayBuffer) {
      throw new Error(`No se pudo cargar la plantilla oficial Word desde '${templateRelativePath}'`);
    }

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Inyectar datos por defecto de la Directiva y Escuela para evitar undefined
    const storeConfig = useApp.getState().config;
    const defaultFirmasData: Record<string, string> = {};
    if (storeConfig?.firmas) {
      Object.entries(storeConfig.firmas).forEach(([k, val]) => {
        defaultFirmasData[`${k}Nombre`] = val.nombre || "";
        defaultFirmasData[`${k}Cargo`] = val.cargo || "";
      });
    }

    const insts = storeConfig?.instructores || [];
    const edVialInst = insts.find((i: any) => /vial/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.edVial || "Francisco Ortuño";
    const mecanicaInst = insts.find((i: any) => /mec/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.mecanica || "Mario Peralvo";
    const pAuxiliosInst = insts.find((i: any) => /auxilio/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.pAuxilios || "Dr. Rafael Parra";
    const psicologiaInst = insts.find((i: any) => /psico/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig?.firmas as any)?.teoricos?.psicologia || "Luis De La Torre";

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaActualHoy = this.formatDateLong(todayIso);

    const cFinVal = templateData?.cursoFin || templateData?.finCurso || templateData?.fechaCursoFin || "24/07/2026";
    const cursoFinAntText = this.subtractOneDay(cFinVal);

    const mergedData = {
      directorNombre: storeConfig?.firmas?.director?.nombre || "Ing. Marco Villacís",
      directorCargo: storeConfig?.firmas?.director?.cargo || "Director General",
      directorAntNombre: storeConfig?.firmas?.directorAnt?.nombre || "Espíndola Lara Oscar Omar",
      directorAntCargo: storeConfig?.firmas?.directorAnt?.cargo || "Director Provincial",
      cargoAnt: storeConfig?.firmas?.directorAnt?.cargo || "Director Provincial",
      secretariaNombre: storeConfig?.firmas?.secretaria?.nombre || "Lcda. Andrea Suárez",
      secretariaCargo: storeConfig?.firmas?.secretaria?.cargo || "Secretaria",
      representanteNombre: storeConfig?.firmas?.representante?.nombre || "Leonidas Francisco Ortuño",
      representanteCargo: storeConfig?.firmas?.representante?.cargo || "Representante Legal",
      escuelaNombre: storeConfig?.escuela?.nombre || "Drive Academy S.A",
      escuelaSucursal: storeConfig?.escuela?.sucursal || "Condado",
      resolucionAnt: storeConfig?.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig?.escuela?.resolucion || "18 DCTS-ANT-2013",
      instructorEdVial: edVialInst,
      instructorMecanica: mecanicaInst,
      instructorPAuxilios: pAuxiliosInst,
      instructorPsicologia: psicologiaInst,
      instEdVial: edVialInst,
      instMecanica: mecanicaInst,
      instPAuxilios: pAuxiliosInst,
      instPsicologia: psicologiaInst,
      fechaActual: fechaActualHoy,
      fechaHoy: fechaActualHoy,
      fechaSistema: fechaActualHoy,
      periodo: this.formatPeriodo(templateData?.cursoInicio || templateData?.inicioCurso, templateData?.cursoFin || templateData?.finCurso),
      periodoCurso: this.formatPeriodo(templateData?.cursoInicio || templateData?.inicioCurso, templateData?.cursoFin || templateData?.finCurso),
      primerUltimoEstudiante: (templateData?.primerUltimoEstudiante || templateData?.primerEstudianteUltimoEstudiante || templateData?.rangoEstudiantes) || "",
      primerEstudianteUltimoEstudiante: (templateData?.primerUltimoEstudiante || templateData?.primerEstudianteUltimoEstudiante || templateData?.rangoEstudiantes) || "",
      rangoEstudiantes: (templateData?.primerUltimoEstudiante || templateData?.primerEstudianteUltimoEstudiante || templateData?.rangoEstudiantes) || "",
      finMatriculasLargo: this.formatDateFullSpanish(templateData?.finMatricula || templateData?.matriculaFin || templateData?.fechaMatriculaFin),
      matriculaFinLargo: this.formatDateFullSpanish(templateData?.finMatricula || templateData?.matriculaFin || templateData?.fechaMatriculaFin),
      finDeMatriculasLargo: this.formatDateFullSpanish(templateData?.finMatricula || templateData?.matriculaFin || templateData?.fechaMatriculaFin),
      cursoFinAnterior: cursoFinAntText,
      cursoFinPrevio: cursoFinAntText,
      fechaFinAnterior: cursoFinAntText,
      cursoFinMenosUnDia: cursoFinAntText,
      ...defaultFirmasData,
      ...templateData,
    };

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
        const singleData = { ...mergedData, ...st };
        delete singleData.estudiantes;

        const singleZip = new PizZip(arrayBuffer);
        const singleDoc = new Docxtemplater(singleZip, { paragraphLoop: true, linebreaks: true });
        singleDoc.render(singleData);

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

    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const rawFecha = (data.fecha || "22 de julio del 2026").trim();
    let fechaLarga = rawFecha;
    let fechaCorta = "22/07/2026";
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawFecha)) {
      const parts = rawFecha.split("-").map(Number);
      const y = parts[0] || 2026;
      const m = parts[1] || 7;
      const d = parts[2] || 22;
      fechaLarga = `${d} de ${months[m - 1] || "julio"} del ${y}`;
      fechaCorta = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawFecha)) {
      const parts = rawFecha.split("/").map(Number);
      const d = parts[0] || 22;
      const m = parts[1] || 7;
      const y = parts[2] || 2026;
      fechaLarga = `${d} de ${months[m - 1] || "julio"} del ${y}`;
      fechaCorta = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } else {
      let clean = rawFecha.replace(/^Quito,?\s*/i, "").trim();
      fechaLarga = clean;
    }

    const templateData = {
      fechaEmision: fechaLarga,
      fechaEmisionLarga: fechaLarga,
      fechaEmisionCorta: fechaCorta,
      oficioNumero: data.oficioNumero || "1152",
      directorAntNombre: data.directorAnt || storeConfig.firmas?.directorAnt?.nombre || "Espíndola Lara Oscar Omar",
      directorAntCargo: data.cargoAnt || storeConfig.firmas?.directorAnt?.cargo || "Director Provincial",
      escuelaNombre: storeConfig.escuela?.nombre || "Drive Academy S.A",
      escuelaSucursal: data.sucursal || storeConfig.escuela?.sucursal || "el Condado",
      cursoNombre: data.curso || "DAIC-020-2026",
      cursoInicio: data.fechaInicio || "27/07/2026",
      cursoFin: data.fechaFin || "4/08/2026",
      cantidadEstudiantes: cantidadNum,
      tipoLicencia: (data.categoria || "B").replace(/^TIPO\s*/i, ""),
      representanteNombre: data.representante || storeConfig.firmas?.representante?.nombre || "Leonidas Francisco Ortuño",
      representanteCargo: storeConfig.firmas?.representante?.cargo || "Representante Legal",
    };

    return this.renderDocxTemplate("Fase 1/OFI-1152-2026 oficio autorizacion.docx", templateData, outputPath);
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

    const spanishNumbers: Record<number, string> = {
      1: "UN", 2: "DOS", 3: "TRES", 4: "CUATRO", 5: "CINCO", 6: "SEIS", 7: "SIETE", 8: "OCHO", 9: "NUEVE", 10: "DIEZ",
      11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO",
      19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO", 25: "VEINTICINCO"
    };
    const cantidadTexto = spanishNumbers[cantidadNum] || String(cantidadNum);

    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const rawFecha = (data.fecha || "22 de julio del 2026").trim();
    let fechaLarga = rawFecha;
    let fechaCorta = "22/07/2026";
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawFecha)) {
      const parts = rawFecha.split("-").map(Number);
      const y = parts[0] || 2026;
      const m = parts[1] || 7;
      const d = parts[2] || 22;
      fechaLarga = `${d} de ${months[m - 1] || "julio"} del ${y}`;
      fechaCorta = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawFecha)) {
      const parts = rawFecha.split("/").map(Number);
      const d = parts[0] || 22;
      const m = parts[1] || 7;
      const y = parts[2] || 2026;
      fechaLarga = `${d} de ${months[m - 1] || "julio"} del ${y}`;
      fechaCorta = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } else {
      let clean = rawFecha.replace(/^Quito,?\s*/i, "").trim();
      fechaLarga = clean;
    }

    const templateData = {
      fechaEmision: fechaLarga,
      fechaEmisionLarga: fechaLarga,
      fechaEmisionCorta: fechaCorta,
      oficioNumero: data.oficioNumero || "1151",
      directorAntNombre: data.directorAnt || storeConfig.firmas?.directorAnt?.nombre || "Espíndola Lara Oscar Omar",
      directorAntCargo: data.cargoAnt || storeConfig.firmas?.directorAnt?.cargo || "Director Provincial",
      escuelaNombre: storeConfig.escuela?.nombre || "Drive Academy S.A",
      escuelaSucursal: data.sucursal || storeConfig.escuela?.sucursal || "Condado",
      cursoNombre: data.curso || "DAIC-020-2026",
      cantidadEstudiantes: cantidadNum,
      cantidadEstudiantesTexto: cantidadTexto,
      tipoLicencia: (data.categoria || "B").replace(/^TIPO\s*/i, ""),
      representanteNombre: data.representante || storeConfig.firmas?.representante?.nombre || "Leonidas Francisco Ortuño",
      representanteCargo: storeConfig.firmas?.representante?.cargo || "Representante Legal",
      oficioMatriz: data.oficioMatriz || "ANT-DPPIC-2026-6528-OF",
      fechaOficioMatriz: data.fechaOficioMatriz || "06 de julio 2026",
      remitenteOficio: data.remitenteOficio || "Director De La Dirección Provincial De Pichincha",
    };

    return this.renderDocxTemplate("Fase 1/OFI 1151 026 compra permisos.docx", templateData, outputPath);
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

    const storeConfig = useApp.getState().config;
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
    const mappedStudents = this.mapAndSortStudents(studentsList, data, targetCourse, storeConfig);

    const cantidadNum = mappedStudents.length;
    const spanishNumbers: Record<number, string> = {
      1: "UN", 2: "DOS", 3: "TRES", 4: "CUATRO", 5: "CINCO", 6: "SEIS", 7: "SIETE", 8: "OCHO", 9: "NUEVE", 10: "DIEZ",
      11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO",
      19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO", 25: "VEINTICINCO"
    };
    const cantidadTexto = spanishNumbers[cantidadNum] || String(cantidadNum);

    const rawFecha = String(data.fecha || "").trim();
    const cleanFecha = rawFecha.replace(/^Quito,?\s*/i, "").trim();
    const today = new Date();
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    let fechaLarga = `${today.getDate()} de ${months[today.getMonth()]} del ${today.getFullYear()}`;

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanFecha)) {
      const parts = cleanFecha.split("-").map(Number);
      const y = parts[0] || today.getFullYear();
      const m = parts[1] || (today.getMonth() + 1);
      const d = parts[2] || today.getDate();
      fechaLarga = `${d} de ${months[m - 1] || "agosto"} del ${y}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanFecha)) {
      const parts = cleanFecha.split("/").map(Number);
      const d = parts[0] || today.getDate();
      const m = parts[1] || (today.getMonth() + 1);
      const y = parts[2] || today.getFullYear();
      fechaLarga = `${d} de ${months[m - 1] || "agosto"} del ${y}`;
    } else if (cleanFecha && cleanFecha !== "undefined" && !cleanFecha.includes("undefined")) {
      fechaLarga = cleanFecha;
    }

    const numTramite = data.numeroTramite || data.numero_tramite || data.tramiteNumero || "00";
    const totalAprobadosVal = data.totalAprobados ?? data.total_aprobados ?? cantidadNum;
    const totalReprobadosVal = data.totalReprobados ?? data.total_reprobados ?? 0;

    const matIniRaw = targetCourse.inicioMatricula || data.inicioMatricula || data.matriculaInicio || data.fechaMatriculaInicio || targetCourse.inicioCurso || "13/07/2026";
    const matFinRaw = targetCourse.finMatricula || data.finMatricula || data.matriculaFin || data.fechaMatriculaFin || targetCourse.finCurso || "21/07/2026";

    const templateData = {
      ...data,
      fechaOficioMatriz: data.fechaOficioMatriz || fechaLarga,
      fechaEmision: fechaLarga,
      fechaActual: fechaLarga,
      oficioNumero: data.oficio_numero || data.oficioNumero || `2026-1163`,
      oficio_numero: data.oficio_numero || data.oficioNumero || `2026-1163`,
      numeroTramite: numTramite,
      numero_tramite: numTramite,
      tramiteNumero: numTramite,
      numeroTramiteIngreso: numTramite,
      cantidadEstudiantes: cantidadNum,
      cantidadEstudiantesTexto: cantidadTexto,
      cantidadEstudiantesPalabras: cantidadTexto,
      totalAprobados: totalAprobadosVal,
      total_aprobados: totalAprobadosVal,
      totalReprobados: totalReprobadosVal,
      total_reprobados: totalReprobadosVal,
      matriculaInicio: this.formatDateShortSlash(matIniRaw),
      matriculaFin: this.formatDateShortSlash(matFinRaw),
      inicioMatriculas: this.formatDateShortSlash(matIniRaw),
      finMatriculas: this.formatDateShortSlash(matFinRaw),
      finMatriculasLargo: this.formatDateFullSpanish(matFinRaw),
      resolucionAnt: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      cursoNombre: targetCourse.nombre || data.cursoNombre || data.curso || data.courseName || data.course?.nombre || "DAIC 020 2026",
      tipoLicencia: targetCourse.tipoLicencia || data.tipoLicencia || data.course?.tipoLicencia || "B",
      estudiantes: mappedStudents,
      ...mappedStudents[0],
    };

    try {
      return await this.renderDocxTemplate("Fase 3/OFICIO LEGALIZACION 2026-1153 DAIC 019.docx", templateData, outputPath, true);
    } catch {
      return await this.renderDocxTemplate("Fase 1/OFI 1151 026 compra permisos.docx", templateData, outputPath, true);
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

    // Fechas y horarios formateados para el curso
    const mInicio = this.formatDateExcel(targetCourse.inicioMatriculas || data.matriculaInicio || data.fechaMatriculaInicio || data.inicioMatriculas, "13/07/2026");
    const mFin = this.formatDateExcel(targetCourse.finMatriculas || data.matriculaFin || data.fechaMatriculaFin || data.finMatriculas, "21/07/2026");
    const cInicio = this.formatDateExcel(targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso, "27/07/2026");
    const cFin = this.formatDateExcel(targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso, "04/08/2026");

    const hPractico = data.horarioPractico || data.horarioPractica || targetCourse.horarioPractica || "14H00-16H00";
    const hTeorico = this.cleanHorarioTeoria(data.horarioTeorico || data.horarioTeoria || targetCourse.horarioTeoria || "18H00-20H00");

    const mappedStudents = this.mapAndSortStudents(studentsList, data, targetCourse, storeConfig);

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaActualHoy = this.formatDateLong(todayIso);

    const templateData = {
      ...data,
      resolucionAnt: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      cursoNombre: targetCourse.nombre || data.cursoNombre || data.curso || data.courseName || data.course?.nombre || "DAIC 020 2026",
      tipoLicencia: targetCourse.tipoLicencia || data.tipoLicencia || data.course?.tipoLicencia || "B",
      matriculaInicio: mInicio,
      matriculaFin: mFin,
      fechaMatriculaInicio: mInicio,
      fechaMatriculaFin: mFin,
      cursoInicio: cInicio,
      cursoFin: cFin,
      fechaCursoInicio: cInicio,
      fechaCursoFin: cFin,
      horarioPractico: hPractico,
      horarioPractica: hPractico,
      horarioTeorico: hTeorico,
      horarioTeoria: hTeorico,
      fechaActual: fechaActualHoy,
      fechaHoy: fechaActualHoy,
      fechaSistema: fechaActualHoy,
      estudiantes: mappedStudents,
      ...mappedStudents[0],
    };

    return this.renderDocxTemplate("Fase 2/ACUERDO DE ENSEÑANZA.docx", templateData, outputPath);
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

    const storeConfig = useApp.getState().config;
    const storeCursos = useApp.getState().cursos || [];
    const storeEstudiantes = useApp.getState().estudiantes || [];

    // Buscar curso si existe para obtener fechas y horarios exactos
    const targetCourseId = data.cursoId || data.courseId || data.course?.id;
    const targetCourseName = data.curso || data.courseName || data.course?.nombre || data.cursoNombre;
    const targetCourse = storeCursos.find(
      (c: any) => (targetCourseId && c.id === targetCourseId) || (targetCourseName && (c.nombre === targetCourseName || c.nombre.includes(targetCourseName)))
    ) || data.course || {};

    // Instructores teóricos desde storeConfig.instructores
    const insts = storeConfig.instructores || [];
    const edVialInst = insts.find((i: any) => /vial/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig.firmas as any)?.teoricos?.edVial || "Francisco Ortuño";
    const mecanicaInst = insts.find((i: any) => /mec/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig.firmas as any)?.teoricos?.mecanica || "Mario Peralvo";
    const pAuxiliosInst = insts.find((i: any) => /auxilio/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig.firmas as any)?.teoricos?.pAuxilios || "Dr. Rafael Parra";
    const psicologiaInst = insts.find((i: any) => /psico/i.test(i.materiaTeorica || ""))?.nombre || (storeConfig.firmas as any)?.teoricos?.psicologia || "Luis De La Torre";

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

    // Fechas y horarios formateados para el curso
    const mInicio = this.formatDateExcel(targetCourse.inicioMatriculas || data.matriculaInicio || data.fechaMatriculaInicio || data.inicioMatriculas, "13/07/2026");
    const mFin = this.formatDateExcel(targetCourse.finMatriculas || data.matriculaFin || data.fechaMatriculaFin || data.finMatriculas, "21/07/2026");
    const cInicio = this.formatDateExcel(targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso, "27/07/2026");
    const cFin = this.formatDateExcel(targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso, "04/08/2026");

    const hPracticoRaw = data.horarioPractico || data.horarioPractica || targetCourse.horarioPractica || "14H00-16H00";
    const hTeoricoRaw = data.horarioTeorico || data.horarioTeoria || targetCourse.horarioTeoria || "18H00-20H00";
    const hPractico = String(hPracticoRaw).split("|")[0]!.trim();
    const hTeorico = this.cleanHorarioTeoria(String(hTeoricoRaw).split("|")[0]!.trim());

    const mappedStudents = this.mapAndSortStudents(studentsList, data, targetCourse, storeConfig);

    const templateData = {
      ...data,
      resolucionAnt: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      cursoNombre: targetCourse.nombre || data.cursoNombre || data.curso || data.courseName || data.course?.nombre || "DAIC 020 2026",
      tipoLicencia: targetCourse.tipoLicencia || data.tipoLicencia || data.course?.tipoLicencia || "B",
      matriculaInicio: mInicio,
      matriculaFin: mFin,
      fechaMatriculaInicio: mInicio,
      fechaMatriculaFin: mFin,
      matriculaStart: mInicio,
      matriculaEnd: mFin,
      cursoInicio: cInicio,
      cursoFin: cFin,
      fechaCursoInicio: cInicio,
      fechaCursoFin: cFin,
      cursoStart: cInicio,
      cursoEnd: cFin,
      horarioPractico: hPractico,
      horarioPractica: hPractico,
      horarioTeorico: hTeorico,
      horarioTeoria: hTeorico,
      instructorEdVial: data.instructorEdVial || edVialInst,
      instructorMecanica: data.instructorMecanica || mecanicaInst,
      instructorPAuxilios: data.instructorPAuxilios || pAuxiliosInst,
      instructorPsicologia: data.instructorPsicologia || psicologiaInst,
      instEdVial: data.instructorEdVial || edVialInst,
      instMecanica: data.instructorMecanica || mecanicaInst,
      instPAuxilios: data.instructorPAuxilios || pAuxiliosInst,
      instPsicologia: data.instructorPsicologia || psicologiaInst,
      estudiantes: mappedStudents,
      ...mappedStudents[0],
    };

    return this.renderDocxTemplate("Fase 2/FICHA TEORIA.docx", templateData, outputPath);
  }

  // 6. Acta Parte 1 (Fase 2/PARTE 1 ACTA DE CALIFICACIONES.docx)
  public async generateActaParte1(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Generando Parte 1 Acta de Calificaciones a partir de plantilla oficial Fase 2/PARTE 1 ACTA DE CALIFICACIONES.docx...", outputPath);

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

    // Fechas y horarios formateados para el curso
    const mInicio = this.formatDateExcel(targetCourse.inicioMatriculas || data.matriculaInicio || data.fechaMatriculaInicio || data.inicioMatriculas, "13/07/2026");
    const mFin = this.formatDateExcel(targetCourse.finMatriculas || data.matriculaFin || data.fechaMatriculaFin || data.finMatriculas, "21/07/2026");
    const cInicio = this.formatDateExcel(targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso, "27/07/2026");
    const cFin = this.formatDateExcel(targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso, "04/08/2026");

    const hPractico = data.horarioPractico || data.horarioPractica || targetCourse.horarioPractica || "14H00-16H00";
    const hTeorico = this.cleanHorarioTeoria(data.horarioTeorico || data.horarioTeoria || targetCourse.horarioTeoria || "18H00-20H00");

    const mappedStudents = this.mapAndSortStudents(studentsList, data, targetCourse, storeConfig);

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaActualHoy = this.formatDateLong(todayIso);

    const templateData = {
      ...data,
      resolucionAnt: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      resolucion: storeConfig.escuela?.resolucion || "18 DCTS-ANT-2013",
      cursoNombre: targetCourse.nombre || data.cursoNombre || data.curso || data.courseName || data.course?.nombre || "DAIC 020 2026",
      tipoLicencia: targetCourse.tipoLicencia || data.tipoLicencia || data.course?.tipoLicencia || "B",
      matriculaInicio: mInicio,
      matriculaFin: mFin,
      fechaMatriculaInicio: mInicio,
      fechaMatriculaFin: mFin,
      cursoInicio: cInicio,
      cursoFin: cFin,
      fechaCursoInicio: cInicio,
      fechaCursoFin: cFin,
      horarioPractico: hPractico,
      horarioPractica: hPractico,
      horarioTeorico: hTeorico,
      horarioTeoria: hTeorico,
      fechaActual: fechaActualHoy,
      fechaHoy: fechaActualHoy,
      fechaSistema: fechaActualHoy,
      estudiantes: mappedStudents,
      ...mappedStudents[0],
    };

    return this.renderDocxTemplate("Fase 2/PARTE 1 ACTA DE CALIFICACIONES.docx", templateData, outputPath);
  }

  // 7. Acta Parte 2 (.docx)
  public async generateActaParte2(data: any, outputPath: string): Promise<string> {
    console.log("[WordGenerator] Rellenando plantilla oficial docxtemplater: Fase 4/PARTE 2 ACTA DE CALIFICACIONES.docx ->", outputPath);

    const storeConfig = useApp.getState().config;
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

    const mappedStudents = this.mapAndSortStudents(rawList, data, targetCourse, storeConfig);

    const spanishNumbers: Record<number, string> = {
      1: "UN", 2: "DOS", 3: "TRES", 4: "CUATRO", 5: "CINCO", 6: "SEIS", 7: "SIETE", 8: "OCHO", 9: "NUEVE", 10: "DIEZ",
      11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO",
      19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO", 25: "VEINTICINCO"
    };

    const templateData = {
      ...data,
      cursoNombre: targetCourse.nombre || targetCourseName,
      tipoLicencia: targetCourse.tipoLicencia || "B",
      cursoInicio: this.formatDateExcel(targetCourse.inicioCurso, "27/07/2026"),
      cursoFin: this.formatDateExcel(targetCourse.finCurso, "04/08/2026"),
      cantidadEstudiantes: mappedStudents.length,
      cantidadEstudiantesTexto: spanishNumbers[mappedStudents.length] || String(mappedStudents.length),
      estudiantes: mappedStudents,
    };

    return this.renderDocxTemplate("Fase 4/PARTE 2 ACTA DE CALIFICACIONES.docx", templateData, outputPath);
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
    const mappedStudents = this.mapAndSortStudents(studentsList, data, targetCourse, storeConfig);

    const firstSt = mappedStudents[0] || {};
    const rawCInicio = targetCourse.inicioCurso || data.cursoInicio || data.fechaCursoInicio || data.inicioCurso;
    const rawCFin = targetCourse.finCurso || data.cursoFin || data.fechaCursoFin || data.finCurso;
    const cInicioLargo = this.formatDateLongSpanishCapital(rawCInicio);
    const cFinLargo = this.formatDateLongSpanishCapital(rawCFin);

    const todayIso = new Date().toISOString().split("T")[0];
    const fechaMatrizLarga = this.formatDateLongSpanishCapital(data.fechaOficioMatriz || data.fechaActual || todayIso);

    const templateData = {
      ...data,
      cursoNombre: targetCourse.nombre || targetCourseName,
      tipoLicencia: targetCourse.tipoLicencia || "B",
      cursoInicio: cInicioLargo,
      cursoFin: cFinLargo,
      fechaCursoInicio: cInicioLargo,
      fechaCursoFin: cFinLargo,
      fechaOficioMatriz: fechaMatrizLarga,
      fechaActual: fechaMatrizLarga,
      fechaHoy: fechaMatrizLarga,
      fechaSistema: fechaMatrizLarga,
      estudiantes: mappedStudents,
      ...firstSt,
      estudianteNombre: firstSt.fullName || firstSt.nombres || firstSt.nombre || "ESTUDIANTE EJEMPLO",
      notaTeoria: firstSt.notaPromedio || firstSt.promedioTeorico || firstSt.promedio || "17,00",
      notaPractica: firstSt.notaPractica || firstSt.practica || firstSt.examenPractico || "17,00",
    };

    return this.renderDocxTemplate("Fase 4/IMPRESION DE TITULOS.docx", templateData, outputPath);
  }
}
