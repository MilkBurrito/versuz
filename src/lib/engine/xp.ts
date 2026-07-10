// §9.4 Match XP: base × (1 + perfect + rested) × diminishing.
// This math runs server-side canonically (edge function / local dev API);
// the client uses it only for the honest "Practice · +XP" preview.

import { GAME } from "@/config/game";

export interface MatchXpInput {
  minigamesCompleted: number;
  finisherReached: boolean;
  perfect: boolean; // zero mistakes (full player HP retained)
  rested: boolean; // tile untouched since at least yesterday
  practiceCountToday: number; // matches already played on this tile today (before this one)
}

export interface MatchXpBreakdown {
  base: number;
  perfectBonus: number;
  restedBonus: number;
  diminishingModifier: number;
  awarded: number;
}

export function diminishingModifier(practiceCountToday: number): number {
  const d = GAME.xp.DIMINISHING;
  return d[Math.min(practiceCountToday, d.length - 1)]!;
}

export function matchXp(input: MatchXpInput): MatchXpBreakdown {
  const base =
    GAME.xp.PER_MINIGAME * input.minigamesCompleted +
    (input.finisherReached ? GAME.xp.FINISHER_BONUS : 0);
  const perfectBonus = input.perfect ? base * GAME.xp.PERFECT_BONUS : 0;
  const restedBonus = input.rested ? base * GAME.xp.RESTED_BONUS : 0;
  const mod = diminishingModifier(input.practiceCountToday);
  const awarded = Math.round((base + perfectBonus + restedBonus) * mod);
  return {
    base,
    perfectBonus: Math.round(perfectBonus),
    restedBonus: Math.round(restedBonus),
    diminishingModifier: mod,
    awarded,
  };
}

/** §9.6: rested = last practiced before today (calendar day), or never practiced. */
export function isRested(lastPracticedDate: string | null, today: string): boolean {
  return lastPracticedDate === null || lastPracticedDate < today;
}
