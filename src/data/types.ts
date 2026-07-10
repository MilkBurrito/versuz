// Domain types — mirror supabase/migrations/0001_schema.sql (camelCased).

import type { ThemeTag, TranslationCode } from "@/config/game";

export type EquipSlot = "weapon" | "body" | "necklace" | "feet";

export interface UserState {
  id: string;
  displayName: string;
  /** Selected player-character sprite (see PLAYER_CHARACTERS). */
  characterSprite: string;
  characterGender: "man" | "woman";
  characterSkinTone: string;
  characterHair: string;
  equipped: Record<EquipSlot, string | null>;
  defaultTranslation: TranslationCode;
  dailyGoal: 1 | 2 | 3;
  streakVisuals: boolean;
  playerXp: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null; // YYYY-MM-DD
  streakFreezeAvailable: boolean;
  energy: { current: number; lastUpdated: number };
  onboardingCompleted: boolean;
}

export type TileStatus = "active" | "mastered" | "needs_refresh";

export interface Tile {
  id: string;
  verseId: string; // USFM id, may be a range
  translation: TranslationCode;
  verseXp: number;
  masteryGoal: number;
  status: TileStatus;
  tag: ThemeTag;
  addedFromCampaignId: string | null;
  masteryDate: string | null;
  lastPracticedDate: string | null; // YYYY-MM-DD
  practiceTodayCount: number;
  practiceCount: number;
}

export interface CampaignDef {
  id: string;
  name: string;
  theme: ThemeTag;
  description: string;
  verseIds: string[];
  bossName: string;
  requiredPlayerLevel: number;
  displayOrder: number;
}

export interface UserCampaign {
  campaignId: string;
  status: "not_started" | "in_progress" | "cleared" | "mastered";
  allVersesAtL3: boolean;
  bossDefeated: boolean;
}

export interface MatchReport {
  matchId: string;
  result: "win" | "loss" | "abandon";
  minigamesCompleted: number;
  mistakes: number;
  finisherCorrect: boolean | null;
}

export interface XpBreakdownResult {
  base: number;
  perfectBonus: number;
  restedBonus: number;
  diminishingModifier: number;
  awarded: number;
}

export interface SettleResult {
  xp: XpBreakdownResult;
  playerXpDelta: number;
  /** Null for boss matches (no single tile earns mastery XP, §9.9). */
  tile: { id: string; verseXp: number; masteryGoal: number; level: number; mastered: boolean } | null;
  player: { xp: number; level: number; leveledUp: boolean };
  streak: { count: number; firstMatchToday: boolean };
  coins: number;
  /** Set when the match was a campaign boss fight. */
  campaign: { campaignId: string; bossDefeated: boolean; cleared: boolean } | null;
}

export interface StartMatchResult {
  matchId: string;
  energy: number;
  practiceCountToday: number;
  rested: boolean;
}
