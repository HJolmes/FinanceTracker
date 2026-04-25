#!/usr/bin/env node
// Generates public/icon-192.png and public/icon-512.png
// Uses only Node.js built-ins (zlib, fs, path) — no npm packages needed
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function generateIcon(size) {
  const bg = [0x0f, 0x19, 0x23]; // #0f1923 dark navy
  const fg = [0xe8, 0xa8, 0x38]; // #e8a838 amber

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = 1 + size * 3;
  const raw = Buffer.alloc(size * stride);

  // "F" letter layout
  const lx0 = Math.round(size * 0.28);
  const ly0 = Math.round(size * 0.25);
  const lw  = Math.round(size * 0.46);
  const lh  = Math.round(size * 0.50);
  const sw  = Math.max(Math.round(size * 0.09), 3); // stroke width
  const midY = Math.round(lh * 0.46);

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // PNG filter: None
    for (let x = 0; x < size; x++) {
      const lx = x - lx0;
      const ly = y - ly0;
      const isFg =
        (lx >= 0 && lx < sw  && ly >= 0 && ly < lh) ||         // vertical bar
        (ly >= 0 && ly < sw  && lx >= 0 && lx < lw) ||         // top bar
        (ly >= midY && ly < midY + sw && lx >= 0 && lx < Math.round(lw * 0.78)); // mid bar
      const color = isFg ? fg : bg;
      const off = y * stride + 1 + x * 3;
      raw[off] = color[0];
      raw[off + 1] = color[1];
      raw[off + 2] = color[2];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateIcon(512));
console.log('✓ PWA icons generated (icon-192.png, icon-512.png)');
