# Translation support (Build Brief Phase 2)

Two supply chains behind one client contract (`getVerseText(ref, translation)`;
tiles store the canonical reference, so a user's verses re-render in whichever
translation they pick):

| Translation | Source | Enabled by |
|---|---|---|
| KJV, ASV | committed public-domain datasets (`public/bible/*.json`) | always |
| WEB | same pipeline, pending harvested dataset | `npm run gen:bible` once `data/bible/web/` exists |
| NLT, NIV, NASB | api.bible via `/api/verse` proxy | `BIBLE_API_KEY` env (server-side) |
| ESV | api.esv.org via `/api/verse` proxy | `ESV_API_KEY` env (server-side) |

`GET /api/translations` tells the client which API translations this
deployment can serve; every picker (pre-Stand overlay, add-verse sheet,
Provisions default) extends its list at runtime from that verdict. **No key
ever reaches the client bundle.**

## Proxy behavior (`src/app/api/verse/route.ts`)

- **api.bible** (Bible IDs verified 2026-07-24: NLT `d6e14a625393b4da-01`,
  NIV `78a9f6124f344018-01`, NASB `b8ee27bcd1cae43a-01`): passages endpoint
  with clean-text params (no notes/titles/verse numbers). Responses are
  immutable → Next data cache + in-memory LRU + long CDN cache headers.
- **ESV** (Crossway, terms verified 2026-07-24): text endpoint, headings /
  footnotes / verse numbers / passage refs omitted (permitted; words never
  altered). Constraints honored in code:
  - **≤500 verses stored locally** → 120-entry rolling LRU, `no-store`
    response headers, upstream fetch uncached. Nothing persists.
  - **Rate limits** (5,000/day · 1,000/hour · 60/min) → conservative token
    bucket (40/min) + the LRU. 429 returned when exhausted.
  - **Display**: "(ESV)" marker + esv.org link render in the read view;
    full notice on `/copyright`.

## Attribution

Short notices render under the verse in the pre-Stand read view
(`ATTRIBUTION` in `src/lib/bible/translations.ts`); full notices on
`/copyright` (linked from Provisions). KJV/ASV are public domain.

## ⚠️ The commercial question (open decision #5 — Alex)

Crossway's free ESV API is **non-commercial only** — charging, selling,
ads, or purchase-driving all disqualify it, and Crossway licenses commercial
use to organizations, not solo developers. **If monetization enters the
roadmap, remove `ESV_API_KEY` and drop ESV from scope until a license
exists** (the app degrades gracefully — ESV simply stops being offered; the
ESV application answers doc frames Versuz as non-commercial today).
api.bible's NLT/NIV/NASB terms are separate — re-check them before charging.

## Setup

Local: put the keys in `versuz/.env.local`. Vercel: Project → Settings →
Environment Variables → add `BIBLE_API_KEY` and/or `ESV_API_KEY` (all
environments), redeploy. Without keys the deployment quietly offers only the
local translations.

## Known limits

- Phrase **search** (Settlements → Search) still searches local translations
  only; API translations are fetched per-verse, not corpus-wide. (api.bible
  `/search` could extend this later.)
- The verse-fetch failure path surfaces the Kingdom-voiced error from
  `LORE.errors.verseLoad` wherever `getVerseText` rejects.
