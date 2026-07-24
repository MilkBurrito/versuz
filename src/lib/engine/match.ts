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
  | "snowball";

export const SPLITTABLE: ReadonlySet<MinigameType> = new Set([
  "word_bank",
  "first_letter",
  "word_order",
  "fading_words",
]);

const ALL_TYPES: readonly MinigameType[] = [
  "word_bank",
  "first_letter",
  "word_order",
  "mystery_word",
  "fading_words",
  "rapid_recall",
  "spot_the_lie",
  "snowball",
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
  const pool = ALL_TYPES.filter((t) => t !== "rapid_recall");
  const picks: MinigameType[] = [];
  for (let i = 0; i < count - 1; i++) picks.push(pool[Math.floor(rng() * pool.length)]!);
  picks.push("rapid_recall"); // the whole-verse capstone closes the mastery match
  return picks;
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
): MinigameRound[] {
  if (!SPLITTABLE.has(type) || chunks.length <= 1) {
    return [
      {
        type,
        verseId,
        verseText,
        words: chunks.flat(),
        chunk: null,
        contextWords: [],
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

  const rounds: MinigameRound[] = [];
  for (const type of sequence) {
    rounds.push(...chunkRounds(type, verseId, verseText, chunks));
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
 * Training Ground plan: the same LENGTH as a real match at this level, but
 * built only from the minigames the player picked (cycled in order, so every
 * chosen game shows up). Splittable games still expand into chunk rounds, and
 * the same soft cap applies — so a session runs about as long as a real match.
 * No enemy/player HP semantics are used by the drill; they're filled for shape.
 */
export function buildTrainingPlan(
  verseId: string,
  verseText: string,
  level: VerseLevel,
  chosen: readonly MinigameType[],
): MatchPlan {
  const pool = chosen.length > 0 ? chosen : ALL_TYPES;
  const count = minigameCountForLevel(level);
  const chunks = splitVerseText(verseText);

  const rounds: MinigameRound[] = [];
  for (let i = 0; i < count; i++) {
    rounds.push(...chunkRounds(pool[i % pool.length]!, verseId, verseText, chunks));
    if (rounds.length >= GAME.split.SOFT_CAP_TOTAL_MINIGAMES) break;
  }
  const capped = rounds.slice(0, GAME.split.SOFT_CAP_TOTAL_MINIGAMES);

  return {
    isBoss: false,
    verseLevel: level,
    rounds: capped,
    enemyHp: capped.length,
    enemies: [capped.length],
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
    const type = ALL_TYPES[Math.floor(rng() * ALL_TYPES.length)]!;
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
      });
    } else {
      rounds.push({
        type,
        verseId: verse.verseId,
        verseText: verse.verseText,
        words: tokenize(verse.verseText),
        chunk: null,
        contextWords: [],
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
