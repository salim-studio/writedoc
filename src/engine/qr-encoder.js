/**
 * Self-contained QR Code Matrix generator (Byte Mode, Error Correction Level L/M).
 * Generates an SVG string or a Canvas data URL / Blob for insertion into documents.
 */

// Reed-Solomon Galois Field 256 for QR Codes
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d; // GF(2^8) with polynomial x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateRemainder(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const remainder = new Array(ecCount).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        remainder[j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return remainder;
}

// QR Code version capacity table for Byte Mode (Level M)
// Version 1: 21x21 (14 bytes data, 10 EC), Version 2: 25x25 (26 bytes data, 16 EC),
// Version 3: 29x29 (42 bytes data, 26 EC), Version 4: 33x33 (62 bytes data, 36 EC),
// Version 5: 37x37 (84 bytes data, 48 EC), Version 6: 41x41 (106 bytes data, 64 EC)
const QR_VERSIONS = [
  { version: 1, size: 21, dataBytes: 14, ecBytes: 10, align: [] },
  { version: 2, size: 25, dataBytes: 26, ecBytes: 16, align: [6, 18] },
  { version: 3, size: 29, dataBytes: 42, ecBytes: 26, align: [6, 22] },
  { version: 4, size: 33, dataBytes: 62, ecBytes: 36, align: [6, 26] },
  { version: 5, size: 37, dataBytes: 84, ecBytes: 48, align: [6, 30] },
  { version: 6, size: 41, dataBytes: 106, ecBytes: 64, align: [6, 34] },
];

function selectVersion(byteCount) {
  for (const v of QR_VERSIONS) {
    // 4 bits mode indicator + 8 bits character count indicator = 1.5 bytes overhead
    if (byteCount + 2 <= v.dataBytes) return v;
  }
  return QR_VERSIONS[QR_VERSIONS.length - 1];
}

export function generateQrMatrix(text) {
  const utf8Bytes = new TextEncoder().encode(text);
  const cfg = selectVersion(utf8Bytes.length);
  const { size, dataBytes, ecBytes, align } = cfg;

  // Encode Bitstream: Byte mode (0100) + Char count (8 bits) + Data + Terminator
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode
  const lengthToEncode = Math.min(utf8Bytes.length, dataBytes - 2);
  pushBits(lengthToEncode, 8);
  for (let i = 0; i < lengthToEncode; i++) {
    pushBits(utf8Bytes[i], 8);
  }
  // Terminator
  pushBits(0, Math.min(4, dataBytes * 8 - bits.length));
  // Byte alignment
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) byteVal = (byteVal << 1) | bits[i + j];
    dataCodewords.push(byteVal);
  }

  // Error correction codewords
  const ecCodewords = rsCalculateRemainder(dataCodewords, ecBytes);
  const allCodewords = [...dataCodewords, ...ecCodewords];

  // Initialize Matrix: null = unassigned, 1 = black, 0 = white
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val, isReserved = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (isReserved) reserved[r][c] = true;
    }
  }

  // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
  const drawFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r, nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          setModule(nr, nc, 0);
        } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          setModule(nr, nc, 1);
        } else {
          setModule(nr, nc, 0);
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns if applicable
  if (align.length > 0) {
    const coords = align;
    for (const r of coords) {
      for (const c of coords) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isCenter ? 1 : 0);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0;
    if (!reserved[6][i]) setModule(6, i, v);
    if (!reserved[i][6]) setModule(i, 6, v);
  }

  // Dark module
  setModule(size - 8, 8, 1);

  // Format info area reservation
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // 4. Place Data & EC bits in zigzag
  const allBits = [];
  for (const b of allCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = [];
    if (upwards) {
      for (let r = size - 1; r >= 0; r--) rows.push(r);
    } else {
      for (let r = 0; r < size; r++) rows.push(r);
    }
    upwards = !upwards;

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!reserved[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? bit ^ 1 : bit;
        }
      }
    }
  }

  // 5. Draw Format Information (Mask 0, Level M: 0b101010000010010)
  const formatInfo = 0b101010000010010;
  for (let i = 0; i < 15; i++) {
    const bit = (formatInfo >> (14 - i)) & 1;
    // Top-left
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split across bottom-left & top-right
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

export function generateQrSvg(text, { size = 260, margin = 4, foreground = '#1b365d', background = '#ffffff' } = {}) {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const totalModules = matrixSize + margin * 2;
  const moduleSize = (size / totalModules).toFixed(3);

  let paths = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        paths += `M${x.toFixed(2)} ${y.toFixed(2)}h${moduleSize}v${moduleSize}h-${moduleSize}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${background}" rx="8"/>
    <path d="${paths}" fill="${foreground}"/>
  </svg>`;
}

export async function generateQrPngBlob(text, options = {}) {
  const svg = generateQrSvg(text, options);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = options.size || 260;
    canvas.height = options.size || 260;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create QR code PNG'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
