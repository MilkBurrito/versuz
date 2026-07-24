// Server proxy for licensed translations (Build Brief Phase 2).
//
// GET /api/verse?translation=NLT&ref=JHN.3.16   (or a range id like PHP.4.6-7)
// → { text, translation, ref }
//
// Keys live ONLY in server env: BIBLE_API_KEY (api.bible: NLT/NIV/NASB) and
// ESV_API_KEY (Crossway). Both upstreams are called with clean-text params so
// the memorization engine receives plain verse text (headings, footnotes and
// verse numbers omitted — permitted; words never altered).
//
// Caching honors each license:
//  · api.bible responses are immutable → long CDN cache + in-memory LRU.
//  · ESV: Crossway's terms — never more than 500 verses stored locally, and
//    5,000/day · 1,000/hour · 60/min rate caps → a ≤500-entry rolling LRU,
//    a conservative token bucket, and NO persistent/CDN caching.

import { NextRequest, NextResponse } from "next/server";
import { displayRef, memberVerseIds, parseRef } from "@/lib/refs";
import { API_BIBLE_IDS, isApiTranslation } from "@/lib/bible/translations";
import type { TranslationCode } from "@/config/game";

export const runtime = "nodejs";

// --- small LRU (per lambda instance) ---------------------------------------
class Lru {
  private map = new Map<string, string>();
  constructor(private readonly max: number) {}
  get(k: string): string | undefined {
    const v = this.map.get(k);
    if (v !== undefined) {
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }
  set(k: string, v: string) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value!;
      this.map.delete(oldest);
    }
  }
}

const apiBibleCache = new Lru(2000);
// ESV: the 500 cap is on VERSES, and one entry may hold a multi-verse range —
// cap entries well below it so the verse count stays inside the license.
const esvCache = new Lru(120);

// --- ESV token bucket: stay comfortably under 60/min ------------------------
let esvTokens = 40;
let esvRefill = Date.now();
function esvAllowed(): boolean {
  const now = Date.now();
  esvTokens = Math.min(40, esvTokens + ((now - esvRefill) / 60000) * 40);
  esvRefill = now;
  if (esvTokens < 1) return false;
  esvTokens -= 1;
  return true;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const translation = req.nextUrl.searchParams.get("translation") as TranslationCode | null;
  const ref = req.nextUrl.searchParams.get("ref");
  if (!translation || !ref || !isApiTranslation(translation)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    parseRef(ref); // validates shape; throws on garbage
  } catch {
    return NextResponse.json({ error: "bad_ref" }, { status: 400 });
  }

  try {
    if (translation === "ESV") {
      const key = process.env.ESV_API_KEY;
      if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
      const cacheKey = `esv:${ref}`;
      let text = esvCache.get(cacheKey);
      if (!text) {
        if (!esvAllowed()) return NextResponse.json({ error: "throttled" }, { status: 429 });
        const q = encodeURIComponent(displayRef(ref)); // "Philippians 4:6-7"
        const params =
          "include-passage-references=false&include-verse-numbers=false&include-first-verse-numbers=false&include-footnotes=false&include-headings=false&include-short-copyright=false&include-audio-link=false";
        const r = await fetch(`https://api.esv.org/v3/passage/text/?q=${q}&${params}`, {
          headers: { Authorization: `Token ${key}` },
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`esv ${r.status}`);
        const j = (await r.json()) as { passages?: string[] };
        const passage = j.passages?.[0];
        if (!passage) return NextResponse.json({ error: "not_found" }, { status: 404 });
        text = clean(passage);
        esvCache.set(cacheKey, text);
      }
      // Rolling cache only — never let CDN/browser accumulate the corpus.
      return NextResponse.json(
        { text, translation, ref },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // --- api.bible: NLT / NIV / NASB ---
    const key = process.env.BIBLE_API_KEY;
    if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    const bibleId = API_BIBLE_IDS[translation];
    const cacheKey = `${bibleId}:${ref}`;
    let text = apiBibleCache.get(cacheKey);
    if (!text) {
      // Our range ids ("PHP.4.6-7") → api.bible passage ids ("PHP.4.6-PHP.4.7")
      const members = memberVerseIds(ref);
      const passageId =
        members.length === 1 ? members[0]! : `${members[0]}-${members[members.length - 1]}`;
      const params =
        "content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false";
      const r = await fetch(
        `https://rest.api.bible/v1/bibles/${bibleId}/passages/${passageId}?${params}`,
        {
          headers: { "api-key": key },
          // Immutable text: let Next's data cache keep it across invocations.
          cache: "force-cache",
        },
      );
      if (!r.ok) throw new Error(`api.bible ${r.status}`);
      const j = (await r.json()) as { data?: { content?: string } };
      const content = j.data?.content;
      if (!content) return NextResponse.json({ error: "not_found" }, { status: 404 });
      text = clean(content);
      apiBibleCache.set(cacheKey, text);
    }
    return NextResponse.json(
      { text, translation, ref },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("verse proxy failed", err);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
