// Verse text access. Loads the compact id→text map per translation on demand
// (generated from the verified datasets — text is never constructed in code),
// and joins range ids from their member verses.

import { memberVerseIds } from "@/lib/refs";
import type { TranslationCode } from "@/config/game";

const cache = new Map<string, Promise<Record<string, string>>>();

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
