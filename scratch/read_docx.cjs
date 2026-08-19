const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/Fase 2/FichaTeorica.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

console.log('--- BUSCANDO HORARIOS Y DOCUMENTO EN FICHA TEORICA ---');
const matches = xml.match(/\{[^}]+\}/g);
console.log('Todas las etiquetas en FichaTeorica.docx:', [...new Set(matches)]);

fs.writeFileSync('scratch/ficha_tags.txt', JSON.stringify([...new Set(matches)], null, 2));
