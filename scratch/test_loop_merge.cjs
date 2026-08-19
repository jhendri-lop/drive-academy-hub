const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');

const dummyLogo = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const templateBuffer = fs.readFileSync('public/templates/Fase 2/ActaParte1.docx');
const zip = new PizZip(templateBuffer);
const initialXml = zip.file('word/document.xml').asText();

const estudiantes = [
  { estudianteNombre: 'ESTUDIANTE UNO', cedula: '1711111111' },
  { estudianteNombre: 'ESTUDIANTE DOS', cedula: '1722222222' }
];

const studentBodies = [];
let finalSectPr = '';

estudiantes.forEach((st, i) => {
  const singleZip = new PizZip(templateBuffer);
  const singleImgMod = new ImageModule({
    centered: false,
    getImage: () => base64ToArrayBuffer(dummyLogo),
    getSize: () => [170, 65]
  });

  const singleDoc = new Docxtemplater(singleZip, {
    modules: [singleImgMod],
    parser: (tag) => {
      if (typeof tag === 'string' && (tag.startsWith('logoEscuela') || tag.startsWith('%logoEscuela'))) {
        return { get: () => dummyLogo };
      }
      return { get: (scope) => scope ? scope[tag] : '' };
    }
  });

  singleDoc.render({ estudianteNombre: st.estudianteNombre, cedula: st.cedula, logoEscuela: dummyLogo });

  // 1. Copy any generated media files (word/media/*) into outer zip
  Object.keys(singleZip.files).forEach(fName => {
    if (fName.startsWith('word/media/')) {
      zip.file(fName, singleZip.file(fName).asNodeBuffer());
    }
  });

  // 2. Merge relationship tags from singleZip's document.xml.rels into outer zip's document.xml.rels
  const singleRels = singleZip.file('word/_rels/document.xml.rels') ? singleZip.file('word/_rels/document.xml.rels').asText() : '';
  let outerRels = zip.file('word/_rels/document.xml.rels') ? zip.file('word/_rels/document.xml.rels').asText() : '';
  
  if (singleRels && outerRels) {
    const singleMatches = singleRels.match(/<Relationship[^>]*\/>/g) || [];
    singleMatches.forEach(relTag => {
      const idMatch = relTag.match(/Id="([^"]+)"/);
      if (idMatch && idMatch[1] && !outerRels.includes('Id="' + idMatch[1] + '"')) {
        outerRels = outerRels.replace('</Relationships>', relTag + '</Relationships>');
      }
    });
    zip.file('word/_rels/document.xml.rels', outerRels);
  }

  const singleXml = singleZip.file('word/document.xml').asText();
  const bodyMatch = singleXml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/i);
  let bInner = bodyMatch ? bodyMatch[1] : '';
  const sectMatch = bInner.match(/<w:sectPr[\s\S]*<\/w:sectPr>/i);
  if (sectMatch && !finalSectPr) finalSectPr = sectMatch[0];
  bInner = bInner.replace(/<w:sectPr[\s\S]*<\/w:sectPr>/i, '').trim();
  studentBodies.push(bInner);
});

const combinedBody = studentBodies.join('<w:p><w:r><w:br w:type="page"/></w:r></w:p>') + (finalSectPr || '');
const finalXml = initialXml.replace(/<w:body[^>]*>[\s\S]*<\/w:body>/i, '<w:body>' + combinedBody + '</w:body>');
zip.file('word/document.xml', finalXml);

const outBuf = zip.generate({ type: 'nodebuffer' });
console.log('SUCCESS: Multi-student docx generated with merged media files and rels! File size:', outBuf.length);
