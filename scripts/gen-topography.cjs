const fs = require("fs");
const path = require("path");

const width = 1200;
const height = 1200;
const seed = 1337;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(seed);
const randRange = (min, max) => min + (max - min) * rand();
const randInt = (min, max) => Math.floor(randRange(min, max + 1));

function noise(angle, phase, amp) {
  return (
    Math.sin(angle * 3 + phase) * amp +
    Math.sin(angle * 7 + phase * 1.7) * amp * 0.6 +
    Math.sin(angle * 11 + phase * 2.3) * amp * 0.35
  );
}

function ringPath(cx, cy, r, phase) {
  const points = 72;
  let d = "";
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const n = noise(a, phase, r * 0.06);
    const rr = r + n;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    d += `${i === 0 ? "M" : " L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} Z`;
}

function ridgePath(yBase, amp, phase) {
  const segments = 28;
  let d = "";
  for (let i = 0; i <= segments; i += 1) {
    const x = (i / segments) * width;
    const y =
      yBase +
      Math.sin(x * 0.01 + phase) * amp +
      Math.sin(x * 0.02 + phase * 1.3) * (amp * 0.55);
    d += `${i === 0 ? "M" : " L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

const paths = [];

// blob clusters (contour rings)
const blobs = 18;
for (let b = 0; b < blobs; b += 1) {
  const cx = randRange(0, width);
  const cy = randRange(0, height);
  const maxR = randRange(140, 320);
  const rings = randInt(4, 8);
  const gap = randRange(12, 22);

  for (const dx of [-width, 0, width]) {
    for (const dy of [-height, 0, height]) {
      for (let i = 0; i < rings; i += 1) {
        const r = maxR - i * gap;
        const phase = randRange(0, Math.PI * 2);
        paths.push(ringPath(cx + dx, cy + dy, r, phase));
      }
    }
  }
}

// long ridgelines
for (let i = 0; i < 8; i += 1) {
  const yBase = randRange(80, height - 80);
  const amp = randRange(20, 60);
  const phase = randRange(0, Math.PI * 2);
  paths.push(ridgePath(yBase, amp, phase));
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">\n` +
  `  <g stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.2">\n` +
  `    ${paths.map((d) => `<path d="${d}" />`).join("\n    ")}\n` +
  `  </g>\n` +
  `</svg>\n`;

const outPath = path.join(__dirname, "..", "public", "topography.svg");
fs.writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
