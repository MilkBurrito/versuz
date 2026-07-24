// Generates CLEARLY-LABELED PLACEHOLDER art for the pixel style-guide screen
// (Build Brief §0.7). These are procedural samples authored at native source
// resolution, quantized to the draft palette — they exist only to prove the
// scaling system and are NOT game art. Real assets come from Alex via the
// /art-inbox normalize pipeline.
//
// Usage: node scripts/gen-placeholder-art.mjs
// Output: public/pixel-samples/*.png

import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pix, hexToRgb, loadPalette, stampLabel } from "./pixel-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "pixel-samples");

const P = Object.fromEntries(
  Object.entries(loadPalette()).map(([k, v]) => [k, hexToRgb(v)]),
);

// --- Stage background: 180×320 portrait — night sky over a Great Tree ------
{
  const W = 180;
  const H = 320;
  const bg = new Pix(W, H);
  // sky bands (drained night, per Axiom III darkness never vivid)
  bg.rect(0, 0, W, 90, P["darkness-void"]);
  bg.dither(0, 90, W, 30, P["darkness-void"], P["darkness-deep"]);
  bg.rect(0, 120, W, 60, P["darkness-deep"]);
  bg.dither(0, 180, W, 24, P["darkness-deep"], P["darkness"]);
  // stars
  const seeded = (n) => {
    let s = n;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  };
  const rnd = seeded(7);
  for (let i = 0; i < 60; i++) {
    bg.set(Math.floor(rnd() * W), Math.floor(rnd() * 150), P["parchment-deep"]);
  }
  // moon
  bg.rect(138, 26, 14, 14, P["parchment"]);
  bg.rect(140, 24, 10, 18, P["parchment"]);
  bg.rect(136, 28, 18, 10, P["parchment"]);
  bg.rect(141, 29, 5, 5, P["parchment-deep"]);
  // far hills
  bg.rect(0, 204, W, 26, P["darkness"]);
  for (let x = 0; x < W; x += 6) bg.rect(x, 198 + ((x / 6) % 3) * 2, 6, 8, P["darkness"]);
  // ground
  bg.rect(0, 230, W, 90, P["great-tree-deep"]);
  bg.dither(0, 230, W, 4, P["darkness"], P["great-tree-deep"]);
  for (let i = 0; i < 90; i++) {
    bg.set(Math.floor(rnd() * W), 240 + Math.floor(rnd() * 76), P["great-tree"]);
  }
  // the Great Tree (left)
  bg.rect(28, 150, 10, 84, P["great-tree-bark"]);
  bg.rect(24, 224, 18, 10, P["great-tree-bark"]);
  bg.rect(6, 118, 56, 34, P["great-tree-deep"]);
  bg.rect(12, 104, 42, 20, P["great-tree"]);
  bg.rect(20, 96, 26, 12, P["great-tree-light"]);
  bg.dither(6, 146, 56, 8, P["great-tree-deep"], P["darkness-deep"]);
  // PLACEHOLDER stamp — twice, loud
  bg.rect(38, 275, 104, 11, P["darkness-void"]);
  stampLabel(bg, 41, 278, "PLACEHOLDER", P["forge-hot"]);
  stampLabel(bg, 3, 3, "SAMPLE", P["forge-hot"]);
  bg.writeSync(path.join(OUT, "stage-bg.png"));
}

// --- Guard sprite: 40×60 (~1/3 stage width, on-grid) ------------------------
{
  const spr = new Pix(40, 60);
  // head + helm
  spr.rect(14, 2, 12, 10, P["temple-stone-light"]);
  spr.rect(14, 2, 12, 4, P["temple-stone"]);
  spr.rect(16, 7, 3, 2, P["darkness-void"]); // visor slit
  spr.rect(21, 7, 3, 2, P["darkness-void"]);
  spr.rect(12, 11, 16, 2, P["temple-stone-deep"]);
  // torso — everflame tabard over iron
  spr.rect(11, 13, 18, 18, P["forge-iron"]);
  spr.rect(15, 13, 10, 18, P["everflame"]);
  spr.rect(17, 15, 6, 6, P["everflame-deep"]); // sigil block
  // arms
  spr.rect(7, 14, 4, 12, P["forge-iron-deep"]);
  spr.rect(29, 14, 4, 12, P["forge-iron-deep"]);
  // legs
  spr.rect(13, 31, 6, 16, P["forge-iron-deep"]);
  spr.rect(21, 31, 6, 16, P["forge-iron-deep"]);
  spr.rect(12, 47, 8, 4, P["temple-stone-dark"]);
  spr.rect(20, 47, 8, 4, P["temple-stone-dark"]);
  // the living Sword — held high right, faint glow
  spr.rect(33, 4, 3, 26, P["parchment-light"]);
  spr.rect(34, 2, 1, 2, P["everflame-core"]);
  spr.rect(31, 28, 7, 3, P["everflame-deep"]); // crossguard
  spr.rect(33, 31, 3, 5, P["great-tree-bark"]); // grip
  spr.set(32, 8, P["everflame-core"]);
  spr.set(37, 14, P["everflame-core"]);
  // label
  stampLabel(spr, 1, 54, "SAMPLE", P["forge-hot"]);
  spr.writeSync(path.join(OUT, "sprite-guard.png"));
}

// --- Icons: 16×16 on the icon grid -----------------------------------------
function icon(name, drawFn) {
  const ic = new Pix(16, 16);
  drawFn(ic);
  ic.writeSync(path.join(OUT, `icon-${name}.png`));
}

icon("sword", (ic) => {
  for (let i = 0; i < 9; i++) ic.rect(11 - i, 2 + i, 2, 1, P["parchment-light"]);
  ic.set(12, 2, P["everflame-core"]);
  ic.rect(3, 10, 4, 1, P["everflame-deep"]);
  ic.rect(5, 12, 1, 1, P["everflame-deep"]);
  ic.rect(2, 12, 2, 2, P["great-tree-bark"]);
});

icon("everflame", (ic) => {
  ic.rect(6, 3, 4, 2, P["forge-hot"]);
  ic.rect(5, 5, 6, 3, P["forge-ember"]);
  ic.rect(4, 8, 8, 3, P["everflame"]);
  ic.rect(5, 11, 6, 2, P["everflame-deep"]);
  ic.rect(7, 5, 2, 5, P["everflame-core"]);
  ic.rect(3, 13, 10, 1, P["great-tree-bark"]);
});

icon("great-tree", (ic) => {
  ic.rect(7, 9, 2, 5, P["great-tree-bark"]);
  ic.rect(4, 3, 8, 6, P["great-tree"]);
  ic.rect(5, 2, 6, 2, P["great-tree-light"]);
  ic.rect(3, 5, 10, 3, P["great-tree-deep"]);
  ic.rect(5, 14, 6, 1, P["great-tree-deep"]);
});

icon("scroll", (ic) => {
  ic.rect(4, 2, 8, 12, P["parchment"]);
  ic.rect(3, 2, 2, 3, P["parchment-deep"]);
  ic.rect(11, 11, 2, 3, P["parchment-deep"]);
  ic.rect(6, 5, 5, 1, P["parchment-ink-soft"]);
  ic.rect(6, 7, 5, 1, P["parchment-ink-soft"]);
  ic.rect(6, 9, 4, 1, P["parchment-ink-soft"]);
});

// --- Hero-tier icon: 24×24 Guard sigil (shield) -----------------------------
{
  const ic = new Pix(24, 24);
  ic.rect(5, 3, 14, 12, P["temple-stone"]);
  ic.rect(6, 15, 12, 3, P["temple-stone"]);
  ic.rect(8, 18, 8, 2, P["temple-stone"]);
  ic.rect(10, 20, 4, 2, P["temple-stone-deep"]);
  ic.rect(5, 3, 14, 2, P["temple-stone-light"]);
  ic.rect(11, 5, 2, 13, P["everflame"]); // the Sword upright
  ic.rect(9, 8, 6, 2, P["everflame-deep"]);
  ic.writeSync(path.join(OUT, "icon-hero-sigil.png"));
}

console.log("Placeholder samples written to public/pixel-samples/ (labeled, non-final).");
