// §9.5 Energy: 5 max, 1 per match, +1 per ~5h. Computed lazily from
// (storedEnergy, lastUpdated) — no timers needed; the server recomputes on read.

import { GAME } from "@/config/game";

export interface EnergyState {
  current: number;
  lastUpdated: number; // epoch ms
}

/** Energy at time `now`, applying regeneration since lastUpdated. */
export function energyAt(state: EnergyState, now: number): EnergyState {
  const { MAX, REGEN_SECONDS } = GAME.energy;
  if (state.current >= MAX) return { current: MAX, lastUpdated: now };
  const elapsed = Math.max(0, now - state.lastUpdated);
  const gained = Math.floor(elapsed / (REGEN_SECONDS * 1000));
  if (gained === 0) return state;
  const current = Math.min(MAX, state.current + gained);
  // Preserve the fractional remainder unless we hit the cap.
  const lastUpdated =
    current >= MAX ? now : state.lastUpdated + gained * REGEN_SECONDS * 1000;
  return { current, lastUpdated };
}

/** Seconds until the next +1, or null when full. */
export function secondsToNextEnergy(state: EnergyState, now: number): number | null {
  const s = energyAt(state, now);
  if (s.current >= GAME.energy.MAX) return null;
  const nextAt = s.lastUpdated + GAME.energy.REGEN_SECONDS * 1000;
  return Math.max(0, Math.ceil((nextAt - now) / 1000));
}

export function spendEnergy(state: EnergyState, now: number): EnergyState | null {
  const s = energyAt(state, now);
  if (s.current < GAME.energy.COST_PER_MATCH) return null;
  return {
    current: s.current - GAME.energy.COST_PER_MATCH,
    // Start the regen clock at spend time if we were at the cap (no clock running).
    lastUpdated: s.current >= GAME.energy.MAX ? now : s.lastUpdated,
  };
}
