const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('public/templates/Fase 2/ActaParte1.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

console.log('--- BUSCANDO ETIQUETAS EN ACTA PARTE 1 ---');
const matches = xml.match(/\{[^}]+\}/g);
console.log('Etiquetas encontradas:', [...new Set(matches)]);

const matchActaContext = xml.match(/.{0,50}ACTA.{0,100}/gi);
console.log('Contexto de ACTA en XML:', matchActaContext);
