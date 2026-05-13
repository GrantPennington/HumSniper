import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outputDir = path.resolve("src-tauri/icons");
fs.mkdirSync(outputDir, { recursive: true });

const palette = {
  bgOuter: [8, 11, 20],
  bgInner: [20, 25, 40],
  surfaceTop: [25, 31, 48],
  surfaceBottom: [12, 16, 28],
  frame: [70, 81, 110],
  ring: [62, 77, 112],
  ringGlow: [34, 188, 255],
  pulseA: [81, 219, 255],
  pulseB: [133, 92, 255],
  pulseCore: [225, 245, 255],
  stem: [102, 116, 148],
  dot: [124, 228, 255],
};

const tauriPngSizes = [32, 128, 256, 512];
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icnsMap = new Map([
  [16, "icp4"],
  [32, "icp5"],
  [64, "icp6"],
  [128, "ic07"],
  [256, "ic08"],
  [512, "ic09"],
]);
const windowsLogoSizes = new Map([
  ["Square30x30Logo.png", 30],
  ["Square44x44Logo.png", 44],
  ["Square71x71Logo.png", 71],
  ["Square89x89Logo.png", 89],
  ["Square107x107Logo.png", 107],
  ["Square142x142Logo.png", 142],
  ["Square150x150Logo.png", 150],
  ["StoreLogo.png", 50],
]);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [
    Math.round(mix(a[0], b[0], t)),
    Math.round(mix(a[1], b[1], t)),
    Math.round(mix(a[2], b[2], t)),
  ];
}

function sdRoundedRect(px, py, cx, cy, hw, hh, radius) {
  const dx = Math.abs(px - cx) - hw + radius;
  const dy = Math.abs(py - cy) - hh + radius;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 === 0 ? 0 : clamp(c1 / c2);
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  return Math.hypot(dx, dy);
}

function sdPolyline(px, py, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    best = Math.min(best, sdSegment(px, py, ax, ay, bx, by));
  }
  return best;
}

function addLayer(base, overlay, alpha) {
  const out = [...base];
  const a = clamp(alpha);
  out[0] = base[0] * (1 - a) + overlay[0] * a;
  out[1] = base[1] * (1 - a) + overlay[1] * a;
  out[2] = base[2] * (1 - a) + overlay[2] * a;
  return out;
}

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const aa = Math.max(0.75, size / 256);
  const center = size / 2;
  const surfaceInset = size * 0.085;
  const cardCenterY = center + size * 0.01;
  const cardHalfWidth = size * 0.39;
  const cardHalfHeight = size * 0.39;
  const cardRadius = size * 0.12;
  const ringCenterX = center - size * 0.055;
  const ringCenterY = center + size * 0.005;
  const waveform = [
    [size * 0.24, center + size * 0.02],
    [size * 0.34, center + size * 0.02],
    [size * 0.42, center - size * 0.11],
    [size * 0.49, center + size * 0.15],
    [size * 0.56, center - size * 0.05],
    [size * 0.65, center + size * 0.02],
    [size * 0.76, center + size * 0.02],
  ];
  const stems = [
    [size * 0.32, size * 0.27, size * 0.32, size * 0.73],
    [size * 0.68, size * 0.27, size * 0.68, size * 0.73],
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let color = [0, 0, 0];
      let alpha = 0;

      const surfaceDist = sdRoundedRect(
        px,
        py,
        center,
        cardCenterY,
        cardHalfWidth,
        cardHalfHeight,
        cardRadius,
      );
      const surfaceAlpha = 1 - smoothstep(-aa, aa, surfaceDist);
      if (surfaceAlpha > 0) {
        const nx = (px - center) / size;
        const ny = (py - cardCenterY) / size;
        const radial = clamp(1 - Math.hypot(nx * 1.05, ny * 1.2) * 2.15);
        const vertical = clamp((py - surfaceInset) / (size - surfaceInset * 2));
        const base = mixColor(palette.surfaceTop, palette.surfaceBottom, vertical);
        const lit = addLayer(base, palette.bgInner, radial * 0.55);
        const frameGlow = 1 - smoothstep(0, size * 0.012, Math.abs(surfaceDist + size * 0.006));
        color = addLayer(lit, palette.frame, frameGlow * 0.22);
        alpha = surfaceAlpha;

        const ringRadii = [size * 0.11, size * 0.18, size * 0.25];
        for (const radius of ringRadii) {
          const ringDist = Math.abs(Math.hypot(px - ringCenterX, py - ringCenterY) - radius);
          const ringAlpha = 1 - smoothstep(size * 0.002, size * 0.011, ringDist);
          if (ringAlpha > 0) {
            color = addLayer(color, palette.ring, ringAlpha * 0.16);
          }
        }

        for (const [ax, ay, bx, by] of stems) {
          const stemDist = sdSegment(px, py, ax, ay, bx, by);
          const stemAlpha = 1 - smoothstep(size * 0.012, size * 0.03, stemDist);
          if (stemAlpha > 0) {
            color = addLayer(color, palette.stem, stemAlpha * 0.34);
          }
        }

        const waveDist = sdPolyline(px, py, waveform);
        const waveGlow = 1 - smoothstep(size * 0.01, size * 0.045, waveDist);
        const waveCore = 1 - smoothstep(size * 0.002, size * 0.012, waveDist);
        if (waveGlow > 0) {
          const gradientT = clamp((px - waveform[0][0]) / (waveform[waveform.length - 1][0] - waveform[0][0]));
          const accent = mixColor(palette.pulseA, palette.pulseB, gradientT);
          color = addLayer(color, accent, waveGlow * 0.28);
          color = addLayer(color, palette.pulseCore, waveCore * 0.92);
        }

        const sweepDotDist = Math.hypot(px - size * 0.73, py - size * 0.39);
        const sweepDot = 1 - smoothstep(size * 0.01, size * 0.04, sweepDotDist);
        if (sweepDot > 0) {
          color = addLayer(color, palette.dot, sweepDot * 0.48);
        }

        const outerGlowDist = sdRoundedRect(
          px,
          py,
          center,
          cardCenterY,
          cardHalfWidth + size * 0.01,
          cardHalfHeight + size * 0.01,
          cardRadius + size * 0.01,
        );
        const outerGlow = 1 - smoothstep(size * 0.014, size * 0.06, Math.abs(outerGlowDist));
        if (outerGlow > 0) {
          color = addLayer(color, palette.ringGlow, outerGlow * 0.08);
        }
      }

      const index = (y * size + x) * 4;
      pixels[index] = Math.round(clamp(color[0] / 255) * 255);
      pixels[index + 1] = Math.round(clamp(color[1] / 255) * 255);
      pixels[index + 2] = Math.round(clamp(color[2] / 255) * 255);
      pixels[index + 3] = Math.round(clamp(alpha) * 255);
    }
  }

  return pixels;
}

function createSvgSource() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="surface" x1="128" y1="76" x2="384" y2="436" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1B2235"/>
      <stop offset="1" stop-color="#0D1220"/>
    </linearGradient>
    <linearGradient id="pulse" x1="122" y1="256" x2="390" y2="256" gradientUnits="userSpaceOnUse">
      <stop stop-color="#51DBFF"/>
      <stop offset="1" stop-color="#855CFF"/>
    </linearGradient>
  </defs>
  <rect x="62" y="62" width="388" height="388" rx="68" fill="url(#surface)"/>
  <rect x="62" y="62" width="388" height="388" rx="68" stroke="#46516E" stroke-opacity="0.45" stroke-width="3"/>
  <circle cx="228" cy="258" r="58" stroke="#3E4D70" stroke-opacity="0.26" stroke-width="4"/>
  <circle cx="228" cy="258" r="94" stroke="#3E4D70" stroke-opacity="0.2" stroke-width="4"/>
  <circle cx="228" cy="258" r="130" stroke="#3E4D70" stroke-opacity="0.16" stroke-width="4"/>
  <path d="M164 146V366" stroke="#6A7595" stroke-opacity="0.34" stroke-width="14" stroke-linecap="round"/>
  <path d="M348 146V366" stroke="#6A7595" stroke-opacity="0.34" stroke-width="14" stroke-linecap="round"/>
  <path d="M122 268H174L216 204L248 332L284 230L332 268H390" stroke="url(#pulse)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M122 268H174L216 204L248 332L284 230L332 268H390" stroke="#E8F7FF" stroke-opacity="0.9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="374" cy="198" r="10" fill="#7EE5FF" fill-opacity="0.85"/>
</svg>
`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pngFromPixels(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, y * size * 4, (y + 1) * size * 4);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function writePng(filename, size) {
  const pixels = renderIcon(size);
  const png = pngFromPixels(size, Buffer.from(pixels));
  fs.writeFileSync(path.join(outputDir, filename), png);
  return png;
}

function writeIco(filename) {
  const imageBuffers = icoSizes.map((size) => ({
    size,
    png: pngFromPixels(size, Buffer.from(renderIcon(size))),
  }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(imageBuffers.length, 4);

  const directory = Buffer.alloc(imageBuffers.length * 16);
  let offset = header.length + directory.length;
  imageBuffers.forEach((entry, index) => {
    const base = index * 16;
    directory[base] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 2] = 0;
    directory[base + 3] = 0;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(entry.png.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.png.length;
  });

  const out = Buffer.concat([header, directory, ...imageBuffers.map((entry) => entry.png)]);
  fs.writeFileSync(path.join(outputDir, filename), out);
}

function writeIcns(filename) {
  const entries = [...icnsMap.entries()].map(([size, type]) => {
    const png = pngFromPixels(size, Buffer.from(renderIcon(size)));
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([header, png]);
  });

  const fileHeader = Buffer.alloc(8);
  fileHeader.write("icns", 0, 4, "ascii");
  fileHeader.writeUInt32BE(entries.reduce((sum, entry) => sum + entry.length, 8), 4);
  fs.writeFileSync(path.join(outputDir, filename), Buffer.concat([fileHeader, ...entries]));
}

fs.writeFileSync(path.join(outputDir, "icon.svg"), createSvgSource());

writePng("32x32.png", 32);
writePng("128x128.png", 128);
writePng("128x128@2x.png", 256);
writePng("icon.png", 512);
for (const [filename, size] of windowsLogoSizes.entries()) {
  writePng(filename, size);
}
writeIco("icon.ico");
writeIcns("icon.icns");

console.log(`Generated Tauri icons in ${outputDir}`);
