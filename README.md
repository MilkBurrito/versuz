# Versuz v2

Bible-memorization RPG (web-first PWA), built fresh per **spec v1.1 + v1.2
amendments** (`../Versuz-SpecMDs/`). Current state (after revision pass 1):
Home hub with equip grids → Explore (Campaigns / Browse / Search) → pre-match
overlay with gem journey + verse-range picker → full matches with **all 8
minigames** per the §5 level sequences → reference finisher → conditional
post-match sequence → campaign **boss fights** with the all-L3 gate.

## Run it

```
npm install
npm run dev         # http://localhost:3000 — local demo mode, no env needed
```

`npm run gen:bible` regenerates `public/bible/` from the verified datasets
(requires the `data/bible` folder from the parent asset workspace; the
generated maps are committed so clones and Vercel build without it).

## Deploy (Vercel + Supabase)

1. Import this repo into Vercel — zero config, it's a standard Next.js app.
   Without env vars it deploys in **local demo mode** (in-browser save).
2. For **cloud mode** (login from anywhere, progress follows the account):
   follow `supabase/README.md` (create project → run
   `supabase/migrations/0002_player_saves.sql` → set the three
   `NEXT_PUBLIC_*` env vars in Vercel → redeploy).

Seeded demo user ("Alex", mid-journey) loads on first run. **Settings → Reset
demo data** restores the seed. `npm test` runs the engine suite (22 tests,
incl. the spec §9.4 worked example); `npm run typecheck` / `npm run lint`.

## Where things live

| Concern | Path |
|---|---|
| **All tunable constants** (XP, energy, thresholds, split, HP) | `src/config/game.ts` (server mirror: `supabase/functions/_shared/config.ts`) |
| Pure engine (mastery, XP, energy, split, match plan, refs) | `src/lib/engine/`, `src/lib/refs.ts` + `engine.test.ts` |
| Bible data pipeline (reuse from v1.0, + integrity checks) | `scripts/gen-bible.mjs` → `public/bible/*.json` |
| Server-authoritative backend (schema, RLS, edge functions) | `supabase/` — see `supabase/README.md` |
| Local dev authority (same math, localStorage) | `src/data/localApi.ts` behind the `GameApi` seam (`src/data/api.ts`) |
| Design system (nameplate, bars, gems, status bar, buttons) | `src/components/ui/` |
| Screens (hub, overlay, match, post-match) | `src/components/{home,overlay,match}/`, `src/app/` |
| DOM sprite seam (Phaser/Pixi drops in here later) | `src/components/sprites/SpriteAnimator.tsx` |

## Deliberate boundaries (current pass)

- **Still queued:** Profile (mastered/stats/badges), Settings, onboarding +
  tutorial, quests, streak freeze, appearance editing, drag input for Word
  Order, campaign Mastered rewards.
- **Local mode is the default authority.** The Supabase schema + edge functions
  are written but unprovisioned (v1.0 never had a live project — its Supabase
  layer was a stub). Wiring steps: `supabase/README.md`; the boss-settle branch
  still needs porting into settle-match (noted in `_shared/config.ts`).
- **KJV + ASV only.** WEB was never harvested into `../data/bible/`; the
  pipeline picks it up automatically once `data/bible/web/` exists. Verse text
  is never generated — integrity-checked datasets only.
- Placeholder art: Tiny RPG Soldier/Orc sheets from v1.0's `public/sprites`.
- Currency displays as **Gems** (internal field `coins` / schema
  `banked_currency` unchanged).
