const fs = require('fs');
const PizZip = require('pizzip');

const templatePath = 'public/templates/Fase 2/ActaParte1.docx';
const testPath = 'public/templates/Fase 2/ActaParte1_PRUEBA.docx';

try {
  const zip = new PizZip(fs.readFileSync(templatePath));

  Object.keys(zip.files).forEach(function(fileName) {
    if (/^word\/(header|footer)\d*\.xml$/.test(fileName)) {
      let xml = zip.file(fileName).asText();
      xml = xml.replace(/<w:r[^>]*>\s*<w:t>\{%logoEscuela<\/w:t>[\s\S]*?<w:t>\}<\/w:t>\s*<\/w:r>/gi, '');
      xml = xml.replace(/<w:r[^>]*>[\s\S]*?logoEscuela[\s\S]*?<\/w:r>/gi, '');
      xml = xml.replace(/\{%?logoEscuela[^}]*\}/gi, '');
      zip.file(fileName, xml);
    }
  });

  let docXml = zip.file('word/document.xml').asText();
  if (!docXml.includes('{%logoEscuela_170x65}')) {
    const bodyIdx = docXml.indexOf('<w:body>') + '<w:body>'.length;
    const tagP = '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>{%logoEscuela_170x65}</w:t></w:r></w:p>';
    docXml = docXml.slice(0, bodyIdx) + tagP + docXml.slice(bodyIdx);
    zip.file('word/document.xml', docXml);
  }

  fs.writeFileSync(templatePath, zip.generate({ type: 'nodebuffer' }));
  console.log('SUCCESS: Cleaned ActaParte1.docx header XML and ensured body tag.');
} catch (err) {
  if (err.code === 'EBUSY') {
    console.log('LOCKED: The file ActaParte1.docx is currently open in Microsoft Word. Please close Word.');
  } else {
    console.error('ERROR:', err);
  }
}

if (fs.existsSync(testPath)) {
  try {
    fs.unlinkSync(testPath);
    console.log('Deleted test file ActaParte1_PRUEBA.docx');
  } catch (e) {}
}
