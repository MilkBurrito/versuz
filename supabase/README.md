# Versuz Supabase backend

Two stages live in this folder:

- **v0 LAUNCH (live now)** — `migrations/0002_player_saves.sql`. One table of
  per-user cloud saves (the whole game document as jsonb, RLS-owned). Email +
  password auth. The game engine runs client-side (same math as always) and
  syncs the save last-write-wins. This is what the Vercel site uses.
- **HARDENING TARGET (queued)** — `migrations/0001_schema.sql` + `functions/`
  (start-match / settle-match Edge Functions): the full relational schema with
  server-authoritative scoring per spec §15. When this lands, a migration fans
  each `player_saves.doc` out into the relational tables. Running 0001 now is
  harmless (the v0 app doesn't touch those tables).

## Go-live checklist (v0)

1. **Create the project** at [supabase.com](https://supabase.com) (free tier fine).
2. **Run the migration**: Dashboard → SQL Editor → paste
   `migrations/0002_player_saves.sql` → Run.
3. **Auth settings**: Authentication → Providers → Email is on by default.
   - Recommended for launch: Authentication → Providers → Email → turn OFF
     "Confirm email" for frictionless signups (turn back on later), OR keep it
     on — the app shows a "check your email" notice and Supabase's default
     confirmation email works out of the box.
   - Authentication → URL Configuration → set Site URL to your Vercel domain
     (e.g. `https://versuz.vercel.app`).
4. **Get the keys**: Project Settings → API → copy the Project URL and the
   `anon` public key.
5. **Vercel env vars** (Project → Settings → Environment Variables):
   ```
   NEXT_PUBLIC_DATA_BACKEND=supabase
   NEXT_PUBLIC_SUPABASE_URL=<project url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
   Redeploy. Without these three, the deployed app runs in local demo mode.

## v0 trust model (be aware)

The anon key is safe to expose (that's its design; RLS is the guard — each
player can only read/write their own save). However, in v0 the scoring math
(XP, energy, streaks) runs in the client, so a technical user could edit their
own save. Nobody can touch anyone else's data. Moving scoring into the Edge
Functions (already drafted in `functions/`) closes this and is the next
backend pass.

## Later: relational stage

- Apply `migrations/0001_schema.sql`, import the verified Bible datasets
  (`data/bible/{kjv,asv}/*.csv`) into `verses`/`verse_translations`, deploy
  `functions/start-match` + `functions/settle-match` (port the boss/mastery
  branches from `src/data/localApi.ts` — see the note in
  `functions/_shared/config.ts`), then migrate saves.
- Keep `functions/_shared/config.ts` in sync with `src/config/game.ts`.
