import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, rgbaBuffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const stride = width * 4;
  const rawScanlines = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (stride + 1)] = 0;
    rgbaBuffer.copy(rawScanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(rawScanlines)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderFunkyIcon(targetSize) {
  const scale = 2;
  const size = targetSize * scale;
  const buf = Buffer.alloc(size * size * 4);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    const srcA = a / 255;
    const dstA = buf[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      buf[idx] = Math.round((r * srcA + buf[idx] * dstA * (1 - srcA)) / outA);
      buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
      buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
      buf[idx + 3] = Math.round(outA * 255);
    }
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.22;
  const pad = size * 0.04;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx) - (cx - pad - radius);
      const dy = Math.abs(y - cy) - (cy - pad - radius);
      const dist = Math.hypot(Math.max(0, dx), Math.max(0, dy));
      const insideSquircle = dist <= radius;

      if (insideSquircle) {
        const grad = (y / size);
        let r = Math.round(10 + grad * 12);
        let g = Math.round(14 + grad * 14);
        let b = Math.round(28 + grad * 35);
        setPixel(x, y, r, g, b, 255);

        const borderDist = Math.abs(dist - radius);
        if (borderDist < scale * 1.5) {
          setPixel(x, y, 99, 102, 241, 200);
        }
      }
    }
  }

  const w = size * 0.28;
  const h = size * 0.16;

  // Layer 1: Bottom Violet Prism
  const yBot = cy + size * 0.12;
  for (let y = Math.floor(yBot - h); y <= Math.ceil(yBot + h); y++) {
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const nx = Math.abs(x - cx) / w;
      const ny = Math.abs(y - yBot) / h;
      if (nx + ny <= 1.0) {
        setPixel(x, y, 67, 56, 202, 240);
        if (Math.abs(nx + ny - 1.0) < 0.08) setPixel(x, y, 129, 140, 248, 255);
      }
    }
  }

  // Layer 2: Middle Magenta Prism
  const yMid = cy + size * 0.02;
  for (let y = Math.floor(yMid - h); y <= Math.ceil(yMid + h); y++) {
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const nx = Math.abs(x - cx) / w;
      const ny = Math.abs(y - yMid) / h;
      if (nx + ny <= 1.0) {
        setPixel(x, y, 219, 39, 119, 230);
        if (Math.abs(nx + ny - 1.0) < 0.08) setPixel(x, y, 244, 114, 182, 255);
      }
    }
  }

  // Layer 3: Top Neon Cyan Lifted Prism (Dissected)
  const yTop = cy - size * 0.12;
  for (let y = Math.floor(yTop - h); y <= Math.ceil(yTop + h); y++) {
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const nx = Math.abs(x - cx) / w;
      const ny = Math.abs(y - yTop) / h;
      if (nx + ny <= 1.0) {
        setPixel(x, y, 14, 165, 233, 240);
        if (Math.abs(nx + ny - 1.0) < 0.08) setPixel(x, y, 56, 189, 248, 255);
      }
    }
  }

  // Laser slice across layers
  const x1 = cx - size * 0.36;
  const y1 = cy + size * 0.20;
  const x2 = cx + size * 0.36;
  const y2 = cy - size * 0.24;
  const steps = size * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lx = x1 + (x2 - x1) * t;
    const ly = y1 + (y2 - y1) * t;
    for (let ox = -scale; ox <= scale; ox++) {
      for (let oy = -scale; oy <= scale; oy++) {
        const d = Math.hypot(ox, oy);
        if (d <= scale * 1.2) {
          setPixel(Math.round(lx + ox), Math.round(ly + oy), 56, 189, 248, 255);
        }
      }
    }
  }

  // Center spark
  for (let oy = -scale * 2; oy <= scale * 2; oy++) {
    for (let ox = -scale * 2; ox <= scale * 2; ox++) {
      if (Math.hypot(ox, oy) <= scale * 2) {
        setPixel(Math.round(cx + ox), Math.round(cy - size * 0.02 + oy), 255, 255, 255, 255);
      }
    }
  }

  const finalBuf = Buffer.alloc(targetSize * targetSize * 4);
  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      const count = scale * scale;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const idx = ((ty * scale + sy) * size + (tx * scale + sx)) * 4;
          rSum += buf[idx];
          gSum += buf[idx + 1];
          bSum += buf[idx + 2];
          aSum += buf[idx + 3];
        }
      }
      const outIdx = (ty * targetSize + tx) * 4;
      finalBuf[outIdx] = Math.round(rSum / count);
      finalBuf[outIdx + 1] = Math.round(gSum / count);
      finalBuf[outIdx + 2] = Math.round(bSum / count);
      finalBuf[outIdx + 3] = Math.round(aSum / count);
    }
  }

  return createPng(targetSize, targetSize, finalBuf);
}

const dirs = [path.resolve('public/icons'), path.resolve('dist/icons')];
for (const d of dirs) {
  fs.mkdirSync(d, { recursive: true });
}

for (const s of [16, 32, 48, 128]) {
  const png = renderFunkyIcon(s);
  for (const d of dirs) {
    fs.writeFileSync(path.join(d, `icon${s}.png`), png);
  }
  console.log(`Generated icon${s}.png (${png.length} bytes)`);
}
