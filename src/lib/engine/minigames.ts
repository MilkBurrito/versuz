// §6 minigame content generators — pure, seedable, unit-tested. Each takes the
// planned round (words + full-verse words for distractor pools) and returns the
// data its UI component renders. No verse text is ever constructed here — only
// rearranged/hidden.

import { GAME } from "@/config/game";
import type { MinigameRound } from "@/lib/engine/match";
import { normalizeWord, tokenize, type Word } from "@/lib/engine/text";

const FALLBACK_DECOYS = [
  "lord", "god", "heart", "world", "word", "faith", "peace", "light",
  "spirit", "grace", "truth", "love", "life", "soul", "mercy", "glory",
];

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function shuffle<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function isContentWord(w: Word): boolean {
  return w.norm.length > 2 && !GAME.spotTheLie.STOPLIST.includes(w.norm);
}

// --- §6.4 Verse Builder (Word Bank): blanks + bank with 2–3 decoys ---

export interface WordBankData {
  answers: Word[];
  bank: { word: string; isDecoy: boolean }[];
}

export function buildWordBank(
  round: MinigameRound,
  rng: () => number = Math.random,
): WordBankData {
  const answers = round.words;
  const verseWords = tokenize(round.verseText);
  const inChunk = new Set(answers.map((w) => w.norm));
  const outside = unique(
    verseWords.filter((w) => !inChunk.has(w.norm) && w.norm.length > 2).map((w) => w.norm),
  );
  const decoyCount =
    GAME.wordBank.DECOYS_MIN +
    Math.floor(rng() * (GAME.wordBank.DECOYS_MAX - GAME.wordBank.DECOYS_MIN + 1));
  const pool =
    outside.length >= decoyCount
      ? outside
      : unique([...outside, ...FALLBACK_DECOYS.filter((w) => !inChunk.has(w))]);
  const decoys = shuffle(pool, rng).slice(0, decoyCount);
  const bank = shuffle(
    [
      ...answers.map((w) => ({ word: w.norm, isDecoy: false })),
      ...decoys.map((word) => ({ word, isDecoy: true })),
    ],
    rng,
  );
  return { answers, bank };
}

// --- §6.2 Word Order: all the round's words scrambled, no decoys ---

export interface WordOrderData {
  answers: Word[];
  bank: string[]; // scrambled norms; duplicates appear as often as they occur
}

export function buildWordOrder(
  round: MinigameRound,
  rng: () => number = Math.random,
): WordOrderData {
  let bank = shuffle(round.words.map((w) => w.norm), rng);
  // Ensure it doesn't come out already solved (tiny chunks).
  if (bank.join(" ") === round.words.map((w) => w.norm).join(" ") && bank.length > 1) {
    bank = [...bank.slice(1), bank[0]!];
  }
  return { answers: round.words, bank };
}

// --- §6.3 Mystery Word: one hidden content word, 4 options ---

export interface MysteryWordData {
  hiddenIndex: number; // index into round.words
  options: string[]; // norms, one correct
}

export function buildMysteryWord(
  round: MinigameRound,
  rng: () => number = Math.random,
): MysteryWordData {
  const candidates = round.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => isContentWord(w));
  const pick = candidates.length
    ? candidates[Math.floor(rng() * candidates.length)]!
    : { w: round.words[0]!, i: 0 };
  const verseWords = tokenize(round.verseText);
  const distractorPool = unique(
    verseWords
      .filter((w) => isContentWord(w) && w.norm !== pick.w.norm)
      .map((w) => w.norm),
  );
  const filled = unique([
    ...distractorPool,
    ...FALLBACK_DECOYS.filter((w) => w !== pick.w.norm),
  ]);
  const distractors = shuffle(filled, rng).slice(0, GAME.finisherChoices - 1);
  return {
    hiddenIndex: pick.i,
    options: shuffle([pick.w.norm, ...distractors], rng),
  };
}

// --- §6.5 Fading Words: a share of the round's words fade; restore from bank ---

export interface FadingWordsData {
  fadedIndexes: number[]; // indexes into round.words, ascending
  bank: string[]; // the faded norms, shuffled
}

export function buildFadingWords(
  round: MinigameRound,
  rng: () => number = Math.random,
): FadingWordsData {
  const n = round.words.length;
  const count = Math.min(
    n,
    Math.max(GAME.fadingWords.FADE_MIN, Math.round(n * GAME.fadingWords.FADE_FRACTION)),
  );
  const indexes = shuffle(round.words.map((_, i) => i), rng)
    .slice(0, count)
    .sort((a, b) => a - b);
  return {
    fadedIndexes: indexes,
    bank: shuffle(indexes.map((i) => round.words[i]!.norm), rng),
  };
}

// --- §6.7 Spot the Lie (MVP zero-data tier): swap two content words ---

export interface SpotTheLieData {
  /** Indexes (into round.words) whose display positions were swapped. */
  swapped: [number, number];
  /** The words as displayed, with the swap applied. */
  displayed: Word[];
}

export function buildSpotTheLie(
  round: MinigameRound,
  rng: () => number = Math.random,
): SpotTheLieData | null {
  const candidates = round.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => isContentWord(w));
  // Need two content words with different norms, or the lie is invisible.
  const pairs: [number, number][] = [];
  for (let a = 0; a < candidates.length; a++) {
    for (let b = a + 1; b < candidates.length; b++) {
      if (candidates[a]!.w.norm !== candidates[b]!.w.norm)
        pairs.push([candidates[a]!.i, candidates[b]!.i]);
    }
  }
  if (pairs.length === 0) return null; // caller falls back to another minigame
  const [i, j] = pairs[Math.floor(rng() * pairs.length)]!;
  const displayed = [...round.words];
  [displayed[i], displayed[j]] = [displayed[j]!, displayed[i]!];
  return { swapped: [i, j], displayed };
}

// --- §6.8 Snowball: clause segments, cumulative rounds ---

export function buildSnowballSegments(words: Word[]): Word[][] {
  const { MAX_SEGMENTS, MIN_SEGMENT_WORDS } = GAME.snowball;
  const segments: Word[][] = [];
  let current: Word[] = [];
  for (const w of words) {
    current.push(w);
    if (w.clauseEnd && current.length >= MIN_SEGMENT_WORDS) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length) {
    if (segments.length && current.length < MIN_SEGMENT_WORDS) {
      segments[segments.length - 1] = [...segments[segments.length - 1]!, ...current];
    } else {
      segments.push(current);
    }
  }
  // Merge from the end until within the cap.
  while (segments.length > MAX_SEGMENTS) {
    const last = segments.pop()!;
    segments[segments.length - 1] = [...segments[segments.length - 1]!, ...last];
  }
  return segments;
}

// --- §6.6 Rapid Recall: whole-verse typed match with minor-typo tolerance ---

export function rapidRecallMatches(expected: Word[], typed: string): boolean {
  const typedWords = typed
    .split(/\s+/)
    .map((w) => normalizeWord(w))
    .filter(Boolean);
  if (typedWords.length !== expected.length) return false;
  return expected.every((w, i) => {
    const t = typedWords[i]!;
    if (t === w.norm) return true;
    return w.norm.length >= GAME.rapidRecall.TYPO_MIN_WORD_LEN && editDistanceAtMost1(t, w.norm);
  });
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  // One substitution
  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return diff === 1;
  }
  // One insertion/deletion
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let si = 0;
  let li = 0;
  let used = false;
  while (si < short.length && li < long.length) {
    if (short[si] === long[li]) {
      si++;
      li++;
    } else {
      if (used) return false;
      used = true;
      li++;
    }
  }
  return true;
}
