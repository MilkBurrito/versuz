// Parse human reference queries ("john 3:16", "1 jn 4", "isaiah 43:18-19")
// into verse/range ids, matching book names by normalized prefix.

import { BOOKS } from "@/lib/bible/books.generated";
import { buildRangeId, versesInChapter } from "@/lib/refs";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Common short forms that prefix-matching alone misses.
const ALIASES: Record<string, string> = {
  ps: "PSA", psalm: "PSA", psalms: "PSA",
  jn: "JHN", john: "JHN",
  "1jn": "1JN", "2jn": "2JN", "3jn": "3JN",
  mt: "MAT", mk: "MRK", lk: "LUK",
  gen: "GEN", ex: "EXO", dt: "DEU",
  prov: "PRO", eccl: "ECC", isa: "ISA", jer: "JER",
  rom: "ROM", "1cor": "1CO", "2cor": "2CO", gal: "GAL", eph: "EPH",
  phil: "PHP", php: "PHP", col: "COL", heb: "HEB", jas: "JAS", james: "JAS",
  "1pet": "1PE", "2pet": "2PE", rev: "REV",
};

function matchBook(raw: string): string | null {
  const q = norm(raw);
  if (!q) return null;
  if (ALIASES[q]) return ALIASES[q];
  const exact = BOOKS.find((b) => norm(b.name) === q || norm(b.code) === q);
  if (exact) return exact.code;
  const prefix = BOOKS.filter((b) => norm(b.name).startsWith(q));
  return prefix.length >= 1 ? prefix[0]!.code : null;
}

export interface RefQueryResult {
  /** Concrete verse/range ids the query resolves to. */
  ids: string[];
}

/**
 * "john 3:16" → [JHN.3.16]; "isaiah 43:18-19" → [ISA.43.18-19];
 * "john 3" → every verse of the chapter. Null when it doesn't read as a reference.
 */
export function parseRefQuery(query: string): RefQueryResult | null {
  const m = /^\s*((?:[123]\s*)?[a-z .]+?)\s*(\d+)\s*(?:[:.,v]\s*(\d+)\s*(?:-\s*(\d+))?)?\s*$/i.exec(
    query,
  );
  if (!m) return null;
  const book = matchBook(m[1]!);
  if (!book) return null;
  const chapter = Number(m[2]);
  const max = versesInChapter(book, chapter);
  if (max === 0) return null;
  if (m[3]) {
    const start = Number(m[3]);
    const end = m[4] ? Number(m[4]) : start;
    if (start < 1 || end > max) return null;
    return { ids: [buildRangeId(book, chapter, start, end)] };
  }
  return { ids: Array.from({ length: max }, (_, i) => `${book}.${chapter}.${i + 1}`) };
}
