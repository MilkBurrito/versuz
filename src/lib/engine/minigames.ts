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
  const decoyCount = GAME.wordBank.DECOYS[round.difficulty - 1]!;
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
    Math.max(
      GAME.fadingWords.FADE_MIN,
      Math.round(n * GAME.fadingWords.FADE_FRACTION[round.difficulty - 1]!),
    ),
  );
  const indexes = shuffle(round.words.map((_, i) => i), rng)
    .slice(0, count)
    .sort((a, b) => a - b);
  return {
    fadedIndexes: indexes,
    bank: shuffle(indexes.map((i) => round.words[i]!.norm), rng),
  };
}

// --- §6.7 Spot the Lie: lift k content words out of position (k by difficulty) ---

export interface SpotTheLieData {
  /** Indexes (into round.words) whose display positions were changed. */
  displaced: number[];
  /** The words as displayed, with the displacement applied. */
  displayed: Word[];
}

export function buildSpotTheLie(
  round: MinigameRound,
  rng: () => number = Math.random,
): SpotTheLieData | null {
  const candidates = round.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => isContentWord(w));
  // Need at least two content words with different norms, or the lie is invisible.
  const distinct = new Set(candidates.map((c) => c.w.norm));
  if (candidates.length < 2 || distinct.size < 2) return null; // caller falls back

  const want = Math.min(
    GAME.spotTheLie.DISPLACED[round.difficulty - 1]!,
    candidates.length,
  );
  const chosen = shuffle(candidates, rng)
    .slice(0, want)
    .map((c) => c.i)
    .sort((a, b) => a - b);

  // Derange the chosen positions: rotate, then verify every one actually moved
  // (equal norms can make a rotation invisible — retry with a shuffle).
  const displayed = [...round.words];
  const originals = chosen.map((i) => round.words[i]!);
  let arrangement = [...originals.slice(1), originals[0]!];
  for (let attempt = 0; attempt < 8; attempt++) {
    const moved = chosen.every((idx, k) => arrangement[k]!.norm !== round.words[idx]!.norm);
    if (moved) break;
    arrangement = shuffle(originals, rng);
  }
  // If no arrangement moves every word (e.g. repeated words), keep the ones
  // that did move and report only those as displaced.
  chosen.forEach((idx, k) => {
    displayed[idx] = arrangement[k]!;
  });
  const displaced = chosen.filter((idx) => displayed[idx]!.norm !== round.words[idx]!.norm);
  if (displaced.length < 2) return null;
  return { displaced, displayed };
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

// --- §6.1 First Letter: which words become input boxes (the rest are spelled
// out as context). At the hardest tier every word is blanked. ---

export interface BlankSelection {
  /** Indexes into round.words that the player must supply. */
  blankIndexes: number[];
}

function pickBlanks(
  round: MinigameRound,
  fraction: number,
  min: number,
  rng: () => number,
): BlankSelection {
  const n = round.words.length;
  const count = Math.max(Math.min(min, n), Math.min(n, Math.round(n * fraction)));
  if (count >= n) return { blankIndexes: round.words.map((_, i) => i) };
  // Prefer content words — blanking "the" teaches nothing.
  const content = round.words.map((w, i) => ({ w, i })).filter(({ w }) => isContentWord(w));
  const filler = round.words.map((w, i) => ({ w, i })).filter(({ w }) => !isContentWord(w));
  const ordered = [...shuffle(content, rng), ...shuffle(filler, rng)];
  return {
    blankIndexes: ordered
      .slice(0, count)
      .map((c) => c.i)
      .sort((a, b) => a - b),
  };
}

export function buildFirstLetter(
  round: MinigameRound,
  rng: () => number = Math.random,
): BlankSelection {
  return pickBlanks(
    round,
    GAME.firstLetter.BLANK_FRACTION[round.difficulty - 1]!,
    GAME.firstLetter.BLANK_MIN,
    rng,
  );
}

// --- NEW §6.9 Letter Reveal: blanks that open on ONE correct letter. The
// gentlest recall game — the verse stays on screen, you supply the initial. ---

export function buildLetterReveal(
  round: MinigameRound,
  rng: () => number = Math.random,
): BlankSelection {
  return pickBlanks(
    round,
    GAME.letterReveal.BLANK_FRACTION[round.difficulty - 1]!,
    GAME.letterReveal.BLANK_MIN,
    rng,
  );
}

// --- NEW §6.10 Phrase Bank: Word Bank whose chips are whole phrases, so the
// word order inside each phrase is handed to you. Easier than Word Bank. ---

export interface PhraseBankData {
  /** Phrases in verse order — the answer. */
  answers: string[];
  /** Shuffled phrase chips (answers + optional decoy). */
  bank: string[];
  /** Word spans backing each answer phrase, for display. */
  spans: Word[][];
}

export function buildPhraseBank(
  round: MinigameRound,
  rng: () => number = Math.random,
): PhraseBankData {
  // Aim for a fixed number of chips; a 40-word verse becomes 4 long phrases at
  // the easy tier rather than 13 short ones.
  const wanted = GAME.phraseBank.PHRASES[round.difficulty - 1]!;
  const target = Math.max(2, Math.ceil(round.words.length / wanted));
  const spans: Word[][] = [];
  let current: Word[] = [];
  for (const w of round.words) {
    current.push(w);
    // Break on clause ends when the phrase is already a reasonable size,
    // otherwise at the target length — phrases stay readable either way.
    if ((w.clauseEnd && current.length >= Math.max(2, target - 1)) || current.length >= target) {
      spans.push(current);
      current = [];
    }
  }
  if (current.length) {
    if (spans.length && current.length === 1) spans[spans.length - 1]!.push(...current);
    else spans.push(current);
  }
  const answers = spans.map((span) => span.map((w) => w.norm).join(" "));

  const decoyCount = GAME.phraseBank.DECOYS[round.difficulty - 1]!;
  const decoys: string[] = [];
  if (decoyCount > 0 && spans.length > 1) {
    // A decoy is a real phrase with its words shuffled — plausible, but wrong.
    const source = spans[Math.floor(rng() * spans.length)]!;
    const scrambled = shuffle(source.map((w) => w.norm), rng).join(" ");
    if (!answers.includes(scrambled)) decoys.push(scrambled);
  }
  return { answers, bank: shuffle([...answers, ...decoys], rng), spans };
}
