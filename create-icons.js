import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Minimal 32x32 blue PNG
const minimalPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAAC1Tm0JAAAAMklEQVRYCe3OMQ0AIBAAMcCP/k2MBb4gINqSrqb5t+957g0c3CgQIECAAAECBAgQIEBgF7gA1UAC1yW5j1QAAAAASUVORK5CYII=";
const buffer = Buffer.from(minimalPngBase64, 'base64');

['icon-16.png', 'icon-32.png', 'icon-80.png'].forEach((name) => {
    fs.writeFileSync(path.join(assetsDir, name), buffer);
});

console.log('✅ Icônes d\'actifs créées avec succès dans ./assets');
