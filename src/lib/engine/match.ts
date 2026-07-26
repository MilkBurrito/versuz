// §5 + Appendix B: build the match plan — the §5 per-level minigame sequence
// (from config, L7 random-mixed), splittable minigames expanded into chunk
// rounds that carry their prior-part context, enemy/player HP, finisher mode.
// Boss matches (§8) draw rounds randomly across the campaign's verses.

import { GAME, type VerseLevel } from "@/config/game";
import { splitVerseText } from "@/lib/engine/split";
import { tokenize, type Word } from "@/lib/engine/text";

export type MinigameType =
  | "word_bank"
  | "first_letter"
  | "word_order"
  | "mystery_word"
  | "fading_words"
  | "rapid_recall"
  | "spot_the_lie"
  | "snowball"
  | "letter_reveal" // NEW: blanks open on one correct letter
  | "phrase_bank"; // NEW: word bank whose chips are whole phrases

/** 1 easy · 2 standard · 3 hard — how much a game asks at this verse level. */
export type Difficulty = 1 | 2 | 3;

export function difficultyForLevel(level: VerseLevel): Difficulty {
  return GAME.difficultyByLevel[level - 1]! as Difficulty;
}

export const SPLITTABLE: ReadonlySet<MinigameType> = new Set([
  "word_bank",
  "first_letter",
  "word_order",
  "fading_words",
]);

const ALL_TYPES: readonly MinigameType[] = [
  "spot_the_lie",
  "mystery_word",
  "letter_reveal",
  "phrase_bank",
  "word_bank",
  "word_order",
  "fading_words",
  "first_letter",
  "snowball",
  "rapid_recall",
];

/** The mastery-level (L7) pool: only the production-heavy half of the ladder. */
const HARD_POOL: readonly MinigameType[] = [
  "word_bank",
  "word_order",
  "fading_words",
  "first_letter",
  "snowball",
  "spot_the_lie",
];

export interface MinigameRound {
  type: MinigameType;
  /** The verse this round targets (varies across rounds in a boss match). */
  verseId: string;
  /** Full verse text for the round's verse (generators may need all of it). */
  verseText: string;
  /** Target words for this round (whole verse, or one chunk of it). */
  words: Word[];
  /** 1-based chunk position when this round is one part of a split. */
  chunk: { index: number; total: number } | null;
  /** Prior-part words, shown faded above the interaction (rev: never make the
      player remember where the previous part stopped). */
  contextWords: Word[];
  /** How much this round asks — generators read their knobs from it. */
  difficulty: Difficulty;
  /** Seconds on the clock, or null when this round isn't timed. Beating it is
      a bonus; letting it lapse costs nothing (see GAME.timers). */
  timerSeconds: number | null;
}

export interface MatchPlan {
  isBoss: boolean;
  verseLevel: VerseLevel;
  rounds: MinigameRound[];
  enemyHp: number; // = number of memorization rounds (finisher excluded, §5)
  enemies: number[];
  playerHp: number;
  finisher: { mode: "choice" | "typed"; verseId: string };
}

export function playerHpForLevel(level: VerseLevel): number {
  return GAME.playerHpByLevel[level - 1]!;
}

export function minigameCountForLevel(level: VerseLevel): number {
  return GAME.minigamesByLevel[level - 1]!;
}

/** The §5 sequence for a level; L7 is random mixed with Rapid Recall last. */
export function sequenceForLevel(
  level: VerseLevel,
  rng: () => number = Math.random,
): MinigameType[] {
  const preset = GAME.sequencesByLevel[level - 1]!;
  if (preset.length > 0) return [...preset] as MinigameType[];
  const count = minigameCountForLevel(level);
  const pool = HARD_POOL;
  const picks: MinigameType[] = [];
  for (let i = 0; i < count - 1; i++) picks.push(pool[Math.floor(rng() * pool.length)]!);
  picks.push("rapid_recall"); // the whole-verse capstone closes the mastery match
  return picks;
}

/**
 * Should this round carry a clock, and for how long? Eligible game + a seeded
 * roll (never at the easy tier, nearly always in a boss fight). The limit
 * scales with how many words are in play, clamped to stay generous.
 */
export function timerForRound(
  type: MinigameType,
  wordCount: number,
  difficulty: Difficulty,
  isBoss: boolean,
  rng: () => number,
): number | null {
  if (!GAME.timers.ELIGIBLE.includes(type)) return null;
  const chance = isBoss
    ? GAME.timers.BOSS_CHANCE
    : GAME.timers.CHANCE_BY_DIFFICULTY[difficulty - 1]!;
  if (rng() >= chance) return null;
  const typing = type === "rapid_recall";
  const raw =
    (GAME.timers.BASE_SECONDS + GAME.timers.SECONDS_PER_WORD * wordCount) *
    (typing ? GAME.timers.TYPING_MULTIPLIER : 1);
  return Math.round(
    Math.min(GAME.timers.MAX_SECONDS, Math.max(GAME.timers.MIN_SECONDS, raw)),
  );
}

function enemySegments(totalHp: number, level: VerseLevel): number[] {
  const count = Math.min(GAME.enemiesByLevel[level - 1]!, totalHp);
  const base = Math.floor(totalHp / count);
  const extra = totalHp % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function chunkRounds(
  type: MinigameType,
  verseId: string,
  verseText: string,
  chunks: Word[][],
  difficulty: Difficulty,
  rng: () => number,
): MinigameRound[] {
  if (!SPLITTABLE.has(type) || chunks.length <= 1) {
    const words = chunks.flat();
    return [
      {
        type,
        verseId,
        verseText,
        words,
        chunk: null,
        contextWords: [],
        difficulty,
        timerSeconds: timerForRound(type, words.length, difficulty, false, rng),
      },
    ];
  }
  const rounds: MinigameRound[] = [];
  let context: Word[] = [];
  chunks.forEach((words, i) => {
    rounds.push({
      type,
      verseId,
      verseText,
      words,
      chunk: { index: i + 1, total: chunks.length },
      contextWords: context,
      difficulty,
      timerSeconds: timerForRound(type, words.length, difficulty, false, rng),
    });
    context = [...context, ...words];
  });
  return rounds;
}

export function buildMatchPlan(
  verseId: string,
  verseText: string,
  level: VerseLevel,
  rng: () => number = Math.random,
): MatchPlan {
  const sequence = sequenceForLevel(level, rng);
  const chunks = splitVerseText(verseText);
  const difficulty = difficultyForLevel(level);

  const rounds: MinigameRound[] = [];
  for (const type of sequence) {
    rounds.push(...chunkRounds(type, verseId, verseText, chunks, difficulty, rng));
    if (rounds.length >= GAME.split.SOFT_CAP_TOTAL_MINIGAMES) break;
  }
  const capped = rounds.slice(0, GAME.split.SOFT_CAP_TOTAL_MINIGAMES);

  return {
    isBoss: false,
    verseLevel: level,
    rounds: capped,
    enemyHp: capped.length,
    enemies: enemySegments(capped.length, level),
    playerHp: playerHpForLevel(level),
    finisher: {
      mode: level >= GAME.finisherTypedFromLevel ? "typed" : "choice",
      verseId,
    },
  };
}

/**
 * Training Ground plan: EVERY game the player picked, exactly once, in ladder
 * order (easiest first) — picking ten games means playing ten, not a sample.
 *
 * `level` is the player's chosen L1–L7 difficulty, not the verse's real level:
 * it drives the same knobs a real match uses (how much First Letter blanks,
 * how many words Spot the Lie displaces, decoy counts, fade share…), so the
 * whole ladder is available for any verse.
 *
 * Splittable games target ONE chunk (as boss rounds do) rather than expanding
 * into every chunk, which is what keeps "one game = one round" true.
 */
export function buildTrainingPlan(
  verseId: string,
  verseText: string,
  level: VerseLevel,
  chosen: readonly MinigameType[],
  rng: () => number = Math.random,
): MatchPlan {
  const picked = chosen.length > 0 ? chosen : ALL_TYPES;
  // Ladder order, and never the same game twice.
  const order = ALL_TYPES.filter((t) => picked.includes(t));
  const chunks = splitVerseText(verseText);
  const difficulty = difficultyForLevel(level);

  const rounds: MinigameRound[] = order.map((type) => {
    if (SPLITTABLE.has(type) && chunks.length > 1) {
      const idx = Math.floor(rng() * chunks.length);
      return {
        type,
        verseId,
        verseText,
        words: chunks[idx]!,
        chunk: { index: idx + 1, total: chunks.length },
        contextWords: chunks.slice(0, idx).flat(),
        difficulty,
        timerSeconds: timerForRound(type, chunks[idx]!.length, difficulty, false, rng),
      };
    }
    const words = chunks.flat();
    return {
      type,
      verseId,
      verseText,
      words,
      chunk: null,
      contextWords: [],
      difficulty,
      timerSeconds: timerForRound(type, words.length, difficulty, false, rng),
    };
  });

  return {
    isBoss: false,
    verseLevel: level,
    rounds,
    enemyHp: rounds.length,
    enemies: [rounds.length],
    playerHp: playerHpForLevel(level),
    finisher: { mode: "choice", verseId }, // unused: training has no finisher
  };
}

/**
 * Planned round count without needing the verse text — mirrors buildMatchPlan
 * (word count recoverable from the mastery goal). Drives the honest XP preview.
 */
export function plannedRoundCount(level: VerseLevel, wordCount: number): number {
  const chunks = Math.min(
    Math.max(Math.ceil(wordCount / GAME.split.WORDS_PER_CHUNK), 1),
    GAME.split.MAX_CHUNKS,
  );
  const sequence =
    GAME.sequencesByLevel[level - 1]!.length > 0
      ? (GAME.sequencesByLevel[level - 1] as readonly MinigameType[])
      : Array<MinigameType>(minigameCountForLevel(level)).fill("word_bank");
  let n = 0;
  for (const type of sequence) {
    n += SPLITTABLE.has(type) ? chunks : 1;
    if (n >= GAME.split.SOFT_CAP_TOTAL_MINIGAMES) return GAME.split.SOFT_CAP_TOTAL_MINIGAMES;
  }
  return n;
}

/**
 * §8 boss match: rounds drawn randomly across the campaign's verses. Splittable
 * types on long verses target one random chunk (with faded context) so the boss
 * stays a fixed number of rounds; the finisher names one of the fought verses.
 */
export function buildBossPlan(
  verses: { verseId: string; verseText: string }[],
  rng: () => number = Math.random,
): MatchPlan {
  if (verses.length === 0) throw new Error("boss plan needs verses");
  const rounds: MinigameRound[] = [];
  for (let i = 0; i < GAME.boss.MINIGAMES; i++) {
    const verse = verses[Math.floor(rng() * verses.length)]!;
    const type = HARD_POOL[Math.floor(rng() * HARD_POOL.length)]!;
    const chunks = splitVerseText(verse.verseText);
    if (SPLITTABLE.has(type) && chunks.length > 1) {
      const idx = Math.floor(rng() * chunks.length);
      rounds.push({
        type,
        verseId: verse.verseId,
        verseText: verse.verseText,
        words: chunks[idx]!,
        chunk: { index: idx + 1, total: chunks.length },
        contextWords: chunks.slice(0, idx).flat(),
        difficulty: 3, // a Stronghold is the mastery test
        timerSeconds: timerForRound(type, chunks[idx]!.length, 3, true, rng),
      });
    } else {
      const bossWords = tokenize(verse.verseText);
      rounds.push({
        type,
        verseId: verse.verseId,
        verseText: verse.verseText,
        words: bossWords,
        chunk: null,
        contextWords: [],
        difficulty: 3,
        timerSeconds: timerForRound(type, bossWords.length, 3, true, rng),
      });
    }
  }
  const finisherVerse = rounds[Math.floor(rng() * rounds.length)]!.verseId;
  return {
    isBoss: true,
    verseLevel: 7,
    rounds,
    enemyHp: rounds.length,
    enemies: [rounds.length], // one boss, one big bar
    playerHp: GAME.boss.PLAYER_HP,
    finisher: { mode: "choice", verseId: finisherVerse },
  };
}
