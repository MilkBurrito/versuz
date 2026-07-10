// §6 Long-verse splitting: expand a splittable minigame into chunk-rounds.
//
//   chunks = clamp(ceil(words / 15), 1, 4)
//   Split points snap to a clause boundary within ±20% of the chunk length
//   around the ideal even split; otherwise split at the exact word count.

import { GAME } from "@/config/game";
import { tokenize, type Word } from "@/lib/engine/text";

export function chunkCount(wordCount: number): number {
  const { WORDS_PER_CHUNK, MAX_CHUNKS } = GAME.split;
  return Math.min(Math.max(Math.ceil(wordCount / WORDS_PER_CHUNK), 1), MAX_CHUNKS);
}

/**
 * Split tokenized words into chunk arrays. Applies the clause-boundary tolerance
 * check independently at each cut (spec: "For 3+ chunks, apply the check
 * independently at each cut").
 */
export function splitWords(words: Word[], chunks: number): Word[][] {
  if (chunks <= 1) return [words];
  const n = words.length;
  const chunkLen = n / chunks;
  const window = GAME.split.TOLERANCE * chunkLen;

  const cuts: number[] = []; // index = first word of the next chunk
  let prevCut = 0;
  for (let c = 1; c < chunks; c++) {
    const ideal = Math.round(c * chunkLen);
    // Search for a clause boundary within ±window of the ideal point, nearest first.
    let best: number | null = null;
    const lo = Math.max(prevCut + 1, Math.ceil(ideal - window));
    const hi = Math.min(n - 1, Math.floor(ideal + window));
    for (let i = lo; i <= hi; i++) {
      // A cut at index i means the previous word (i-1) ends the chunk.
      if (words[i - 1]?.clauseEnd) {
        if (best === null || Math.abs(i - ideal) < Math.abs(best - ideal)) best = i;
      }
    }
    const cut = best ?? Math.min(Math.max(ideal, prevCut + 1), n - 1);
    cuts.push(cut);
    prevCut = cut;
  }

  const out: Word[][] = [];
  let start = 0;
  for (const cut of cuts) {
    out.push(words.slice(start, cut));
    start = cut;
  }
  out.push(words.slice(start));
  return out;
}

export function splitVerseText(text: string): Word[][] {
  const words = tokenize(text);
  return splitWords(words, chunkCount(words.length));
}
