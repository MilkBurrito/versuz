// The normalize gate (Build Brief §0.6): no asset — especially AI-touched
// art — enters the repo without passing through here. It enforces the grid:
//
//   1. nearest-neighbor resize DOWN to declared native resolution,
//   2. quantize every opaque pixel to the master palette (palette.json),
//   3. assert final dimensions are on-grid for the asset class.
//
// Usage:
//   node scripts/normalize-art.mjs                # process everything in art-inbox/
//   node scripts/normalize-art.mjs --check-only   # report, write nothing
//
// Drop files into art-inbox/ named with their target class + native size:
//   <name>.stage.png          → must end up exactly 180×320
//   <name>.icon.png           → 16×16
//   <name>.icon24.png         → 24×24
//   <name>.sprite-<W>x<H>.png → W×H (declared per asset)
// A file whose source dimensions are an integer multiple of the target is
// downscaled; anything off-multiple fails loudly (AI upscaled off-grid).
// Output lands in art-normalized/ for review before staging into public/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { hexToRgb, loadPalette, nearestColor, readPng, resizeNearest, writePng } from "./pixel-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(__dirname, "..", "art-inbox");
const OUTBOX = path.join(__dirname, "..", "art-normalized");
const CHECK_ONLY = process.argv.includes("--check-only");

const STAGE = { w: 180, h: 320 };

function targetFor(file) {
  const m = file.match(/\.(stage|icon|icon24|sprite-(\d+)x(\d+))\.png$/i);
  if (!m) return null;
  if (m[1] === "stage") return STAGE;
  if (m[1] === "icon") return { w: 16, h: 16 };
  if (m[1] === "icon24") return { w: 24, h: 24 };
  return { w: Number(m[2]), h: Number(m[3]) };
}

const paletteRgb = Object.values(loadPalette()).map(hexToRgb);

if (!fs.existsSync(INBOX)) {
  fs.mkdirSync(INBOX, { recursive: true });
  console.log("Created art-inbox/ — drop assets there (see header for naming).");
  process.exit(0);
}

const files = fs.readdirSync(INBOX).filter((f) => f.toLowerCase().endsWith(".png"));
if (files.length === 0) {
  console.log("art-inbox/ is empty — nothing to normalize.");
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const target = targetFor(file);
  if (!target) {
    console.error(`✗ ${file}: name declares no asset class (\`.stage\`, \`.icon\`, \`.icon24\`, \`.sprite-WxH\`).`);
    failed++;
    continue;
  }
  const src = readPng(path.join(INBOX, file));
  const rx = src.width / target.w;
  const ry = src.height / target.h;
  if (rx !== ry || rx < 1 || !Number.isInteger(rx)) {
    console.error(
      `✗ ${file}: ${src.width}×${src.height} is not an integer multiple of ${target.w}×${target.h} — off-grid (was it AI-upscaled?). Rejected.`,
    );
    failed++;
    continue;
  }
  const resized = rx === 1 ? src : resizeNearest(src, target.w, target.h);
  // quantize opaque pixels to the master palette
  let remapped = 0;
  const out = new PNG({ width: resized.width, height: resized.height });
  resized.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 8) {
      out.data[i + 3] = 0; // clean fully-transparent
      continue;
    }
    const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
    const [nr, ng, nb] = nearestColor(r, g, b, paletteRgb);
    if (nr !== r || ng !== g || nb !== b) remapped++;
    out.data[i] = nr;
    out.data[i + 1] = ng;
    out.data[i + 2] = nb;
    out.data[i + 3] = 255; // pixel art: no partial alpha
  }
  const note = `${src.width}×${src.height} → ${target.w}×${target.h}, ${remapped} px remapped to palette`;
  if (CHECK_ONLY) {
    console.log(`· ${file}: OK (${note})`);
  } else {
    writePng(path.join(OUTBOX, file), out);
    console.log(`✓ ${file}: ${note} → art-normalized/`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} asset(s) rejected — fix at the source, do not hand-scale.`);
  process.exit(1);
}
