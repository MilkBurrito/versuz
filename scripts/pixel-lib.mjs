// Shared helpers for the pixel-art pipeline scripts (gen-placeholder-art,
// normalize-art). Pure JS via pngjs — no native deps.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The master palette (name → #hex) — single source: src/pixel/palette.json. */
export function loadPalette() {
  const p = path.join(__dirname, "..", "src", "pixel", "palette.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** A drawable RGBA pixel buffer. */
export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4); // transparent
  }
  set(x, y, [r, g, b], a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }
  rect(x, y, w, h, rgb, a = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, rgb, a);
  }
  /** 1px-checker dither fill between two colors. */
  dither(x, y, w, h, rgbA, rgbB) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.set(i, j, (i + j) % 2 === 0 ? rgbA : rgbB);
  }
  writeSync(file) {
    const png = new PNG({ width: this.w, height: this.h });
    this.data.copy(png.data);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
  }
}

export function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

export function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

/** Nearest palette color (Euclidean RGB) — the quantize step. */
export function nearestColor(r, g, b, paletteRgb) {
  let best = paletteRgb[0];
  let bestD = Infinity;
  for (const c of paletteRgb) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Nearest-neighbor resize of a pngjs PNG to (w, h). */
export function resizeNearest(png, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const sy = Math.min(png.height - 1, Math.floor((y * png.height) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x * png.width) / w));
      const si = (sy * png.width + sx) * 4;
      const di = (y * w + x) * 4;
      png.data.copy(out.data, di, si, si + 4);
    }
  }
  return out;
}

/** Tiny 3×5 pixel glyphs for placeholder labels (subset, uppercase). */
const GLYPHS = {
  P: ["###", "#.#", "###", "#..", "#.."],
  L: ["#..", "#..", "#..", "#..", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  C: [".##", "#..", "#..", "#..", ".##"],
  E: ["###", "#..", "##.", "#..", "###"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  " ": ["...", "...", "...", "...", "..."],
};

/** Stamp a short label (3×5 font, 1px tracking) onto a Pix buffer. */
export function stampLabel(pix, x, y, text, rgb) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    glyph.forEach((row, j) => {
      [...row].forEach((cell, i) => {
        if (cell === "#") pix.set(cx + i, y + j, rgb);
      });
    });
    cx += 4;
  }
}
