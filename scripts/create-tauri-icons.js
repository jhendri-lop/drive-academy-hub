const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 PNG base64
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const pngBuffer = Buffer.from(pngBase64, 'base64');

// Valid minimal 16x16 ICO header wrapping PNG
const icoHeader = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10,
  0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
  pngBuffer.length & 0xff, (pngBuffer.length >> 8) & 0xff, 0x00, 0x00,
  0x16, 0x00, 0x00, 0x00
]);
const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);

console.log("Archivos de icono creados exitosamente en src-tauri/icons/");
