# Versuz pixel foundation (Build Brief Phase 0)

**Status: scaffolding complete, acceptance passed 2026-07-24.**
The live app's art is deliberately untouched (asset guardrail) — everything
here is new, isolated plumbing that the app migrates onto **when Alex delivers
final art**.

## Locked decisions (§0.3)

| Decision | Value |
|---|---|
| Art-pixel unit | 1 source px; art is only ever scaled in-app, by integers |
| Stage internal resolution | **portrait 180 × 320** (hero ≈ 60 px tall ≈ ⅓ stage) |
| App render scale | `floor(min(vw/180, vh/320))`, clamped ≥1 — letterboxed, never fractional |
| UI base unit | `--u = 1 art-px × scale` (spacing scale `--s1..--s8` = ×{1,2,3,4,6,8,12,16}) |
| Icon grid | 16×16 (24×24 hero tier) |
| Pixel font | Press Start 2P, native 8 px, integer multiples only *(flagged: readable for labels; consider a narrower pixel font for long verse text — one-token swap)* |
| Palette | 28-color DRAFT in `src/pixel/palette.json`, named from the Lore glossary families — **pending Alex's lock** |

## What exists

- `src/pixel/tokens.ts` + `tokens.css` + `palette.json` — the single source of
  truth (TS constants, CSS vars, shared palette). Rules are scoped to
  `.vz-pixel-shell` so the current app is unaffected until migration.
- `src/pixel/PixelShell.tsx` — integer-scale letterbox shell (§0.4).
- `src/pixel/PixelStage.tsx` — fixed-internal-resolution canvas (§0.2);
  smoothing off; renderer-agnostic API (Pixi/Phaser can replace internals).
- `scripts/gen-placeholder-art.mjs` (`npm run art:placeholders`) — labeled
  procedural sample art → `public/pixel-samples/`. **Not game art.**
- `scripts/normalize-art.mjs` (`npm run art:normalize`) — the §0.6 gate:
  drop assets in `art-inbox/` named `<name>.stage.png`, `<name>.icon.png`,
  `<name>.icon24.png`, or `<name>.sprite-WxH.png`; the script nearest-neighbor
  downscales integer multiples, quantizes to the master palette, rejects
  anything off-grid (e.g. AI-upscaled), and writes to `art-normalized/`.
- `/style-guide` — the acceptance/regression screen (§0.7): stage bg + sprite
  composited in ONE canvas buffer, tokened panel + button, icon row, pixel
  font line, 2×/3×/4×/auto switcher.

## Acceptance results (2026-07-24)

Measured on `/style-guide` — one art-pixel renders at exactly `scale` CSS px
across all five element classes:

| element | 2× | 3× | 4× |
|---|---|---|---|
| stage canvas (180×320) | 360×640 | 540×960 | 720×1280 |
| 16 px icon | 32 | 48 | 64 |
| 24 px sigil | 48 | 72 | 96 |
| pixel font (8 px native) | 16 | 24 | 32 |

## Deferred until final art arrives (per the guardrail)

1. Migrating the live app into `PixelShell` (and moving the scoped CSS rules
   global).
2. Re-cutting/normalizing existing assets. Documented mismatch to resolve
   then: the TrainingDummy is 48×48 and the Practice Environments are
   1456×816 — ~4.5× density gap vs. the 180×320 stage. Most likely path:
   treat the stage as low-res and bring **both** down to stage scale through
   `art-inbox/`. One scale only.
3. Authoring the real lore icon set (Sword, Everflame, Great Tree, scroll,
   ember, seed, anvil, sigil, Hollow mark) on the 16×16 grid.
4. Palette lock by Alex (then re-run `art:normalize` over everything).
