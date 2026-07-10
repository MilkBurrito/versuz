// Verse-text tokenization + normalized comparison. Capitalization and punctuation
// are auto-handled on user input (§6.1); the displayed text keeps them.

export interface Word {
  /** The word as displayed (punctuation attached). */
  display: string;
  /** Normalized for comparison: lowercase, punctuation stripped. */
  norm: string;
  /** True when the display form ends with a clause boundary , ; : . — (§6 splitting). */
  clauseEnd: boolean;
}

const CLAUSE_END_RE = /[,;:.—!?]["'’”)]*$/;

export function tokenize(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((display) => ({
      display,
      norm: normalizeWord(display),
      clauseEnd: CLAUSE_END_RE.test(display),
    }));
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']/g, "");
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}

/** Whole-string comparison for typed input (Rapid Recall etc.). */
export function normalizeText(text: string): string {
  return tokenize(text)
    .map((w) => w.norm)
    .filter(Boolean)
    .join(" ");
}
