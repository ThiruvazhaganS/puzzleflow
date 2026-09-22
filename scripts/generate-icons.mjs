import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const inCircle = dist <= r;
      const inDiamond = Math.abs(dx) / (size * 0.18) + Math.abs(dy) / (size * 0.22) <= 1;

      if (inCircle && !inDiamond) {
        rgba[i] = 212; rgba[i + 1] = 168; rgba[i + 2] = 83; rgba[i + 3] = 255;
      } else if (inDiamond) {
        rgba[i] = 6; rgba[i + 1] = 8; rgba[i + 2] = 15; rgba[i + 3] = 255;
      } else {
        rgba[i] = 6; rgba[i + 1] = 8; rgba[i + 2] = 15; rgba[i + 3] = 255;
      }
    }
  }

  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    rgba.copy(raw, offset, y * size * 4, (y + 1) * size * 4);
    offset += size * 4;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(join(outDir, `icon${size}.png`), png);
}

for (const size of [16, 48, 128]) createIcon(size);
console.log('Icons generated in', outDir);
