import fs from "fs";
import path from "path";
import PizZip from "pizzip";

function createValidDocx(title, bodyXmlContent) {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    ${bodyXmlContent}
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);

  return zip.generate({ type: "nodebuffer" });
}

const templatesDir = path.resolve("public/templates");
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

const templates = [
  {
    name: "oficio-autorizacion.docx",
    title: "OFICIO DE AUTORIZACIÓN",
    xml: `<w:p><w:r><w:t>Fecha: {{fecha}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Oficio N°: {{oficio_numero}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Para: {{director_ant}} - {{cargo_ant}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Curso: {{curso}} (Licencia {{categoria}})</w:t></w:r></w:p>
          <w:p><w:r><w:t>Cantidad de alumnos: {{cantidad}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Representante: {{representante}} - {{escuela}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Contacto: {{direccion_escuela}} | {{telefono_escuela}} | {{email_escuela}}</w:t></w:r></w:p>`
  },
  {
    name: "oficio-compra.docx",
    title: "OFICIO DE COMPRA Y MATRÍCULA",
    xml: `<w:p><w:r><w:t>Fecha: {{fecha}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Oficio N°: {{oficio_numero}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Director ANT: {{director_ant}} ({{cargo_ant}})</w:t></w:r></w:p>
          <w:p><w:r><w:t>Curso: {{curso}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Estudiantes Matriculados:</w:t></w:r></w:p>
          <w:p><w:r><w:t>{{#estudiantes}}• {{nombre}} - Cédula: {{cedula}}{{/estudiantes}}</w:t></w:r></w:p>`
  },
  {
    name: "oficio-legalizacion.docx",
    title: "OFICIO DE LEGALIZACIÓN DE ACTAS",
    xml: `<w:p><w:r><w:t>Fecha: {{fecha}} | Oficio N°: {{oficio_numero}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Para: {{director_ant}} ({{cargo_ant}})</w:t></w:r></w:p>
          <w:p><w:r><w:t>Curso: {{curso}} | Período: {{periodo}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Total Aprobados: {{total_aprobados}} | Total Reprobados: {{total_reprobados}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Primer Estudiante: {{primer_estudiante}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Último Estudiante: {{ultimo_estudiante}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Trámite ANT N°: {{numero_tramite}}</w:t></w:r></w:p>`
  },
  {
    name: "acuerdo-ensenanza.docx",
    title: "ACUERDO DE ENSEÑANZA Y COMPROMISO",
    xml: `<w:p><w:r><w:t>Lugar y Fecha: {{ciudad_fecha}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Estudiante: {{nombre_estudiante}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Cédula: {{cedula}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Por medio del presente acuerdo el estudiante se compromete a cumplir las normas...</w:t></w:r></w:p>`
  },
  {
    name: "ficha-teorica.docx",
    title: "FICHA DE CONTROL DE ASISTENCIA TEÓRICA",
    xml: `<w:p><w:r><w:t>Estudiante: {{nombre_estudiante}} | Cédula: {{cedula}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Curso: {{curso}} | Materia: {{materia}}</w:t></w:r></w:p>`
  },
  {
    name: "acta-parte1.docx",
    title: "ACTA DE GRADO - PARTE 1",
    xml: `<w:p><w:r><w:t>Acta N°: {{numero_acta}} | Fecha: {{fecha_acta}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Escuela: {{nombre_escuela}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Estudiante: {{nombre_estudiante}} | Licencia Tipo {{tipo_licencia}}</w:t></w:r></w:p>`
  },
  {
    name: "acta-parte2.docx",
    title: "ACTA DE GRADO - PARTE 2 (CALIFICACIONES)",
    xml: `<w:p><w:r><w:t>Acta N°: {{numero_acta}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Educación Vial: {{nota_ed_vial}} | Mecánica: {{nota_mecanica}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Primeros Auxilios: {{nota_p_auxilios}} | Psicología: {{nota_psicologia}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Promedio Teórico: {{promedio_teorico}} | Nota Práctica: {{nota_practica}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Firmas: Director ({{director}}) | Secretaria ({{secretaria}})</w:t></w:r></w:p>`
  }
];

templates.forEach((t) => {
  const fileBuffer = createValidDocx(t.title, t.xml);
  const targetPath = path.join(templatesDir, t.name);
  fs.writeFileSync(targetPath, fileBuffer);
  console.log(`[OK] Plantilla binaria Word creada: ${t.name}`);
});
