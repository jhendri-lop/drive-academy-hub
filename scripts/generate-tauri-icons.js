const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Valid 1x1 transparent PNG buffer
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Valid minimal ICO header pointing to PNG resource
// ICO Header: 00 00 (Reserved) 01 00 (Type 1=ICO) 01 00 (1 Image)
// Directory: 20 (Width 32) 20 (Height 32) 00 (Colors) 00 (Reserved) 01 00 (Planes 1) 20 00 (BPP 32) + Size + Offset
const icoHeader = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x20, 0x20, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
  pngBuffer.length & 0xff, (pngBuffer.length >> 8) & 0xff, 0x00, 0x00,
  0x16, 0x00, 0x00, 0x00
]);
const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);

// ICNS header
const icnsHeader = Buffer.from([0x69, 0x63, 0x6e, 0x73, 0x00, 0x00, 0x00, 0x00]);

const files = [
  { name: '32x32.png', buffer: pngBuffer },
  { name: '128x128.png', buffer: pngBuffer },
  { name: '128x128@2x.png', buffer: pngBuffer },
  { name: 'icon.png', buffer: pngBuffer },
  { name: 'icon.ico', buffer: icoBuffer },
  { name: 'icon.icns', buffer: icnsHeader },
];

files.forEach(({ name, buffer }) => {
  const filePath = path.join(iconsDir, name);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created icon: ${name}`);
});
