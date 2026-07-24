// Verse text access. Local translations load the compact id→text map on
// demand (generated from the verified datasets — text is never constructed in
// code) and join range ids from member verses. Licensed translations
// (NLT/NIV/NASB/ESV) fetch through the server proxy — same contract, never
// generated, keys never here.

import { memberVerseIds } from "@/lib/refs";
import type { TranslationCode } from "@/config/game";
import { isApiTranslation } from "@/lib/bible/translations";

const cache = new Map<string, Promise<Record<string, string>>>();
const apiVerseCache = new Map<string, Promise<string>>();

function fetchApiVerse(id: string, translation: TranslationCode): Promise<string> {
  const key = `${translation}:${id}`;
  let p = apiVerseCache.get(key);
  if (!p) {
    p = fetch(`/api/verse?translation=${translation}&ref=${encodeURIComponent(id)}`).then(
      async (r) => {
        if (!r.ok) throw new Error(`Verse fetch failed for ${translation} (${r.status})`);
        const j = (await r.json()) as { text: string };
        return j.text;
      },
    );
    // A failed fetch must not poison the session cache.
    p.catch(() => apiVerseCache.delete(key));
    apiVerseCache.set(key, p);
  }
  return p;
}

function loadMap(translation: TranslationCode): Promise<Record<string, string>> {
  const key = translation.toLowerCase();
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/bible/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`Missing bible data for ${translation}`);
      return r.json() as Promise<Record<string, string>>;
    });
    cache.set(key, p);
  }
  return p;
}

/** Text for a verse or range id in a translation. Ranges join member verses. */
export async function getVerseText(
  id: string,
  translation: TranslationCode,
): Promise<string> {
  if (isApiTranslation(translation)) return fetchApiVerse(id, translation);
  const map = await loadMap(translation);
  const parts = memberVerseIds(id).map((vid) => {
    const t = map[vid];
    if (!t) throw new Error(`Verse ${vid} not found in ${translation}`);
    return t;
  });
  return parts.join(" ");
}

/** Keyword search over a translation's full text. Case-insensitive substring. */
export async function searchVerseText(
  query: string,
  translation: TranslationCode,
  limit = 30,
): Promise<{ id: string; text: string }[]> {
  const map = await loadMap(translation);
  const q = query.toLowerCase();
  const hits: { id: string; text: string }[] = [];
  for (const [id, text] of Object.entries(map)) {
    if (text.toLowerCase().includes(q)) {
      hits.push({ id, text });
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
