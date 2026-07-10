// USFM reference identifiers: "JHN.3.16" (single verse) or "ISA.43.18-19" (range).
// The canonical verse id format across the whole app + schema (spec §7, §15).

import { BOOKS, type BibleBook } from "@/lib/bible/books.generated";

export interface VerseRef {
  book: string; // USFM 3-letter code
  chapter: number;
  verseStart: number;
  verseEnd: number | null; // set for ranges
}

const BY_CODE = new Map<string, BibleBook>(BOOKS.map((b) => [b.code, b]));

const REF_RE = /^([A-Z0-9]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/;

export function parseRef(id: string): VerseRef {
  const m = REF_RE.exec(id);
  if (!m) throw new Error(`Invalid verse id: ${id}`);
  const [, book, chapter, start, end] = m;
  const ref: VerseRef = {
    book: book!,
    chapter: Number(chapter),
    verseStart: Number(start),
    verseEnd: end ? Number(end) : null,
  };
  if (ref.verseEnd !== null && ref.verseEnd <= ref.verseStart)
    throw new Error(`Invalid range in verse id: ${id}`);
  return ref;
}

export function formatRefId(ref: VerseRef): string {
  const base = `${ref.book}.${ref.chapter}.${ref.verseStart}`;
  return ref.verseEnd !== null ? `${base}-${ref.verseEnd}` : base;
}

// Citation-convention names where the catalog name differs ("Psalms" → "Psalm 23:1").
const CITATION_NAMES: Record<string, string> = { PSA: "Psalm" };

export function bookDisplayName(code: string): string {
  return CITATION_NAMES[code] ?? BY_CODE.get(code)?.name ?? code;
}

/** "JHN.3.16" → "John 3:16"; "ISA.43.18-19" → "Isaiah 43:18-19". */
export function displayRef(id: string): string {
  const ref = parseRef(id);
  const range = ref.verseEnd !== null ? `-${ref.verseEnd}` : "";
  return `${bookDisplayName(ref.book)} ${ref.chapter}:${ref.verseStart}${range}`;
}

/** Ids of the individual verses inside an id (a range expands; a single is itself). */
export function memberVerseIds(id: string): string[] {
  const ref = parseRef(id);
  const end = ref.verseEnd ?? ref.verseStart;
  const ids: string[] = [];
  for (let v = ref.verseStart; v <= end; v++) ids.push(`${ref.book}.${ref.chapter}.${v}`);
  return ids;
}

export function versesInChapter(bookCode: string, chapter: number): number {
  const book = BY_CODE.get(bookCode);
  return book?.versesPerChapter[chapter - 1] ?? 0;
}

/** Canonical id for a contiguous in-chapter selection (start === end → single). */
export function buildRangeId(
  book: string,
  chapter: number,
  start: number,
  end: number,
): string {
  if (start > end) [start, end] = [end, start];
  const max = versesInChapter(book, chapter);
  if (start < 1 || end > max)
    throw new Error(`Range ${start}-${end} outside ${book} ${chapter} (1-${max})`);
  return formatRefId({ book, chapter, verseStart: start, verseEnd: end > start ? end : null });
}

/**
 * Contiguous neighbors a tile can extend into (§7): the verse immediately before
 * verseStart and immediately after verseEnd, within the same chapter (v1 keeps
 * ranges chapter-local; cross-chapter passages are out of scope).
 */
export function adjacentVerseIds(id: string): { before: string | null; after: string | null } {
  const ref = parseRef(id);
  const end = ref.verseEnd ?? ref.verseStart;
  const before =
    ref.verseStart > 1 ? `${ref.book}.${ref.chapter}.${ref.verseStart - 1}` : null;
  const after =
    end < versesInChapter(ref.book, ref.chapter)
      ? `${ref.book}.${ref.chapter}.${end + 1}`
      : null;
  return { before, after };
}

/** The range id that results from extending `id` with a contiguous neighbor. */
export function extendedRefId(id: string, neighborId: string): string {
  const ref = parseRef(id);
  const n = parseRef(neighborId);
  if (n.book !== ref.book || n.chapter !== ref.chapter || n.verseEnd !== null)
    throw new Error(`Not a contiguous neighbor: ${neighborId} of ${id}`);
  const start = ref.verseStart;
  const end = ref.verseEnd ?? ref.verseStart;
  if (n.verseStart === start - 1)
    return formatRefId({ ...ref, verseStart: n.verseStart, verseEnd: end });
  if (n.verseStart === end + 1) return formatRefId({ ...ref, verseEnd: n.verseStart });
  throw new Error(`Not a contiguous neighbor: ${neighborId} of ${id}`);
}

/**
 * Lenient match for the typed reference finisher: accepts "John 3:16",
 * "john 3.16", "Jn 3v16"-style separators, and range forms "Isaiah 43:18-19".
 */
export function referenceAnswerMatches(id: string, answer: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.:v]/g, " ")
      .replace(/\s*-\s*/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  return norm(displayRef(id).replace(":", " ")) === norm(answer);
}
