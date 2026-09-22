import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer
  const rowSize = width * 4 + 1; // 1 filter byte per scanline
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuf, data]);

  const crc = crc32(payload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([len, payload, crcBuf]);
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
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw brand icon
function iconDraw(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5, cy = 0.5;
  const dist = Math.hypot(nx - cx, ny - cy);

  // Background: Rich Indigo to Cyan gradient
  const rBg = Math.round(30 + 30 * nx);
  const gBg = Math.round(58 + 80 * ny);
  const bBg = Math.round(138 + 90 * nx);

  if (!isMaskable) {
    // Rounded corner card: r = 0.22
    const cornerR = 0.22;
    const dx = Math.max(Math.abs(nx - 0.5) - (0.5 - cornerR), 0);
    const dy = Math.max(Math.abs(ny - 0.5) - (0.5 - cornerR), 0);
    const cornerDist = Math.hypot(dx, dy);
    if (cornerDist > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside
    }
  }

  // Draw modern Project Management glyph:
  // A clean stylized board with checkmark & sync circle
  // Central card area
  const cardScale = isMaskable ? 0.65 : 0.8;
  const cardLeft = 0.5 - cardScale * 0.42;
  const cardRight = 0.5 + cardScale * 0.42;
  const cardTop = 0.5 - cardScale * 0.42;
  const cardBottom = 0.5 + cardScale * 0.42;

  // Let's draw 3 columns or checklist lines
  // Top header bar of card
  if (nx >= cardLeft && nx <= cardRight && ny >= cardTop && ny <= cardTop + 0.12 * cardScale) {
    return [255, 255, 255, 240];
  }

  // Column 1: Backlog/Todo
  const col1Left = cardLeft + 0.05 * cardScale;
  const col1Right = col1Left + 0.22 * cardScale;
  // Column 2: In Progress
  const col2Left = col1Right + 0.06 * cardScale;
  const col2Right = col2Left + 0.22 * cardScale;
  // Column 3: Done
  const col3Left = col2Right + 0.06 * cardScale;
  const col3Right = col3Left + 0.22 * cardScale;

  const rowTop1 = cardTop + 0.18 * cardScale;
  const rowTop2 = rowTop1 + 0.28 * cardScale;
  const rowH = 0.22 * cardScale;

  // Render cards in columns
  if (
    (nx >= col1Left && nx <= col1Right && ny >= rowTop1 && ny <= rowTop1 + rowH) ||
    (nx >= col2Left && nx <= col2Right && ny >= rowTop1 && ny <= rowTop1 + rowH * 1.5) ||
    (nx >= col3Left && nx <= col3Right && ny >= rowTop1 && ny <= rowTop1 + rowH * 0.9) ||
    (nx >= col1Left && nx <= col1Right && ny >= rowTop2 && ny <= rowTop2 + rowH * 0.8)
  ) {
    // Glowing cyan/white task card
    return [240, 246, 255, 230];
  }

  // Floating check badge on lower right
  const badgeCx = 0.68;
  const badgeCy = 0.68;
  const badgeR = 0.18 * cardScale;
  const bDist = Math.hypot(nx - badgeCx, ny - badgeCy);
  if (bDist <= badgeR) {
    // Emerald green badge
    if (bDist > badgeR - 0.02) return [255, 255, 255, 255];
    return [16, 185, 129, 255];
  }

  return [rBg, gBg, bBg, 255];
}

const pubDir = path.resolve('public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

// 1. Generate PNGs
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => iconDraw(x, y, w, h, false)));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => iconDraw(x, y, w, h, false)));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => iconDraw(x, y, w, h, true)));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => iconDraw(x, y, w, h, false)));
fs.writeFileSync(path.join(pubDir, 'favicon.ico'), createPNG(64, 64, (x, y, w, h) => iconDraw(x, y, w, h, false)));

// 2. Generate SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <g filter="url(#shadow)">
    <!-- Board Frame -->
    <rect x="76" y="86" width="360" height="340" rx="20" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.3" stroke-width="4" />
    <!-- Header bar -->
    <rect x="96" y="106" width="320" height="24" rx="8" fill="#ffffff" fill-opacity="0.7" />
    <!-- Col 1 -->
    <rect x="96" y="146" width="94" height="110" rx="12" fill="#ffffff" />
    <rect x="108" y="162" width="70" height="10" rx="4" fill="#6366f1" />
    <rect x="108" y="180" width="50" height="8" rx="4" fill="#cbd5e1" />
    <rect x="96" y="270" width="94" height="80" rx="12" fill="#ffffff" fill-opacity="0.9" />
    <rect x="108" y="286" width="60" height="8" rx="4" fill="#94a3b8" />
    <!-- Col 2 -->
    <rect x="209" y="146" width="94" height="150" rx="12" fill="#ffffff" />
    <rect x="221" y="162" width="70" height="10" rx="4" fill="#06b6d4" />
    <rect x="221" y="180" width="55" height="8" rx="4" fill="#cbd5e1" />
    <rect x="221" y="196" width="65" height="8" rx="4" fill="#e2e8f0" />
    <!-- Col 3 -->
    <rect x="322" y="146" width="94" height="90" rx="12" fill="#ffffff" />
    <rect x="334" y="162" width="70" height="10" rx="4" fill="#10b981" />
    <rect x="334" y="180" width="45" height="8" rx="4" fill="#cbd5e1" />
  </g>
  <!-- Floating Checkmark Badge -->
  <circle cx="360" cy="350" r="54" fill="#10b981" stroke="#ffffff" stroke-width="8" filter="url(#shadow)" />
  <path d="M338 350l14 14 30 -30" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync(path.join(pubDir, 'icon.svg'), svgContent);
console.log('Icons generated successfully!');
