import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

function createPng(width, height, drawFn) {
    // RGBA buffer (width * 4 + 1 filter byte per row)
    const rowSize = width * 4 + 1;
    const rawData = Buffer.alloc(rowSize * height);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowSize;
        rawData[rowOffset] = 0; // Filter type 0 (None)

        for (let x = 0; x < width; x++) {
            const pixelOffset = rowOffset + 1 + x * 4;
            const [r, g, b, a] = drawFn(x, y, width, height);
            rawData[pixelOffset] = r;
            rawData[pixelOffset + 1] = g;
            rawData[pixelOffset + 2] = b;
            rawData[pixelOffset + 3] = a;
        }
    }

    const compressed = zlib.deflateSync(rawData);

    // Build PNG chunks
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // Bit depth: 8
    ihdr[9] = 6; // Color type: 6 (RGBA)
    ihdr[10] = 0; // Compression: 0
    ihdr[11] = 0; // Filter: 0
    ihdr[12] = 0; // Interlace: 0

    const ihdrChunk = createChunk('IHDR', ihdr);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC32
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc >>> 0, 8 + len);
    return buf;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

// Dessiner une icône juridique pro : Fond bleu marine (#004B87) avec symbole balance dorée (#FFB900)
function drawLegalIcon(x, y, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 1;
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;

    // Fond rond bleu marine avec léger dégradé
    if (distSq <= r * r) {
        // Bordure blanche subtile
        if (distSq >= (r - 1.5) * (r - 1.5)) {
            return [255, 255, 255, 220];
        }

        // Balance de la justice stylisée
        // Axe central vertical
        const normX = (x - cx) / (w / 2);
        const normY = (y - cy) / (h / 2);

        // Poteau central
        if (Math.abs(normX) < 0.1 && normY > -0.6 && normY < 0.7) {
            return [255, 215, 0, 255]; // Or
        }
        // Barre horizontale
        if (Math.abs(normY + 0.3) < 0.08 && Math.abs(normX) < 0.7) {
            return [255, 215, 0, 255];
        }
        // Plateaux gauche et droite
        const leftPlate = Math.abs(normX + 0.5) < 0.25 && normY > 0.05 && normY < 0.25;
        const rightPlate = Math.abs(normX - 0.5) < 0.25 && normY > 0.05 && normY < 0.25;
        // Fils de suspension
        const leftWire = (normX < -0.25 && normX > -0.65) && Math.abs((normY + 0.3) - (normX + 0.5) * -0.8) < 0.08;
        const rightWire = (normX > 0.25 && normX < 0.65) && Math.abs((normY + 0.3) - (normX - 0.5) * 0.8) < 0.08;

        if (leftPlate || rightPlate || leftWire || rightWire) {
            return [255, 230, 100, 255]; // Or clair
        }

        // Socle
        if (Math.abs(normX) < 0.4 && normY >= 0.6 && normY <= 0.75) {
            return [255, 215, 0, 255];
        }

        // Fond bleu marine élégant
        return [0, 75, 135, 255]; // #004B87
    }

    return [0, 0, 0, 0]; // Transparent
}

[16, 32, 64, 80].forEach((size) => {
    const png = createPng(size, size, drawLegalIcon);
    fs.writeFileSync(path.join(assetsDir, `icon-${size}.png`), png);
    console.log(`✅ Icône générée : assets/icon-${size}.png (${size}x${size}, ${png.length} octets)`);
});
