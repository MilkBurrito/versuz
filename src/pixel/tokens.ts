// ============================================================================
// PIXEL FOUNDATION TOKENS — the one source of truth for the art grid.
// (Build Brief §0.3/§0.5. CSS mirror: src/pixel/tokens.css — keep in sync.)
//
// Canonical decisions (locked 2026-07-24, per brief recommendations; a change
// here is a deliberate migration, not a tweak):
//   · Art-pixel unit: 1 source px. Art is NEVER scaled in an editor — only in
//     the app, by integer multiples.
//   · Stage: PORTRAIT 180×320 source px. Backgrounds AND sprites for the stage
//     are authored at this native scale (a hero ~1/3 stage height ≈ 60 px).
//   · App scale: integer only — floor(min(vw/baseW, vh/baseH)), letterboxed.
//   · Icons: 16×16 source px (24×24 hero tier).
//   · Pixel font: "Press Start 2P", native 8 px, integer multiples only.
//     (Flagged for Alex: fine for labels; long verse text may want a narrower
//     pixel font — swap is a one-token change.)
//
// The DRAFT master palette below derives from the Lore glossary's families.
// It gates the normalize pipeline (scripts/normalize-art.mjs) — every asset
// is quantized to it. PENDING ALEX'S LOCK before final art is authored.
// ============================================================================

export const PIXEL = {
  /** Battle/world stage internal resolution, in source (art) px. Portrait. */
  STAGE_W: 180,
  STAGE_H: 320,
  /** Icon grids (source px). */
  ICON: 16,
  ICON_HERO: 24,
  /** Pixel font native size (px) — render only at integer multiples. */
  FONT_NATIVE: 8,
  /** Spacing scale, in art-px (multiply by scale for CSS px): s1..s8. */
  SPACES: [1, 2, 3, 4, 6, 8, 12, 16] as const,
  /** Minimum/maximum app render scale. */
  SCALE_MIN: 1,
  SCALE_MAX: 6,
} as const;

/** Integer app scale for a viewport (Build Brief §0.4). Never fractional. */
export function pixelScale(viewportW: number, viewportH: number): number {
  const s = Math.floor(Math.min(viewportW / PIXEL.STAGE_W, viewportH / PIXEL.STAGE_H));
  return Math.max(PIXEL.SCALE_MIN, Math.min(PIXEL.SCALE_MAX, s));
}

// ---------------------------------------------------------------------------
// DRAFT master palette (~28 colors) — named from the Lore glossary families
// (Everflame golds · Great Tree greens · parchment neutrals · temple stone
// greys · Forge ember+iron · Darkness deliberately DRAINED per Axiom III).
// Single source: src/pixel/palette.json — shared with the normalize/gen
// scripts so no asset can ship off-palette. tokens.css mirrors the names.
// ---------------------------------------------------------------------------
import paletteJson from "./palette.json";

export const PALETTE = paletteJson as Record<keyof typeof paletteJson, string>;

export type PaletteName = keyof typeof paletteJson;

/** Palette as flat hex list (normalize pipeline quantizes against this). */
export const PALETTE_HEX: string[] = Object.values(PALETTE);
