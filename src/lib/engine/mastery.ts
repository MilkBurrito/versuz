// §9.2–§9.3 Mastery XP goal + level derivation. Levels are DERIVED from
// cumulative mastery XP — never stored authoritatively, never decreased.

import { GAME, type VerseLevel } from "@/config/game";

export function masteryGoal(wordCount: number): number {
  return GAME.mastery.FLOOR + GAME.mastery.PER_WORD * wordCount;
}

/** Cumulative XP required to reach `level` for a tile with this goal. */
export function xpThresholdForLevel(level: VerseLevel, goal: number): number {
  return Math.round(GAME.levelThresholds[level - 1]! * goal);
}

export function levelFromXp(verseXp: number, goal: number): VerseLevel {
  let level: VerseLevel = 1;
  for (let l = 7 as VerseLevel; l >= 1; l--) {
    if (verseXp >= xpThresholdForLevel(l as VerseLevel, goal)) {
      level = l as VerseLevel;
      break;
    }
  }
  return level;
}

export function isMastered(verseXp: number, goal: number): boolean {
  return verseXp >= goal;
}

/** Progress within the current level, for the mastery meter (0..1). */
export function levelProgress(verseXp: number, goal: number): number {
  const level = levelFromXp(verseXp, goal);
  if (level >= 7) return 1;
  const cur = xpThresholdForLevel(level, goal);
  const next = xpThresholdForLevel((level + 1) as VerseLevel, goal);
  return next === cur ? 1 : Math.min(1, (verseXp - cur) / (next - cur));
}

/**
 * §9.7 decay: a mastered tile untouched for 30+ days "asks for attention" —
 * badge dims gold → bronze. No progress is lost; one refresh match restores gold.
 */
export function needsRefresh(
  status: string,
  lastPracticedDate: string | null,
  todayStr: string,
): boolean {
  if (status !== "mastered" || lastPracticedDate === null) return false;
  const last = new Date(`${lastPracticedDate}T00:00:00`).getTime();
  const today = new Date(`${todayStr}T00:00:00`).getTime();
  return (today - last) / 86400000 >= GAME.decay.NEEDS_REFRESH_DAYS;
}

/**
 * §7 extend-tile level reset: new_level = clamp(level − 2, 1, 3), then re-base
 * cumulative XP to the start-of-level threshold computed against the NEW goal.
 */
export function extendReset(currentLevel: VerseLevel, newGoal: number): {
  level: VerseLevel;
  verseXp: number;
} {
  const level = Math.min(Math.max(currentLevel - 2, 1), 3) as VerseLevel;
  return { level, verseXp: xpThresholdForLevel(level, newGoal) };
}
