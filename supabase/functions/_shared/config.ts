// MIRROR of src/config/game.ts (the client copy) — keep in sync by hand until a
// shared-package build step exists. Server-authoritative math uses THIS copy.
export const GAME = {
  mastery: { FLOOR: 200, PER_WORD: 20 },
  levelThresholds: [0, 0.08, 0.18, 0.32, 0.5, 0.72, 1.0],
  xp: {
    PER_MINIGAME: 4,
    FINISHER_BONUS: 5,
    PERFECT_BONUS: 0.5,
    RESTED_BONUS: 0.25,
    DIMINISHING: [1.0, 0.5, 0.25],
    LOSS_CONSOLATION_PLAYER_XP: 10,
  },
  energy: { MAX: 5, COST_PER_MATCH: 1, REGEN_SECONDS: 5 * 60 * 60 },
  playerHpByLevel: [5, 5, 4, 4, 3, 2, 2],
  minigamesByLevel: [4, 4, 5, 5, 6, 6, 7],
  split: { WORDS_PER_CHUNK: 15, MAX_CHUNKS: 4, TOLERANCE: 0.2, SOFT_CAP_TOTAL_MINIGAMES: 10 },
  coins: { PER_WIN: 10, PER_LOSS: 2 },
  boss: { UNLOCK_MIN_LEVEL: 3, MINIGAMES: 6, PLAYER_HP: 3 },
  player: {
    LEVEL_CAP: 30,
    xpForLevel(level: number): number {
      if (level <= 1) return 0;
      return Math.round((100 * Math.pow(level - 1, 1.6)) / 10) * 10;
    },
    VERSE_MASTERED_XP: 500,
    BOSS_DEFEAT_XP: 250,
    CAMPAIGN_CLEARED_XP: 1000,
  },
} as const;

// NOTE (parity): the local dev authority (src/data/localApi.ts) also settles
// BOSS matches — 250 XP on defeat, +1000 on first campaign clear, no mastery
// XP, gate re-validated at start. Port that branch into start-match /
// settle-match (matches.is_boss + user_campaigns writes) when provisioning.

export function masteryGoal(wordCount: number): number {
  return GAME.mastery.FLOOR + GAME.mastery.PER_WORD * wordCount;
}

export function levelFromXp(verseXp: number, goal: number): number {
  for (let l = 7; l >= 1; l--) {
    if (verseXp >= Math.round(GAME.levelThresholds[l - 1]! * goal)) return l;
  }
  return 1;
}

export function playerLevelFromXp(playerXp: number): number {
  for (let l = GAME.player.LEVEL_CAP; l >= 1; l--) {
    if (playerXp >= GAME.player.xpForLevel(l)) return l;
  }
  return 1;
}

export function diminishingModifier(practiceCountToday: number): number {
  const d = GAME.xp.DIMINISHING;
  return d[Math.min(practiceCountToday, d.length - 1)]!;
}
