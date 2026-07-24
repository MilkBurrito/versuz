// ============================================================================
// VERSUZ GAME CONFIG — every tunable constant lives here (spec v1.1 §9, §5, §6
// + v1.2 amendments; Appendix E lists which of these are expected to be tuned).
// Server-authoritative copies: supabase/functions/_shared/config.ts mirrors this
// file — keep them in sync (see supabase/README.md).
// ============================================================================

export const GAME = {
  // --- §9.2 Mastery XP goal per verse: goal = FLOOR + PER_WORD × wordCount ---
  mastery: {
    FLOOR: 200,
    PER_WORD: 20,
  },

  // --- §9.3 Level thresholds as fraction of the mastery goal (L1..L7) ---
  // L1 starts at 0; crossing each threshold reaches that level; 1.0 = mastered.
  levelThresholds: [0, 0.08, 0.18, 0.32, 0.5, 0.72, 1.0] as const,

  // --- §9.4 Match XP ---
  xp: {
    PER_MINIGAME: 4,
    FINISHER_BONUS: 5,
    PERFECT_BONUS: 0.5, // +50% of base when zero mistakes
    RESTED_BONUS: 0.25, // +25% of base when tile untouched since yesterday
    // Diminishing per-tile-per-day: 1st match 100%, 2nd 50%, 3rd+ 25%.
    DIMINISHING: [1.0, 0.5, 0.25] as const,
    LOSS_CONSOLATION_PLAYER_XP: 10, // player XP only, no mastery XP on a loss
  },

  // --- §9.5 Energy ---
  energy: {
    MAX: 5,
    COST_PER_MATCH: 1, // flat, regardless of minigame count
    REGEN_SECONDS: 5 * 60 * 60, // +1 per ~5h → full refill in ~24h
  },

  // --- In-match hints: reveal the next correct answer, for an energy point ---
  hints: {
    ENERGY_COST: 1,
  },

  // --- §5 Player HP (mistakes allowed) by verse level 1..7 ---
  playerHpByLevel: [5, 5, 4, 4, 3, 2, 2] as const,

  // --- §5 Memorization minigame count by verse level 1..7 (finisher extra) ---
  minigamesByLevel: [4, 4, 5, 5, 6, 6, 7] as const,

  // --- §5 Recommended minigame sequences per level (tunable; "mixed" slots
  // follow the spec's difficulty notes). L7 is random mixed, built at plan time. ---
  sequencesByLevel: [
    ["word_bank", "first_letter", "word_bank", "first_letter"], // L1 Verse Builder → First Letter → mixed
    ["first_letter", "word_order", "word_bank", "first_letter"], // L2 First Letter → Word Order → mixed
    ["first_letter", "word_order", "mystery_word", "spot_the_lie", "word_bank"], // L3 adds Mystery/Spot the Lie
    ["first_letter", "fading_words", "word_order", "mystery_word", "spot_the_lie"], // L4 adds Fading Words
    ["snowball", "first_letter", "fading_words", "mystery_word", "spot_the_lie", "rapid_recall"], // L5 adds Snowball/Rapid Recall
    ["snowball", "fading_words", "first_letter", "spot_the_lie", "mystery_word", "rapid_recall"], // L6 mixed, harder
    [], // L7: random mixed, Rapid Recall guaranteed last (see match.ts)
  ] as const,

  // --- §6 per-minigame knobs ---
  fadingWords: {
    FADE_FRACTION: 0.35, // share of the round's words that fade
    FADE_MIN: 2,
  },
  spotTheLie: {
    // MVP zero-data tier: one position-swap of two content words (= 2 altered
    // words, within the spec's 1–3 cap). Morphology/synonym tiers are v-next.
    STOPLIST: [
      "the", "of", "a", "an", "and", "or", "but", "in", "on", "at", "to",
      "for", "by", "so", "that", "his", "her", "him", "he", "she", "it",
      "is", "was", "be", "not", "with", "unto", "shall", "ye", "thou",
    ] as readonly string[],
  },
  snowball: {
    MAX_SEGMENTS: 5, // clause rounds per snowball (merge small clauses up to this)
    MIN_SEGMENT_WORDS: 3,
  },
  rapidRecall: {
    // Per-word typo tolerance: words this long may be off by 1 edit.
    TYPO_MIN_WORD_LEN: 5,
  },

  // Enemy count by verse level 1..7 (presentational split of total enemy HP).
  enemiesByLevel: [1, 1, 1, 2, 2, 3, 3] as const,

  // --- §5 Finisher: multiple-choice at L1-3, typed at L4-7 ---
  finisherTypedFromLevel: 4,
  finisherChoices: 4,

  // --- §6 Long-verse splitting ---
  split: {
    WORDS_PER_CHUNK: 15, // chunks = clamp(ceil(words / 15), 1, MAX_CHUNKS)
    MAX_CHUNKS: 4,
    TOLERANCE: 0.2, // clause-boundary snap window: ±20% of chunk length
    SOFT_CAP_TOTAL_MINIGAMES: 10, // per match, prevents marathon matches
  },

  // --- §6.4 Word Bank ---
  wordBank: {
    DECOYS_MIN: 2,
    DECOYS_MAX: 3,
  },

  // --- §9.6 Soft spacing ---
  // A tile is "rested" when last practiced before today (calendar day).
  // (Both diminishing + rested key off calendar days, not rolling 24h.)

  // --- §9.7 Decay ---
  decay: {
    NEEDS_REFRESH_DAYS: 30,
  },

  // --- §9.8 / §9.9 Player level + XP sources ---
  player: {
    LEVEL_CAP: 30,
    // Cumulative XP required to REACH each level (index = level - 1).
    // Roughly exponential, doubling every ~5 levels (tunable curve, §9.8):
    // xpToReach(n) = 100 × (n − 1)^1.6 rounded to 10 — cheap early, steep late.
    xpForLevel(level: number): number {
      if (level <= 1) return 0;
      return Math.round((100 * Math.pow(level - 1, 1.6)) / 10) * 10;
    },
    BOSS_DEFEAT_XP: 250,
    DAILY_QUEST_XP: 25,
    WEEKLY_QUEST_XP: 200,
    VERSE_MASTERED_XP: 500, // one-time
    CAMPAIGN_CLEARED_XP: 1000,
    CAMPAIGN_MASTERED_XP: 2500,
  },

  // --- §10-A Coins (visible, not spendable in v1). Amounts not pinned by the
  // spec's tables; starting values, flagged for tuning. ---
  coins: {
    PER_WIN: 10,
    PER_LOSS: 2,
    DAILY_QUEST: 15,
    WEEKLY_QUEST: 100,
  },

  // --- §8 Boss gate + boss match ---
  boss: {
    UNLOCK_MIN_LEVEL: 3, // every campaign verse at L3+
    MINIGAMES: 6, // §8: "typically 5–7" — verses drawn randomly across the campaign
    PLAYER_HP: 3, // boss-tier mistakes budget (tunable)
  },

  // --- §9-A Gem journey: which levels carry a reward-chest node.
  // Honest chests only: L7 always (mastery badge). Others tunable once
  // per-level cosmetic milestones exist. ---
  gemJourney: {
    CHEST_LEVELS: [7] as const,
  },

  // --- Streak (§11) ---
  streak: {
    FREEZES_PER_WEEK: 1,
  },
} as const;

export type VerseLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Local (committed, public-domain) + API-served (licensed, proxied through
// /api/verse — enabled per deployment by server env keys; see
// src/lib/bible/translations.ts).
export const TRANSLATIONS = ["KJV", "ASV", "WEB", "NLT", "NIV", "NASB", "ESV"] as const;
export type TranslationCode = (typeof TRANSLATIONS)[number];

export const THEME_TAGS = [
  "anxiety",
  "identity",
  "temptation",
  "wisdom",
  "strength",
  "doubt",
  "default",
] as const;
export type ThemeTag = (typeof THEME_TAGS)[number];
